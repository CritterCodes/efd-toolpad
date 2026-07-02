import { NextResponse } from 'next/server';
import RepairsModel from '../../model';
import { requireRepairOps } from '@/lib/apiAuth';
import { buildMarkPartsOrderedUpdate } from '@/services/repairWorkflow';
import { NotificationService } from '@/lib/notificationService';

export const POST = async (req, { params }) => {
  try {
    const { session, errorResponse } = await requireRepairOps();
    if (errorResponse) return errorResponse;

    const { repairID } = params;
    if (!repairID) return NextResponse.json({ error: 'Repair ID is required.' }, { status: 400 });

    const repair = await RepairsModel.findById(repairID);
    const updated = await RepairsModel.updateById(repairID, buildMarkPartsOrderedUpdate({
      repair,
      userName: session.user.name,
      now: new Date(),
    }));

    // R6 — parts ordered: notify customer of the status update (best-effort).
    try {
      const customerID = updated.userID;
      const customerEmail = updated.email || updated.clientEmail || updated.customerEmail || '';
      if (customerID || customerEmail) {
        const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL || '';
        await NotificationService.createNotification({
          userId: customerID,
          type: 'repair-status',
          title: 'Repair update: parts ordered',
          message: `We've ordered the parts needed for your repair${updated.clientName ? `, ${updated.clientName}` : ''}. Work will resume once they arrive.`,
          channels: ['inApp', 'email'],
          recipientEmail: customerEmail || undefined,
          priority: 'normal',
          data: {
            actionUrl: `${adminUrl}/dashboard/repairs/${repairID}`,
            repairID,
            status: updated.status || '',
            clientName: updated.clientName || '',
          },
        });
      }
    } catch (notifyError) {
      console.error('R6 repair-status (parts-ordered) notification failed (non-fatal):', notifyError.message);
    }

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error('Error in mark-parts-ordered route:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};
