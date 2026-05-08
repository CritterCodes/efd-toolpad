import { NextResponse } from 'next/server';
import RepairsModel from '../../model';
import { db } from '@/lib/database';
import { requireRepairOps } from '@/lib/apiAuth';
import { buildQuickCompleteUpdate, REPAIR_STATUS, normalizeRepairStatus } from '@/services/repairWorkflow';

const ASSIGNABLE_ARTISAN_QUERY = {
  role: { $in: ['artisan', 'senior-artisan'] },
  isApproved: { $ne: false },
  isActive: { $ne: false },
  status: { $nin: ['inactive', 'disabled', 'deleted'] },
};

const BLOCKED_STATUSES = new Set([
  REPAIR_STATUS.READY_FOR_PICKUP,
  REPAIR_STATUS.DELIVERY_BATCHED,
  REPAIR_STATUS.PAID_CLOSED,
  REPAIR_STATUS.PICKED_UP,
  REPAIR_STATUS.CANCELLED,
]);

function getJewelerName(user) {
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
  return fullName || user?.name || user?.email || 'Assigned Jeweler';
}

export const POST = async (req, { params }) => {
  try {
    const { session, errorResponse } = await requireRepairOps();
    if (errorResponse) return errorResponse;

    const { repairID } = params;
    if (!repairID) return NextResponse.json({ error: 'Repair ID is required.' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const jewelerID = String(body.userID || '').trim();
    if (!jewelerID) return NextResponse.json({ error: 'Jeweler is required.' }, { status: 400 });

    const repair = await RepairsModel.findById(repairID);
    if (!repair) return NextResponse.json({ error: 'Repair not found.' }, { status: 404 });

    const normalizedStatus = normalizeRepairStatus(repair?.status);
    if (BLOCKED_STATUSES.has(normalizedStatus)) {
      return NextResponse.json({ error: `Repair ${repairID} cannot be fast-completed from ${repair.status}.` }, { status: 400 });
    }
    if (repair?.invoiceID) {
      return NextResponse.json({ error: `Repair ${repairID} is already attached to invoice ${repair.invoiceID}.` }, { status: 400 });
    }

    const dbInstance = await db.connect();
    const jeweler = await dbInstance.collection('users').findOne(
      {
        ...ASSIGNABLE_ARTISAN_QUERY,
        userID: jewelerID,
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

    const updated = await RepairsModel.updateById(repairID, buildQuickCompleteUpdate({
      repair,
      jewelerID: jeweler.userID,
      jewelerName: getJewelerName(jeweler),
      userName: session.user.name || session.user.email || 'In-store staff',
      now: new Date(),
    }));

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error('Error fast-completing repair:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};
