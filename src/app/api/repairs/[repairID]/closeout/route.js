import { NextResponse } from 'next/server';
import RepairsModel from '../../model';
import { uploadRepairImage } from '@/utils/s3.util';
import { requireRepairOpsAny, requireRole } from '@/lib/apiAuth';
import { createRepairInvoice } from '@/app/api/repair-invoices/service';
import RepairInvoicesModel from '@/app/api/repair-invoices/model';
import { syncLaborLogAfterRepairChange } from '@/services/repairLaborReviewSync';

async function requireCloseoutAccess() {
  const adminResult = await requireRole(['admin']);
  if (!adminResult.errorResponse) return adminResult;

  return await requireRepairOpsAny(['qualityControl', 'closeoutBilling']);
}

/**
 * Hand the auto-invoice claim back — but only when it is provably safe.
 *
 * "Was this repair invoiced" is a fact about the invoices collection, NOT about `repair.invoiceID`:
 * createRepairInvoice inserts the invoice document before it writes that field, so a failure in
 * between leaves a real invoice holding a priced snapshot while the repair row still looks unbilled.
 * Releasing on the repair's own field alone would free it and let the next confirm raise a SECOND
 * invoice for work already billed.
 *
 * Fails CLOSED: if the invoices collection can't be reached, the claim is kept. A stuck claim is
 * recoverable by an admin (remove the repair from its invoice, or reset closeoutStatus); a duplicate
 * bill reaches the customer.
 *
 * Returns true when an invoice already exists, so callers can say so.
 */
async function releaseClaimIfUninvoiced(repairID) {
  let alreadyInvoiced;
  try {
    const existing = await RepairInvoicesModel.findAll({ repairIDs: repairID });
    alreadyInvoiced = Array.isArray(existing) && existing.length > 0;
  } catch (lookupError) {
    console.error('Could not confirm invoice state; keeping the claim:', lookupError.message);
    return true;
  }

  if (!alreadyInvoiced) {
    // try/await rather than `.catch()` chaining: a release failure must not escape and turn an
    // otherwise-handled error into a 500, nor mask the real error that triggered the release.
    try {
      await RepairsModel.releaseAutoInvoiceClaim(repairID);
    } catch (releaseError) {
      console.error('Failed to release auto-invoice claim:', releaseError.message);
    }
  }
  return alreadyInvoiced;
}

export const POST = async (req, { params }) => {
  try {
    const { session, errorResponse } = await requireCloseoutAccess();
    if (errorResponse) return errorResponse;

    // `await` because Next 15 hands route handlers a Promise for params and only keeps synchronous
    // access working through a deprecation shim — this route destructured it directly, so it would start
    // returning "Repair ID is required." on every closeout the moment that shim goes. Awaiting is correct
    // for both shapes, and matches the newer route handlers in this repo.
    const { repairID } = await params;
    if (!repairID) {
      return NextResponse.json({ error: 'Repair ID is required.' }, { status: 400 });
    }

    const repair = await RepairsModel.findById(repairID);
    if (repair.status !== 'COMPLETED') {
      return NextResponse.json({ error: 'Repair must be COMPLETED before closeout can be edited.' }, { status: 400 });
    }
    const contentType = req.headers.get('content-type') || '';

    let nextAfterPhotos = Array.isArray(repair.afterPhotos) ? [...repair.afterPhotos] : [];
    let closeoutNotes = repair.closeoutNotes || '';
    const closeoutUpdate = {};

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const noteValue = formData.get('closeoutNotes');
      if (typeof noteValue === 'string') closeoutNotes = noteValue;

      const files = formData.getAll('afterPhotos').filter((value) => value && typeof value === 'object' && typeof value.arrayBuffer === 'function');
      for (const file of files) {
        const url = await uploadRepairImage(file, `${repairID}/after`);
        nextAfterPhotos.push(url);
      }
    } else {
      const body = await req.json().catch(() => ({}));
      if (Array.isArray(body.afterPhotos)) {
        nextAfterPhotos = body.afterPhotos.filter(Boolean);
      }
      if (typeof body.closeoutNotes === 'string') {
        closeoutNotes = body.closeoutNotes;
      }

      [
        'tasks',
        'materials',
        'customLineItems',
        'subtotal',
        'rushFee',
        'deliveryFee',
        'taxAmount',
        'taxRate',
        'includeTax',
        'includeDelivery',
        'totalCost',
        'status',
      ].forEach((field) => {
        if (Object.prototype.hasOwnProperty.call(body, field)) {
          closeoutUpdate[field] = body[field];
        }
      });
    }

    // CLAIM BEFORE ANY WRITE. The claim token IS `closeoutStatus`, so it must be taken before this
    // request touches that field and it must not be written again below — otherwise a second request
    // resets the token to 'in_review' after the first has claimed it, both requests "win", and the
    // repair gets billed twice. A single atomic updateOne is only exclusive if nothing clobbers what it
    // wrote; the claim has to be the FIRST write of that field in the request, not a later one.
    //
    // Consequence: `closeoutStatus` is deliberately absent from the $set below. The claim sets
    // 'batched' (a successful invoice's own value), and the release path sets 'in_review' if invoicing
    // fails — so the field still reports that closeout was performed, without a second writer.
    const wonInvoiceClaim = await RepairsModel.claimForAutoInvoice(repairID);

    // Everything between taking the claim and the invoicing block must release it on failure, or a
    // throw here leaves the repair holding 'batched' with no invoice behind it — and because the claim
    // filter demands an UNbatched closeout, every later confirm would then fail the claim and the repair
    // could never be billed at all. Silent, permanent, and worse than the race the claim prevents.
    let updated;
    try {
      updated = await RepairsModel.updateById(repairID, {
        afterPhotos: nextAfterPhotos,
        closeoutNotes,
        ...closeoutUpdate,
        closeoutBy: session.user.name || session.user.email || '',
        closeoutAt: new Date(),
        updatedAt: new Date(),
      });

      await syncLaborLogAfterRepairChange({ existingRepair: repair, updateData: closeoutUpdate });
    } catch (writeError) {
      if (wonInvoiceClaim) await releaseClaimIfUninvoiced(repairID);
      throw writeError;
    }

    let autoInvoice = null;
    let autoInvoiceError = '';
    // Auto-invoice keys off the CLOSEOUT BEING CONFIRMED, not off a photo existing (owner,
    // 2026-07-31: photos no longer gate invoicing). This was the deciding gate of the three: the
    // button that reaches this route is literally labelled "Confirm / Move to Invoice", so while this
    // read `nextAfterPhotos.length > 0` a photo-less confirm returned 200 and silently left the repair
    // un-invoiced in the closeout queue — the exact symptom the other two gates were removed to fix.
    //
    // The JSON branch above (tasks/materials/line items) has no live caller in this app; if one is ever
    // added for incremental edits it must NOT auto-invoice — gate it then, rather than reintroducing a
    // photo check here.
    //
    // The decision to invoice was made by the ATOMIC CLAIM above, not by reading invoiceID and then
    // writing it. Every confirm now invoices, so two devices confirming the same repair would otherwise
    // both read an empty invoiceID and both bill it; the claim lets exactly one caller through.
    if (wonInvoiceClaim) {
      try {
        autoInvoice = await createRepairInvoice({
          repairIDs: [repairID],
          deliveryMethod: 'pickup',
          closeoutNotes,
          createdBy: session.user.name || session.user.email || '',
          appendToOpen: true,
        });
        updated = await RepairsModel.findById(repairID);
      } catch (invoiceError) {
        // Hand the claim back so the billing can be retried, unless an invoice already exists for this
        // repair — see releaseClaimIfUninvoiced for why that question is asked of the invoices
        // collection rather than of repair.invoiceID.
        const alreadyInvoiced = await releaseClaimIfUninvoiced(repairID);
        autoInvoiceError = alreadyInvoiced
          ? `${invoiceError.message} (an invoice already exists for this repair — check the Draft/Open tab before retrying)`
          : invoiceError.message;
        updated = await RepairsModel.findById(repairID);
      }
    }

    if (autoInvoice || autoInvoiceError) {
      return NextResponse.json({
        ...updated,
        autoInvoice: autoInvoice
          ? {
              invoiceID: autoInvoice.invoiceID,
              status: autoInvoice.status,
              repairCount: Array.isArray(autoInvoice.repairIDs) ? autoInvoice.repairIDs.length : 0,
            }
          : null,
        autoInvoiceError,
      }, { status: 200 });
    }

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error('Error saving repair closeout:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};
