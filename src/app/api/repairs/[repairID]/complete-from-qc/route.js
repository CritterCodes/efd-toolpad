import { NextResponse } from 'next/server';
import RepairsModel from '../../model';
import { requireRepairOps } from '@/lib/apiAuth';
import { buildCompleteFromQcUpdate } from '@/services/repairWorkflow';
import { creditRepairLaborAtQc } from '@/services/repairs/benchHandoff';
import { NotificationService } from '@/lib/notificationService';

export const POST = async (req, { params }) => {
  try {
    const { session, errorResponse } = await requireRepairOps('qualityControl');
    if (errorResponse) return errorResponse;

    const { repairID } = params;
    if (!repairID) return NextResponse.json({ error: 'Repair ID is required.' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const nextStatus = body.deliveryBatched ? 'DELIVERY BATCHED' : (body.readyForPickup ? 'READY FOR PICKUP' : 'COMPLETED');

    // Credit labor on QC pass (one log per jeweler from the sign-off stamps) — same as the
    // unified bench path. Idempotent, so it's safe regardless of which surface completes QC.
    const repair = await RepairsModel.findById(repairID);
    await creditRepairLaborAtQc({ repair, session });

    const updated = await RepairsModel.updateById(repairID, buildCompleteFromQcUpdate({
      nextStatus,
      userName: session.user.name,
      now: new Date(),
    }));

    // R3 — QC passed, repair completed & ready for pickup: notify customer (best-effort, high priority).
    try {
      const customerID = updated.userID;
      const customerEmail = updated.email || updated.clientEmail || updated.customerEmail || '';
      if (customerID || customerEmail) {
        const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL || '';
        await NotificationService.createNotification({
          userId: customerID,
          type: 'repair-ready-pickup',
          title: 'Your repair is ready for pickup',
          message: `Good news${updated.clientName ? `, ${updated.clientName}` : ''}! Your repair has passed final inspection and is ready for pickup.`,
          channels: ['inApp', 'email'],
          recipientEmail: customerEmail || undefined,
          priority: 'high',
          data: {
            actionUrl: `${adminUrl}/dashboard/repairs/${repairID}`,
            repairID,
            clientName: updated.clientName || '',
          },
        });
      }
    } catch (notifyError) {
      console.error('R3 repair-ready-pickup notification failed (non-fatal):', notifyError.message);
    }

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error('Error in complete-from-qc route:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};
