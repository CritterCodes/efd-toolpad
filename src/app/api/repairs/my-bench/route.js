import { NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { requireRepairOps, isAdmin } from '@/lib/apiAuth';

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
          { benchStatus: { $in: ['UNCLAIMED', 'IN_PROGRESS', 'WAITING_PARTS', 'QC'] } },
          { status: 'QC' },
        ],
      };
    } else {
      const userID = session.user.userID;
      query = {
        $or: [
          { assignedTo: userID },
          { benchStatus: 'UNCLAIMED', status: { $in: ['READY FOR WORK', 'ready', 'in-progress'] } },
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

    return NextResponse.json(repairs, { status: 200 });
  } catch (error) {
    console.error('❌ Error in my-bench route:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};
