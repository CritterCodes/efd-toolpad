import { NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { requireRepairOpsAny } from '@/lib/apiAuth';
import { NotificationService, CHANNELS } from '@/lib/notificationService';
import { REPAIR_STATUS, normalizeRepairStatus } from '@/services/repairWorkflow';

/**
 * POST /api/wholesale/repairs/ship-back — staff records the RETURN shipment of
 * completed wholesale repairs to a remote partner (the outbound half of shipping;
 * request-action `ship` is the inbound half).
 *
 * Body: { repairIDs: string[], carrier?: string, trackingNumber: string }
 *
 * Sets `outboundShipment` and moves the repairs to DELIVERY BATCHED — the existing
 * completed-family status the wholesaler portal already lists — so no downstream
 * classifier changes, closeout/invoicing sees exactly what a local delivery batch
 * looks like, and the tracking number simply rides along. The owning wholesaler is
 * notified with the tracking number per business, not per repair.
 *
 * Staff-gated (receiving or closeout billing): shipping goods out the door is a
 * shop action; a wholesaler never ships to themselves.
 */
export async function POST(request) {
    try {
        const { session, errorResponse } = await requireRepairOpsAny(['receiving', 'closeoutBilling']);
        if (errorResponse) return errorResponse;

        const { repairIDs, carrier, trackingNumber } = await request.json();

        if (!Array.isArray(repairIDs) || repairIDs.length === 0) {
            return NextResponse.json({ error: 'repairIDs array is required' }, { status: 400 });
        }
        const tracking = String(trackingNumber || '').trim();
        if (!tracking) {
            return NextResponse.json({ error: 'trackingNumber is required — an untracked return shipment is a lost-box dispute waiting to happen' }, { status: 400 });
        }
        const shipCarrier = String(carrier || '').trim() || null;

        const dbInstance = await db.connect();
        const now = new Date();

        // Only COMPLETED-family repairs can ship back; shipping an unfinished repair
        // out the door is always a mistake. Fetch first so the response can name
        // exactly which IDs were refused, rather than silently shipping a subset.
        const candidates = await dbInstance.collection('repairs')
            .find(
                { repairID: { $in: repairIDs }, isWholesale: true },
                { projection: { _id: 0, repairID: 1, status: 1, userID: 1, clientName: 1, businessName: 1 } },
            )
            .toArray();

        const shippable = [];
        const refused = [];
        const SHIPPABLE = [REPAIR_STATUS.COMPLETED, REPAIR_STATUS.READY_FOR_PICKUP];
        for (const id of repairIDs) {
            const repair = candidates.find((r) => r.repairID === id);
            if (!repair) { refused.push({ repairID: id, reason: 'not found or not a wholesale repair' }); continue; }
            if (!SHIPPABLE.includes(normalizeRepairStatus(repair.status))) {
                refused.push({ repairID: id, reason: `status is ${repair.status}, not completed` });
                continue;
            }
            shippable.push(repair);
        }

        if (shippable.length) {
            await dbInstance.collection('repairs').updateMany(
                { repairID: { $in: shippable.map((r) => r.repairID) } },
                {
                    $set: {
                        status: REPAIR_STATUS.DELIVERY_BATCHED,
                        deliveryMethod: 'ship',
                        outboundShipment: {
                            carrier: shipCarrier,
                            trackingNumber: tracking,
                            shippedAt: now,
                            shippedBy: session.user.userID,
                        },
                        updatedAt: now,
                    },
                },
            );

            // One notification per owning wholesaler, with their repair count and the
            // tracking number — the thing they actually need to watch the box.
            const byOwner = new Map();
            for (const r of shippable) {
                if (!r.userID) continue;
                const cur = byOwner.get(r.userID) || 0;
                byOwner.set(r.userID, cur + 1);
            }
            for (const [userID, count] of byOwner) {
                await NotificationService.createNotification({
                    userId: userID,
                    type: 'wholesale-shipped-back',
                    title: 'Your repairs are on the way back',
                    message: `${count} completed repair(s) shipped back to you${shipCarrier ? ` via ${shipCarrier}` : ''}. Tracking: ${tracking}`,
                    channels: [CHANNELS.IN_APP, CHANNELS.EMAIL],
                    priority: 'high',
                    tags: ['wholesale', 'shipping'],
                    data: {
                        carrier: shipCarrier,
                        trackingNumber: tracking,
                        repairCount: count,
                        actionUrl: '/dashboard/wholesaler/repairs/completed',
                        actionLabel: 'View Completed Repairs',
                    },
                }).catch((e) => console.error('ship-back notification failed:', e?.message));
            }
        }

        return NextResponse.json({
            success: true,
            shipped: shippable.length,
            refused,
            message: refused.length
                ? `${shippable.length} shipped; ${refused.length} refused (see refused list).`
                : `${shippable.length} repair(s) marked shipped with tracking ${tracking}.`,
        });
    } catch (error) {
        console.error('POST /api/wholesale/repairs/ship-back error:', error);
        return NextResponse.json({ error: 'Failed to record the return shipment' }, { status: 500 });
    }
}
