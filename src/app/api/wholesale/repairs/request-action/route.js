import { NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { auth } from '@/lib/auth';
import { NotificationService, CHANNELS } from '@/lib/notificationService';
import { REPAIR_STATUS } from '@/services/repairWorkflow';

/**
 * POST /api/wholesale/repairs/request-action — batch-move a wholesaler's intake
 * repairs toward the shop. Three ways in, matching how the partner actually operates:
 *
 *   pickup    local store; EFD drives out           → PICKUP REQUESTED, admin notified
 *   delivery  local store; they drop off            → deliveryMethod recorded
 *   ship      remote store (e.g. Marlen, Ohio);     → SHIPPED TO SHOP + carrier/tracking,
 *             they hand a box to a carrier             admin notified with the tracking #
 *
 * OWNERSHIP IS IN THE FILTER. A wholesaler's updateMany matches only repairs they own
 * or created — previously any wholesaler could flip ANOTHER wholesaler's repairs by
 * posting guessed IDs, because the filter checked only `isWholesale`. Admin keeps the
 * unscoped filter (they act on behalf of any store).
 */
export async function POST(request) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        if (!['wholesaler', 'admin'].includes(session.user.role)) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        const { repairIDs, action, carrier, trackingNumber } = await request.json();

        if (!Array.isArray(repairIDs) || repairIDs.length === 0) {
            return NextResponse.json({ error: 'repairIDs array is required' }, { status: 400 });
        }

        if (!['pickup', 'delivery', 'ship'].includes(action)) {
            return NextResponse.json({ error: 'action must be "pickup", "delivery" or "ship"' }, { status: 400 });
        }

        // A shipment without a tracking number is a box nobody can find — refuse
        // rather than record an untrackable in-transit state.
        const tracking = String(trackingNumber || '').trim();
        const shipCarrier = String(carrier || '').trim();
        if (action === 'ship' && !tracking) {
            return NextResponse.json({ error: 'trackingNumber is required to mark repairs shipped' }, { status: 400 });
        }

        const dbInstance = await db.connect();
        const now = new Date();

        const baseFilter = {
            repairID: { $in: repairIDs },
            isWholesale: true,
            status: REPAIR_STATUS.PENDING_PICKUP,
        };
        // The ownership fix: non-admins only ever move their own repairs.
        if (session.user.role !== 'admin') {
            baseFilter.$or = [
                { userID: session.user.userID },
                { createdBy: session.user.userID },
            ];
        }

        const wholesalerName = session.user.name || session.user.email;

        if (action === 'pickup') {
            const result = await dbInstance.collection('repairs').updateMany(baseFilter, {
                $set: {
                    status: REPAIR_STATUS.PICKUP_REQUESTED,
                    deliveryMethod: 'pickup',
                    pickupRequestedAt: now,
                    pickupRequestedBy: session.user.userID,
                    updatedAt: now,
                },
            });

            await notifyAdmin({
                type: 'wholesale-pickup-request',
                title: 'Wholesale Pickup Requested',
                message: `${wholesalerName} has ${result.modifiedCount} repair(s) ready for pickup.`,
                tags: ['wholesale', 'pickup'],
                data: { wholesalerName, repairCount: result.modifiedCount },
            });

            return NextResponse.json({
                success: true,
                moved: result.modifiedCount,
                message: `Pickup requested for ${result.modifiedCount} repair(s). Admin has been notified.`,
            });
        }

        if (action === 'ship') {
            const result = await dbInstance.collection('repairs').updateMany(baseFilter, {
                $set: {
                    status: REPAIR_STATUS.SHIPPED_TO_SHOP,
                    deliveryMethod: 'ship',
                    // One inbound shipment object per repair — receiving reads it to
                    // reconcile the box against what was declared shipped.
                    inboundShipment: {
                        carrier: shipCarrier || null,
                        trackingNumber: tracking,
                        shippedAt: now,
                        shippedBy: session.user.userID,
                    },
                    updatedAt: now,
                },
            });

            await notifyAdmin({
                type: 'wholesale-inbound-shipment',
                title: 'Wholesale Shipment Inbound',
                message: `${wholesalerName} shipped ${result.modifiedCount} repair(s) to the shop${shipCarrier ? ` via ${shipCarrier}` : ''}. Tracking: ${tracking}`,
                tags: ['wholesale', 'shipping'],
                data: { wholesalerName, repairCount: result.modifiedCount, carrier: shipCarrier || null, trackingNumber: tracking },
            });

            return NextResponse.json({
                success: true,
                moved: result.modifiedCount,
                message: `${result.modifiedCount} repair(s) marked shipped. Admin has the tracking number.`,
            });
        }

        // action === 'delivery'
        const result = await dbInstance.collection('repairs').updateMany(baseFilter, {
            $set: {
                deliveryMethod: 'delivery',
                deliveryScheduledAt: now,
                updatedAt: now,
            },
        });

        return NextResponse.json({
            success: true,
            moved: result.modifiedCount,
            message: `${result.modifiedCount} repair(s) marked for delivery. Drop them off when ready.`,
        });

    } catch (error) {
        console.error('POST /api/wholesale/repairs/request-action error:', error);
        return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
    }
}

/** Best-effort admin notification — logistics must not fail because email did. */
async function notifyAdmin({ type, title, message, tags, data }) {
    try {
        const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAILS;
        if (!adminEmail) return;

        await NotificationService.createNotification({
            userId: 'admin',
            type,
            title,
            message,
            channels: [CHANNELS.IN_APP, CHANNELS.EMAIL],
            recipientEmail: adminEmail,
            priority: 'high',
            tags,
            data: {
                userRole: 'admin',
                relatedType: 'wholesale-repairs',
                ...data,
                actionUrl: '/dashboard/repairs/pending-wholesale',
                actionLabel: 'View Pending Repairs',
            },
        });
    } catch (error) {
        console.error('Failed to send wholesale logistics notification:', error);
    }
}
