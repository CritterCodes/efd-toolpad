import { NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { requireRepairOps } from '@/lib/apiAuth';
import { LEGACY_BENCH_STATUS, REPAIR_STATUS } from '@/services/repairWorkflow';
import { NotificationService, CHANNELS } from '@/lib/notificationService';

// POST /api/wholesale/repairs/receive - Batch receive wholesale repairs
export async function POST(request) {
    try {
        const { session, errorResponse } = await requireRepairOps('receiving');
        if (errorResponse) return errorResponse;

        const { repairIDs } = await request.json();

        if (!Array.isArray(repairIDs) || repairIDs.length === 0) {
            return NextResponse.json(
                { error: 'repairIDs array is required' },
                { status: 400 }
            );
        }

        const dbInstance = await db.connect();

        // Snapshot owners BEFORE the update so the arrival note goes to exactly
        // the repairs this receive actually moved (the update filter re-checks
        // status, so a second receive of the same IDs matches nothing).
        const receivable = await dbInstance.collection('repairs')
            .find(
                {
                    repairID: { $in: repairIDs },
                    isWholesale: true,
                    status: { $in: [REPAIR_STATUS.PENDING_PICKUP, REPAIR_STATUS.PICKUP_REQUESTED, REPAIR_STATUS.SHIPPED_TO_SHOP] },
                },
                { projection: { _id: 0, repairID: 1, userID: 1, createdBy: 1 } },
            )
            .toArray();

        const result = await dbInstance.collection('repairs').updateMany(
            {
                repairID: { $in: repairIDs },
                isWholesale: true,
                status: { $in: [REPAIR_STATUS.PENDING_PICKUP, REPAIR_STATUS.PICKUP_REQUESTED, REPAIR_STATUS.SHIPPED_TO_SHOP] }
            },
            {
                $set: {
                    status: REPAIR_STATUS.READY_FOR_WORK,
                    benchStatus: LEGACY_BENCH_STATUS.UNCLAIMED,
                    receivedAt: new Date(),
                    receivedBy: session.user.userID,
                    updatedAt: new Date()
                }
            }
        );

        // "We received your box" — the wholesaler shipped or dropped items and
        // heard nothing until work started. One note per owning account, with
        // the repair IDs so their bookkeeping can tick them off. Best-effort:
        // receiving must never fail because a notification did.
        const byOwner = new Map();
        for (const r of receivable) {
            const owner = r.userID || r.createdBy;
            if (!owner) continue;
            if (!byOwner.has(owner)) byOwner.set(owner, []);
            byOwner.get(owner).push(r.repairID);
        }
        for (const [owner, ids] of byOwner) {
            NotificationService.createNotification({
                userId: owner,
                type: 'wholesale-received',
                title: 'We received your repairs',
                message: `${ids.length} repair(s) checked in at the shop and queued for work: ${ids.join(', ')}`,
                channels: [CHANNELS.IN_APP, CHANNELS.EMAIL],
                priority: 'normal',
                tags: ['wholesale', 'receiving'],
                data: {
                    repairIDs: ids,
                    actionUrl: '/dashboard/wholesaler/repairs/current',
                    actionLabel: 'View Current Repairs',
                },
            }).catch((e) => console.error('receive notification failed:', e?.message));
        }

        return NextResponse.json({
            success: true,
            received: result.modifiedCount,
            message: `${result.modifiedCount} repair(s) moved to ready for work`
        });

    } catch (error) {
        console.error('POST /api/wholesale/repairs/receive error:', error);
        return NextResponse.json(
            { error: 'Failed to receive repairs' },
            { status: 500 }
        );
    }
}
