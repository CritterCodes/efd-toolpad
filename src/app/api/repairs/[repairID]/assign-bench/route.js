import { NextResponse } from 'next/server';
import RepairsModel from '../../model';
import { db } from '@/lib/database';
import { requireRole } from '@/lib/apiAuth';
import { buildAssignBenchUpdate } from '@/services/repairWorkflow';

const ASSIGNABLE_ARTISAN_QUERY = {
  role: { $in: ['artisan', 'senior-artisan'] },
  isApproved: { $ne: false },
  isActive: { $ne: false },
  status: { $nin: ['inactive', 'disabled', 'deleted'] },
};

function getJewelerName(user) {
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
  return fullName || user?.name || user?.email || 'Assigned Jeweler';
}

export const POST = async (req, { params }) => {
  try {
    const { errorResponse } = await requireRole(['admin', 'dev']);
    if (errorResponse) return errorResponse;

    const { repairID } = params;
    if (!repairID) return NextResponse.json({ error: 'Repair ID is required.' }, { status: 400 });

    const { userID } = await req.json();
    if (!userID) return NextResponse.json({ error: 'Jeweler is required.' }, { status: 400 });

    const dbInstance = await db.connect();
    const jeweler = await dbInstance.collection('users').findOne(
      {
        ...ASSIGNABLE_ARTISAN_QUERY,
        userID,
      },
      {
        projection: {
          _id: 0,
          userID: 1,
          firstName: 1,
          lastName: 1,
          name: 1,
          email: 1,
        },
      }
    );

    if (!jeweler) {
      return NextResponse.json({ error: 'Assignable artisan not found.' }, { status: 404 });
    }

    const repair = await RepairsModel.findById(repairID);
    const isSharedWork = repair.assignedTo && repair.assignedTo !== jeweler.userID;

    const updateData = buildAssignBenchUpdate({
      repair,
      userID: jeweler.userID,
      userName: getJewelerName(jeweler),
      now: new Date(),
      requiresLaborReview: isSharedWork,
    });

    const updated = await RepairsModel.updateById(repairID, updateData);
    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error('Error assigning bench repair:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};
