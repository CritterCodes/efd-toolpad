import { NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { requireRepairOps, isAdmin } from '@/lib/apiAuth';
import {
  getActiveBenchRawStatuses,
  isRepairVisibleInBench,
  LEGACY_BENCH_STATUS,
  normalizeRepairWorkflow,
} from '@/services/repairWorkflow';

/**
 * GET /api/repairs/my-bench
 * Returns repairs relevant to the bench. Status is canonical; benchStatus is compatibility-only.
 */
export const GET = async () => {
  try {
    const { session, errorResponse } = await requireRepairOps();
    if (errorResponse) return errorResponse;

    const dbInstance = await db.connect();
    const userID = session.user.userID;
    const adminMode = isAdmin(session);

    const repairs = await dbInstance.collection('repairs')
      .find({
        $or: [
          { status: { $in: getActiveBenchRawStatuses() } },
          { benchStatus: { $in: Object.values(LEGACY_BENCH_STATUS) } },
        ],
      })
      .project({ _id: 0 })
      .sort({ isRush: -1, promiseDate: 1, createdAt: 1 })
      .toArray();

    const normalizedRepairs = repairs
      .map(normalizeRepairWorkflow)
      .filter((repair) => isRepairVisibleInBench(repair, { userID, isAdmin: adminMode }));

    return NextResponse.json(normalizedRepairs, { status: 200 });
  } catch (error) {
    console.error('Error in my-bench route:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};
