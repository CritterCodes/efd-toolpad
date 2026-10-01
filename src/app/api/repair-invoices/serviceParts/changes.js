import RepairsModel from '@/app/api/repairs/model';
import { reportPaidInvoiceToMeta } from '@/services/repairs/paidRepairReporting';
import RepairInvoicesModel from '@/app/api/repair-invoices/model';
import { DEFAULT_DELIVERY_FEE, calculateInvoiceTotals, computePaymentStatus } from './totals';
export async function syncPaidRepairs(invoice) {
  if (invoice.paymentStatus !== 'paid') return invoice;

  await Promise.all(
    (invoice.repairIDs || []).map((repairID) =>
      RepairsModel.updateById(repairID, {
        status: 'PAID_CLOSED',
        closeoutStatus: 'paid',
        updatedAt: new Date(),
      })
    )
  );

  // Report the revenue to Meta so ad spend optimises for paying customers.
  // Deliberately NOT awaited — see the note at src/app/api/repairs/route.js
  // about awaited side effects pushing requests past Vercel's limit. A Meta
  // outage must never fail taking a payment.
  reportPaidInvoiceToMeta(invoice).catch((err) =>
    console.error('[meta-capi] report failed (non-fatal):', err.message)
  );

  return invoice;
}

export async function reopenPaidInvoice(invoiceID) {
  const invoice = await RepairInvoicesModel.findByInvoiceID(invoiceID);
  if (invoice.paymentStatus !== 'paid') {
    throw new Error('Only paid invoices can be reopened.');
  }

  const amountPaid = parseFloat(invoice.amountPaid || 0);
  const { paymentStatus, remainingBalance } = computePaymentStatus(invoice.total, amountPaid);
  const nextRepairStatus = invoice.deliveryMethod === 'delivery' ? 'DELIVERY BATCHED' : 'READY FOR PICKUP';

  await Promise.all(
    (invoice.repairIDs || []).map((repairID) =>
      RepairsModel.updateById(repairID, {
        status: nextRepairStatus,
        closeoutStatus: 'batched',
        updatedAt: new Date(),
      })
    )
  );

  return await RepairInvoicesModel.updateByInvoiceID(invoiceID, {
    status: 'open',
    paymentStatus,
    remainingBalance,
    paidAt: null,
  });
}

export async function updateInvoiceDelivery(invoiceID, { deliveryMethod = 'pickup', deliveryFee = DEFAULT_DELIVERY_FEE } = {}) {
  const invoice = await RepairInvoicesModel.findByInvoiceID(invoiceID);
  if (invoice.paymentStatus === 'paid') throw new Error('Paid invoices cannot be changed.');

  const nextDeliveryMethod = deliveryMethod === 'delivery' ? 'delivery' : 'pickup';
  const nextDeliveryFee = nextDeliveryMethod === 'delivery' ? parseFloat(deliveryFee || DEFAULT_DELIVERY_FEE) : 0;
  const totals = calculateInvoiceTotals(invoice.repairSnapshots || [], nextDeliveryFee, 0, invoice.amountPaid, invoice.shippingFee || 0);

  const updated = await RepairInvoicesModel.updateByInvoiceID(invoiceID, {
    deliveryMethod: nextDeliveryMethod,
    deliveryFee: nextDeliveryFee,
    cashDiscountApplied: false,
    ...totals,
  });

  const nextRepairStatus = nextDeliveryMethod === 'delivery' ? 'DELIVERY BATCHED' : 'READY FOR PICKUP';
  await Promise.all(
    (invoice.repairIDs || []).map((repairID) =>
      RepairsModel.updateById(repairID, {
        status: nextRepairStatus,
        updatedAt: new Date(),
      })
    )
  );

  return updated;
}

export async function splitInvoice(invoiceID, repairIDs = []) {
  const invoice = await RepairInvoicesModel.findByInvoiceID(invoiceID);
  if (invoice.paymentStatus === 'paid') throw new Error('Paid invoices cannot be split.');
  if (parseFloat(invoice.amountPaid || 0) > 0) throw new Error('Partially paid invoices cannot be split.');

  const selected = [...new Set((repairIDs || []).filter(Boolean))];
  const currentIDs = Array.isArray(invoice.repairIDs) ? invoice.repairIDs : [];
  if (selected.length === 0) throw new Error('Select at least one repair to split.');
  if (selected.length >= currentIDs.length) throw new Error('Leave at least one repair on the original invoice.');
  if (selected.some((repairID) => !currentIDs.includes(repairID))) {
    throw new Error('Selected repairs must belong to this invoice.');
  }

  const movingSnapshots = (invoice.repairSnapshots || []).filter((snapshot) => selected.includes(snapshot.repairID));
  const remainingSnapshots = (invoice.repairSnapshots || []).filter((snapshot) => !selected.includes(snapshot.repairID));
  const remainingIDs = currentIDs.filter((repairID) => !selected.includes(repairID));

  const remainingTotals = calculateInvoiceTotals(remainingSnapshots, invoice.deliveryFee || 0, 0, invoice.amountPaid, invoice.shippingFee || 0);

  const updatedOriginal = await RepairInvoicesModel.updateByInvoiceID(invoice.invoiceID, {
    repairIDs: remainingIDs,
    repairSnapshots: remainingSnapshots,
    cashDiscountApplied: false,
    ...remainingTotals,
  });

  const newTotals = calculateInvoiceTotals(movingSnapshots, 0, 0, 0);
  const newInvoice = await RepairInvoicesModel.create({
    accountType: invoice.accountType,
    accountID: invoice.accountID,
    storeId: invoice.storeId || '',
    clientID: invoice.clientID || '',
    customerName: invoice.customerName || '',
    repairIDs: selected,
    repairSnapshots: movingSnapshots,
    status: 'draft',
    deliveryMethod: 'pickup',
    deliveryFee: 0,
    cashDiscountApplied: false,
    ...newTotals,
    closeoutNotes: invoice.closeoutNotes || '',
    createdBy: invoice.createdBy || '',
  });

  await Promise.all(
    selected.map((repairID) =>
      RepairsModel.updateById(repairID, {
        invoiceID: newInvoice.invoiceID,
        status: 'READY FOR PICKUP',
        updatedAt: new Date(),
      })
    )
  );

  return { original: updatedOriginal, invoice: newInvoice };
}

export async function mergeInvoices(sourceInvoiceID, targetInvoiceID) {
  if (!targetInvoiceID || sourceInvoiceID === targetInvoiceID) {
    throw new Error('Choose a different target invoice.');
  }

  const source = await RepairInvoicesModel.findByInvoiceID(sourceInvoiceID);
  const target = await RepairInvoicesModel.findByInvoiceID(targetInvoiceID);
  if (source.paymentStatus === 'paid' || target.paymentStatus === 'paid') {
    throw new Error('Paid invoices cannot be merged.');
  }
  if (parseFloat(source.amountPaid || 0) > 0 || parseFloat(target.amountPaid || 0) > 0) {
    throw new Error('Partially paid invoices cannot be merged.');
  }
  if (source.accountType !== target.accountType || source.accountID !== target.accountID) {
    throw new Error('Invoices must belong to the same billing account to merge.');
  }

  const repairIDs = [...new Set([...(target.repairIDs || []), ...(source.repairIDs || [])])];
  const repairSnapshots = [
    ...(target.repairSnapshots || []),
    ...(source.repairSnapshots || []).filter((snapshot) => !(target.repairIDs || []).includes(snapshot.repairID)),
  ];
  const totals = calculateInvoiceTotals(repairSnapshots, target.deliveryFee || 0, 0, target.amountPaid, target.shippingFee || 0);

  const updatedTarget = await RepairInvoicesModel.updateByInvoiceID(target.invoiceID, {
    repairIDs,
    repairSnapshots,
    cashDiscountApplied: false,
    ...totals,
  });

  await RepairInvoicesModel.updateByInvoiceID(source.invoiceID, {
    status: 'void',
    mergedIntoInvoiceID: target.invoiceID,
    repairIDs: [],
    repairSnapshots: [],
    subtotal: 0,
    taxAmount: 0,
    deliveryFee: 0,
    cashDiscountAmount: 0,
    total: 0,
    remainingBalance: 0,
  });

  const nextRepairStatus = target.deliveryMethod === 'delivery' ? 'DELIVERY BATCHED' : 'READY FOR PICKUP';
  await Promise.all(
    (source.repairIDs || []).map((repairID) =>
      RepairsModel.updateById(repairID, {
        invoiceID: target.invoiceID,
        status: nextRepairStatus,
        updatedAt: new Date(),
      })
    )
  );

  return updatedTarget;
}

export async function removeRepairsFromInvoice(invoiceID, repairIDs = []) {
  const invoice = await RepairInvoicesModel.findByInvoiceID(invoiceID);
  if (invoice.paymentStatus === 'paid') throw new Error('Paid invoices cannot be changed.');
  if (parseFloat(invoice.amountPaid || 0) > 0) throw new Error('Partially paid invoices cannot be changed.');

  const selected = [...new Set((repairIDs || []).filter(Boolean))];
  const currentIDs = Array.isArray(invoice.repairIDs) ? invoice.repairIDs : [];
  if (selected.length === 0) throw new Error('Select at least one repair to remove.');
  if (selected.some((repairID) => !currentIDs.includes(repairID))) {
    throw new Error('Selected repairs must belong to this invoice.');
  }

  const remainingIDs = currentIDs.filter((repairID) => !selected.includes(repairID));
  const remainingSnapshots = (invoice.repairSnapshots || []).filter((snapshot) => !selected.includes(snapshot.repairID));

  let updatedInvoice;
  if (remainingIDs.length === 0) {
    updatedInvoice = await RepairInvoicesModel.updateByInvoiceID(invoice.invoiceID, {
      status: 'void',
      repairIDs: [],
      repairSnapshots: [],
      subtotal: 0,
      taxAmount: 0,
      deliveryFee: 0,
      cashDiscountApplied: false,
      cashDiscountAmount: 0,
      total: 0,
      amountPaid: 0,
      remainingBalance: 0,
      paymentStatus: 'unpaid',
      voidReason: 'All repairs removed back to closeout',
    });
  } else {
    const totals = calculateInvoiceTotals(remainingSnapshots, invoice.deliveryFee || 0, 0, 0, invoice.shippingFee || 0);

    updatedInvoice = await RepairInvoicesModel.updateByInvoiceID(invoice.invoiceID, {
      repairIDs: remainingIDs,
      repairSnapshots: remainingSnapshots,
      cashDiscountApplied: false,
      ...totals,
    });
  }

  await Promise.all(
    selected.map((repairID) =>
      RepairsModel.updateById(repairID, {
        invoiceID: '',
        status: 'COMPLETED',
        closeoutStatus: 'in_review',
        updatedAt: new Date(),
      })
    )
  );

  return updatedInvoice;
}

