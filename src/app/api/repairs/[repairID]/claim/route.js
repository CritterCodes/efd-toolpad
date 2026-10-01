import { NextResponse } from 'next/server';
import RepairsModel from '../../model';
import { requireRepairOps } from '@/lib/apiAuth';
import { buildClaimRepairUpdate } from '@/services/repairWorkflow';
import { NotificationService } from '@/lib/notificationService';
import { adminBase } from '@/lib/appUrls';
import { assertCanHoldWork, apprenticeErrorStatus } from '@/services/pay/apprentice';
import { assertTermsAccepted } from '@/services/policies/termsGate';
import { claimRefusal, benchRuleError } from '@/services/bench/benchRules';

export const POST = async (req, { params }) => {
  try {
    const { session, errorResponse } = await requireRepairOps('benchWork');
    if (errorResponse) return errorResponse;

    const { repairID } = params;
    if (!repairID) return NextResponse.json({ error: 'Repair ID is required.' }, { status: 400 });

    // Apprentices are paid on the clock and don't hold jobs (services/pay/apprentice.js).
    await assertCanHoldWork(session.user.userID);
    await assertTermsAccepted(session); // the bench card's claim always checked this; the scan's didn't (B2)

    const repair = await RepairsModel.findById(repairID);
    const callerID = session.user.userID;
    const refusal = claimRefusal(repair, { userID: callerID, isAdmin: ['admin', 'dev'].includes(session.user.role) });
    if (refusal) throw benchRuleError(refusal.message, refusal.code);

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
      // Don't tell the claimer about their own claim (B2): only an assignment by someone else is news.
      if (assigneeID && assigneeID !== callerID) {
        const adminUrl = adminBase();
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
    // RepairsModel.findById throws 'Repair not found.' — a missing repair is a 404, not a server error.
    const notFound = error.message === 'Repair not found.' ? 404 : null;
    const terms = error.code === 'TERMS_REQUIRED' ? 403 : null;
    return NextResponse.json({ error: error.message, ...(error.code ? { code: error.code } : {}) }, { status: error.status || apprenticeErrorStatus(error) || terms || notFound || 500 });
  }
};
