import { NextResponse } from 'next/server';
import RepairsModel from '../../model';
import { requireRepairOps } from '@/lib/apiAuth';
import { buildPartsReadyForWorkUpdate } from '@/services/repairWorkflow';
import { NotificationService } from '@/lib/notificationService';

export const POST = async (req, { params }) => {
  try {
    const { errorResponse } = await requireRepairOps();
    if (errorResponse) return errorResponse;

    const { repairID } = params;
    if (!repairID) return NextResponse.json({ error: 'Repair ID is required.' }, { status: 400 });

    const updated = await RepairsModel.updateById(repairID, buildPartsReadyForWorkUpdate({ now: new Date() }));

    // R10 — parts ready for work: notify the assignee artisan the repair can resume (best-effort, in-app).
    try {
      const assigneeID = updated?.assignedTo;
      if (assigneeID) {
        const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL || '';
        await NotificationService.createNotification({
          userId: assigneeID,
          type: 'repair-parts-ready',
          title: 'Parts arrived — repair ready to resume',
          message: `Parts have arrived for a repair assigned to you${updated.clientName ? ` (${updated.clientName})` : ''}. It's ready to resume work.`,
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
      console.error('R10 repair-parts-ready notification failed (non-fatal):', notifyError.message);
    }

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error('Error in parts-ready-for-work route:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};
