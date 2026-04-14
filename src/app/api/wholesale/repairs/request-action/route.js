import { NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { auth } from '@/lib/auth';
import { NotificationService, CHANNELS } from '@/lib/notificationService';

// POST /api/wholesale/repairs/request-action - Batch request pickup or schedule delivery
export async function POST(request) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        if (!['wholesaler', 'admin'].includes(session.user.role)) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        const { repairIDs, action } = await request.json();

        if (!Array.isArray(repairIDs) || repairIDs.length === 0) {
            return NextResponse.json({ error: 'repairIDs array is required' }, { status: 400 });
        }

        if (!['pickup', 'delivery'].includes(action)) {
            return NextResponse.json({ error: 'action must be "pickup" or "delivery"' }, { status: 400 });
        }

        // Pickup requests only allowed Tue/Thu between 1:00pm–4:45pm
        if (action === 'pickup') {
            const now = new Date();
            const day = now.getDay(); // 0=Sun, 2=Tue, 4=Thu
            const hours = now.getHours();
            const minutes = now.getMinutes();
            const totalMinutes = hours * 60 + minutes;
            const windowOpen = 13 * 60;      // 1:00 PM = 780
            const windowClose = 16 * 60 + 45; // 4:45 PM = 1005
            const isPickupDay = day === 2 || day === 4;
            const isPickupTime = totalMinutes >= windowOpen && totalMinutes <= windowClose;

            if (!isPickupDay || !isPickupTime) {
                return NextResponse.json({
                    error: 'Pickup requests are only available on Tuesdays and Thursdays between 1:00 PM and 4:45 PM.'
                }, { status: 422 });
            }
        }

        const dbInstance = await db.connect();
        const now = new Date();

        if (action === 'pickup') {
            // Mark as PICKUP REQUESTED and notify admin
            await dbInstance.collection('repairs').updateMany(
                {
                    repairID: { $in: repairIDs },
                    isWholesale: true,
                    status: 'PENDING PICKUP'
                },
                {
                    $set: {
                        status: 'PICKUP REQUESTED',
                        deliveryMethod: 'pickup',
                        pickupRequestedAt: now,
                        pickupRequestedBy: session.user.id,
                        updatedAt: now
                    }
                }
            );

            // Send notification to admin
            await notifyAdminPickupRequest(
                session.user.name || session.user.email,
                repairIDs.length
            );

            return NextResponse.json({
                success: true,
                message: `Pickup requested for ${repairIDs.length} repair(s). Admin has been notified.`
            });
        }

        // action === 'delivery'
        await dbInstance.collection('repairs').updateMany(
            {
                repairID: { $in: repairIDs },
                isWholesale: true,
                status: 'PENDING PICKUP'
            },
            {
                $set: {
                    deliveryMethod: 'delivery',
                    deliveryScheduledAt: now,
                    updatedAt: now
                }
            }
        );

        return NextResponse.json({
            success: true,
            message: `${repairIDs.length} repair(s) marked for delivery. Drop them off when ready.`
        });

    } catch (error) {
        console.error('POST /api/wholesale/repairs/request-action error:', error);
        return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
    }
}

async function notifyAdminPickupRequest(wholesalerName, repairCount) {
    try {
        const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAILS;
        if (!adminEmail) return;

        await NotificationService.createNotification({
            userId: 'admin',
            type: 'wholesale-pickup-request',
            title: 'Wholesale Pickup Requested',
            message: `${wholesalerName} has ${repairCount} repair(s) ready for pickup.`,
            channels: [CHANNELS.IN_APP, CHANNELS.EMAIL],
            recipientEmail: adminEmail,
            priority: 'high',
            tags: ['wholesale', 'pickup'],
            data: {
                userRole: 'admin',
                relatedType: 'wholesale-repairs',
                wholesalerName,
                repairCount,
                actionUrl: '/dashboard/repairs/pending-wholesale',
                actionLabel: 'View Pending Repairs'
            }
        });
    } catch (error) {
        console.error('Failed to send pickup notification:', error);
        // Don't fail the API if notification fails
    }
}
