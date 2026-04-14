import { NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { auth } from '@/lib/auth';

// POST /api/wholesale/repairs/receive - Batch receive wholesale repairs
export async function POST(request) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        if (session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }

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
                status: { $in: ['PENDING PICKUP', 'PICKUP REQUESTED'] }
            },
            {
                $set: {
                    status: 'RECEIVING',
                    receivedAt: new Date(),
                    receivedBy: session.user.id,
                    updatedAt: new Date()
                }
            }
        );

        return NextResponse.json({
            success: true,
            received: result.modifiedCount,
            message: `${result.modifiedCount} repair(s) marked as received`
        });

    } catch (error) {
        console.error('POST /api/wholesale/repairs/receive error:', error);
        return NextResponse.json(
            { error: 'Failed to receive repairs' },
            { status: 500 }
        );
    }
}
