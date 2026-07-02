import { NextResponse } from 'next/server';
import RepairsModel from '../../model';
import { requireRepairOps } from '@/lib/apiAuth';
import { buildClaimRepairUpdate } from '@/services/repairWorkflow';
import { NotificationService } from '@/lib/notificationService';

export const POST = async (req, { params }) => {
  try {
    const { session, errorResponse } = await requireRepairOps('benchWork');
    if (errorResponse) return errorResponse;

    const { repairID } = params;
    if (!repairID) return NextResponse.json({ error: 'Repair ID is required.' }, { status: 400 });

    const repair = await RepairsModel.findById(repairID);

    const previousJeweler = repair.assignedTo;
    const callerID = session.user.userID;
    const isSharedWork = previousJeweler && previousJeweler !== callerID;

    const updateData = buildClaimRepairUpdate({
      repair,
      userID: callerID,
      userName: session.user.name,
      now: new Date(),
    });

    const updated = await RepairsModel.updateById(repairID, updateData);

    // R7 — repair claimed/assigned: notify the assignee artisan (best-effort, in-app + push).
    try {
      const assigneeID = updated.assignedTo;
      if (assigneeID) {
        const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL || '';
        await NotificationService.createNotification({
          userId: assigneeID,
          type: 'repair-assigned',
          title: 'Repair assigned to you',
          message: `A repair has been assigned to you${updated.clientName ? ` (${updated.clientName})` : ''}.`,
          channels: ['inApp'],
          priority: 'normal',
          data: {
            actionUrl: `${adminUrl}/dashboard/repairs/${repairID}`,
            repairID,
            clientName: updated.clientName || '',
          },
        });
      }
    } catch (notifyError) {
      console.error('R7 repair-assigned notification failed (non-fatal):', notifyError.message);
    }

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error('❌ Error in claim route:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};
