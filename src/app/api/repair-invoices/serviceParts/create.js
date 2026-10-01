import { db } from '@/lib/database';
import RepairInvoicesModel from '@/app/api/repair-invoices/model';
import RepairsModel from '@/app/api/repairs/model';
import { DEFAULT_DELIVERY_FEE, buildRepairSnapshot, calculateInvoiceTotals, getRepairAccountContext } from './totals';
/**
 * The invoice this repair should join, if there is one: that account's open DRAFT.
 *
 * Only a draft, for everyone (owner, 2026-09-29: "when I click Finalize, that's whenever it's
 * finalized, and it goes to Open, and they get notified that they need to pay"). Finalize is what
 * issues the bill and tells the customer, so nothing may join an invoice after that — quietly growing
 * a total somebody has already been shown is not a thing to do to them.
 *
 * Both halves of the shop behave the same way: repairs collect on one draft while the work is going
 * on — six rings from one walk-in, or a store's week — and a repair that finishes after you
 * finalized starts the next invoice.
 */
export async function findAppendableInvoice(context, deliveryMethod) {
  const dbInstance = await db.connect();
  return await dbInstance.collection(RepairInvoicesModel.COLLECTION)
    .findOne(
      {
        accountType: context.accountType,
        accountID: context.accountID,
        deliveryMethod,
        status: 'draft',
        paymentStatus: { $ne: 'paid' },
      },
      { projection: { _id: 0 }, sort: { createdAt: -1 } }
    );
}

export async function appendRepairsToInvoice(invoice, repairs, repairSnapshots, createdBy = '') {
  const existingRepairIDs = Array.isArray(invoice.repairIDs) ? invoice.repairIDs : [];
  const nextRepairIDs = [...new Set([...existingRepairIDs, ...repairs.map((repair) => repair.repairID)])];
  const existingSnapshots = Array.isArray(invoice.repairSnapshots) ? invoice.repairSnapshots : [];
  const nextSnapshots = [
    ...existingSnapshots.filter((snapshot) => !repairSnapshots.some((repair) => repair.repairID === snapshot.repairID)),
    ...repairSnapshots,
  ];

  const deliveryFee = parseFloat(invoice.deliveryFee || 0);
  const totals = calculateInvoiceTotals(nextSnapshots, deliveryFee, 0, invoice.amountPaid, invoice.shippingFee || 0);

  const updatedInvoice = await RepairInvoicesModel.updateByInvoiceID(invoice.invoiceID, {
    repairIDs: nextRepairIDs,
    repairSnapshots: nextSnapshots,
    ...totals,
    cashDiscountApplied: false,
  });

  const nextRepairStatus = invoice.deliveryMethod === 'delivery' ? 'DELIVERY BATCHED' : 'READY FOR PICKUP';
  await Promise.all(
    repairs.map((repair) =>
      RepairsModel.updateById(repair.repairID, {
        invoiceID: invoice.invoiceID,
        closeoutStatus: 'batched',
        closeoutBy: createdBy,
        closeoutAt: new Date(),
        status: nextRepairStatus,
        updatedAt: new Date(),
      })
    )
  );

  return updatedInvoice;
}

// Exported for tests: this is the server-side gate on what may be billed, and the after-photo
// requirement was removed from it (owner, 2026-07-31). Worth pinning so the removal can't creep back.
export async function ensureRepairsCanBatch(repairs) {
  if (repairs.length === 0) throw new Error('At least one repair is required.');

  const baseContext = getRepairAccountContext(repairs[0]);

  for (const repair of repairs) {
    if (repair.status !== 'COMPLETED') {
      throw new Error(`Repair ${repair.repairID} must be COMPLETED before closeout batching.`);
    }
    // After photos are NO LONGER REQUIRED to invoice (owner, 2026-07-31). They're still captured at
    // closeout and still worth having — they just no longer block billing a finished repair, because a
    // missing photo was stopping money from going out the door.
    if (repair.invoiceID) {
      throw new Error(`Repair ${repair.repairID} is already attached to invoice ${repair.invoiceID}.`);
    }

    const context = getRepairAccountContext(repair);
    if (
      context.accountType !== baseContext.accountType ||
      context.accountID !== baseContext.accountID
    ) {
      throw new Error('All repairs in a batch invoice must belong to the same billing account.');
    }
  }

  return baseContext;
}

export async function getCloseoutRepairs() {
  const dbInstance = await db.connect();
  return await dbInstance.collection('repairs')
    .find({
      status: 'COMPLETED',
      $or: [
        { invoiceID: { $exists: false } },
        { invoiceID: '' },
        { invoiceID: null },
      ],
    })
    .project({ _id: 0 })
    .sort({ completedAt: -1, updatedAt: -1 })
    .toArray();
}

export async function createRepairInvoice({
  repairIDs,
  deliveryMethod = 'pickup',
  deliveryFee = null,
  closeoutNotes = '',
  createdBy = '',
  appendToOpen = true,
}) {
  const repairs = await Promise.all(repairIDs.map((repairID) => RepairsModel.findById(repairID)));
  const context = await ensureRepairsCanBatch(repairs);
  const repairSnapshots = repairs.map(buildRepairSnapshot);

  if (appendToOpen) {
    const appendableInvoice = await findAppendableInvoice(context, deliveryMethod);
    if (appendableInvoice) {
      return await appendRepairsToInvoice(appendableInvoice, repairs, repairSnapshots, createdBy);
    }
  }

  const normalizedDeliveryFee = deliveryMethod === 'delivery'
    ? (deliveryFee ?? repairs.find((repair) => parseFloat(repair.deliveryFee || 0) > 0)?.deliveryFee ?? DEFAULT_DELIVERY_FEE)
    : 0;
  const totals = calculateInvoiceTotals(repairSnapshots, normalizedDeliveryFee, 0, 0, 0);

  const invoice = await RepairInvoicesModel.create({
    ...context,
    repairIDs,
    repairSnapshots,
    status: 'draft',
    deliveryMethod,
    deliveryFee: parseFloat(normalizedDeliveryFee || 0),
    shippingFee: 0,
    ...totals,
    closeoutNotes,
    createdBy,
  });

  const nextRepairStatus = deliveryMethod === 'delivery' ? 'DELIVERY BATCHED' : 'READY FOR PICKUP';

  await Promise.all(
    repairIDs.map((repairID) =>
      RepairsModel.updateById(repairID, {
        invoiceID: invoice.invoiceID,
        closeoutStatus: 'batched',
        closeoutBy: createdBy,
        closeoutAt: new Date(),
        status: nextRepairStatus,
        updatedAt: new Date(),
      })
    )
  );

  return invoice;
}

