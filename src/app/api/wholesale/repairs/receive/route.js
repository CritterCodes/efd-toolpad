import { NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { requireRepairOps } from '@/lib/apiAuth';
import { LEGACY_BENCH_STATUS, REPAIR_STATUS } from '@/services/repairWorkflow';

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

        const result = await dbInstance.collection('repairs').updateMany(
            {
                repairID: { $in: repairIDs },
                isWholesale: true,
                status: { $in: [REPAIR_STATUS.PENDING_PICKUP, REPAIR_STATUS.PICKUP_REQUESTED] }
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
