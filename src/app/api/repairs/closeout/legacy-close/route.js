import { NextResponse } from 'next/server';
import RepairsModel from '@/app/api/repairs/model';
import { requireRepairOpsAny, requireRole } from '@/lib/apiAuth';

async function requireCloseoutAccess() {
  const adminResult = await requireRole(['admin']);
  if (!adminResult.errorResponse) return adminResult;

  return await requireRepairOpsAny(['qualityControl', 'closeoutBilling']);
}

export const POST = async (req) => {
  try {
    const { session, errorResponse } = await requireCloseoutAccess();
    if (errorResponse) return errorResponse;

    const body = await req.json().catch(() => ({}));
    const repairIDs = Array.isArray(body.repairIDs)
      ? [...new Set(body.repairIDs.map((repairID) => String(repairID || '').trim()).filter(Boolean))]
      : [];
    const note = String(body.note || '').trim();

    if (repairIDs.length === 0) {
      return NextResponse.json({ error: 'At least one repair is required.' }, { status: 400 });
    }

    const closedAt = new Date();
    const closedBy = session.user.name || session.user.email || session.user.userID || '';
    const results = [];

    for (const repairID of repairIDs) {
      try {
        const repair = await RepairsModel.findById(repairID);
        if (repair.invoiceID) {
          results.push({ repairID, ok: false, error: `Already attached to invoice ${repair.invoiceID}.` });
          continue;
        }

        const existingNotes = String(repair.closeoutNotes || '').trim();
        const legacyNote = [
          `Legacy closeout: marked paid and delivered by ${closedBy} on ${closedAt.toISOString()}.`,
          note ? `Reason: ${note}` : '',
        ].filter(Boolean).join(' ');

        const updated = await RepairsModel.updateById(repairID, {
          status: 'PAID_CLOSED',
          closeoutStatus: 'legacy_closed',
          closeoutBy: closedBy,
          closeoutAt: closedAt,
          legacyClosedBy: closedBy,
          legacyClosedAt: closedAt,
          legacyCloseoutNote: note,
          closeoutNotes: [existingNotes, legacyNote].filter(Boolean).join('\n'),
          updatedAt: closedAt,
        });

        results.push({ repairID, ok: true, status: updated.status });
      } catch (error) {
        results.push({ repairID, ok: false, error: error.message });
      }
    }

    return NextResponse.json({
      closed: results.filter((result) => result.ok).length,
      failed: results.filter((result) => !result.ok),
      results,
    }, { status: 200 });
  } catch (error) {
    console.error('Error legacy-closing repairs:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};
