import { NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { requireRepairOps, isAdmin } from '@/lib/apiAuth';

const READY_FOR_WORK_STATUSES = ['READY FOR WORK', 'ready', 'ready-for-work'];
const BENCH_STATUSES = ['UNCLAIMED', 'IN_PROGRESS', 'WAITING_PARTS', 'QC'];

function normalizeBenchRepair(repair) {
  if (repair.benchStatus) return repair;

  if (READY_FOR_WORK_STATUSES.includes(repair.status)) {
    return {
      ...repair,
      benchStatus: repair.assignedTo ? 'IN_PROGRESS' : 'UNCLAIMED',
    };
  }

  return repair;
}

/**
 * GET /api/repairs/my-bench
 * Returns repairs relevant to the bench: assigned to the caller, unclaimed ready-for-work,
 * waiting-parts, and QC. Admins see all bench-status repairs.
 */
export const GET = async (req) => {
  try {
    const { session, errorResponse } = await requireRepairOps();
    if (errorResponse) return errorResponse;

    const dbInstance = await db.connect();
    let query;

    if (isAdmin(session)) {
      query = {
        $or: [
          { benchStatus: { $in: BENCH_STATUSES } },
          { status: { $in: READY_FOR_WORK_STATUSES } },
          { status: 'QC' },
        ],
      };
    } else {
      const userID = session.user.userID;
      query = {
        $or: [
          { assignedTo: userID },
          { benchStatus: 'UNCLAIMED', status: { $in: READY_FOR_WORK_STATUSES } },
          { assignedTo: { $in: ['', null] }, status: { $in: READY_FOR_WORK_STATUSES } },
          { benchStatus: 'WAITING_PARTS' },
          { benchStatus: 'QC' },
          { status: 'QC' },
        ],
      };
    }

    const repairs = await dbInstance.collection('repairs')
      .find(query)
      .project({ _id: 0 })
      .sort({ isRush: -1, promiseDate: 1, createdAt: 1 })
      .toArray();

    return NextResponse.json(repairs.map(normalizeBenchRepair), { status: 200 });
  } catch (error) {
    console.error('❌ Error in my-bench route:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};
