import { db } from '@/lib/database';
import RepairsModel from '@/app/api/repairs/model';
import RepairInvoicesModel from './model';

const DEFAULT_DELIVERY_FEE = 5;

function normalizeAccountKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function isUsableStoreId(storeId, repair) {
  const value = String(storeId || '').trim();
  if (!value) return false;

  const lower = value.toLowerCase();
  const submittedBy = String(repair.submittedBy || '').trim().toLowerCase();
  const createdBy = String(repair.createdBy || '').trim().toLowerCase();

  return lower !== submittedBy && lower !== createdBy;
}

function getRepairAccountContext(repair) {
  if (repair.isWholesale) {
    const businessName = repair.businessName || repair.storeName || '';
    const businessKey = normalizeAccountKey(businessName);
    const validStoreId = isUsableStoreId(repair.storeId, repair) ? String(repair.storeId).trim() : '';
    const accountID = businessKey
      ? `wholesale-business:${businessKey}`
      : validStoreId
        ? `wholesale-store:${validStoreId}`
        : `wholesale-client:${repair.userID || repair.clientName || repair.repairID}`;

    return {
      accountType: 'wholesale',
      accountID,
      storeId: validStoreId,
      clientID: repair.userID || '',
      customerName: businessName || repair.clientName || '',
    };
  }

  return {
    accountType: 'retail',
    accountID: repair.userID || repair.clientName || repair.clientFirstName || repair.repairID,
    storeId: '',
    clientID: repair.userID || '',
    customerName: repair.clientName || [repair.clientFirstName, repair.clientLastName].filter(Boolean).join(' ') || '',
  };
}

function getRepairChargeSummary(repair) {
  const lineItemSubtotal = [
    ...(repair.tasks || []),
    ...(repair.materials || []),
    ...(repair.customLineItems || []),
  ].reduce((sum, item) => sum + (parseFloat(item.price || 0) * (parseFloat(item.quantity || 1) || 1)), 0);
  const storedSubtotal = parseFloat(repair.subtotal || 0);
  const rushFee = parseFloat(repair.rushFee || 0);
  const taxAmount = parseFloat(repair.taxAmount || 0);
  const repairDeliveryFee = parseFloat(repair.deliveryFee || 0);
  const subtotal = storedSubtotal > 0
    ? storedSubtotal + rushFee
    : lineItemSubtotal + rushFee;
  const calculatedTotal = subtotal + taxAmount + repairDeliveryFee;
  const total = parseFloat(repair.totalCost || 0) > 0
    ? parseFloat(repair.totalCost || 0)
    : calculatedTotal;

  return {
    subtotal,
    taxAmount,
    totalWithoutDelivery: Math.max(total - repairDeliveryFee, 0),
    existingDeliveryFee: repairDeliveryFee,
  };
}

function buildRepairSnapshot(repair) {
  const summary = getRepairChargeSummary(repair);
  return {
    repairID: repair.repairID,
    customerName: repair.clientName || repair.businessName || '',
    status: repair.status,
    subtotal: Math.max(summary.totalWithoutDelivery - summary.taxAmount, 0),
    taxAmount: summary.taxAmount,
    total: summary.totalWithoutDelivery,
  };
}

function calculateInvoiceTotals(repairSnapshots = [], deliveryFee = 0, cashDiscountAmount = 0, amountPaid = 0) {
  const subtotal = repairSnapshots.reduce((sum, item) => sum + parseFloat(item.subtotal || 0), 0);
  const taxAmount = repairSnapshots.reduce((sum, item) => sum + parseFloat(item.taxAmount || 0), 0);
  const grossTotal = subtotal + taxAmount + parseFloat(deliveryFee || 0);
  const normalizedDiscount = Math.max(0, Math.min(parseFloat(cashDiscountAmount || 0), grossTotal));
  const total = Math.max(grossTotal - normalizedDiscount, 0);
  const normalizedAmountPaid = parseFloat(amountPaid || 0);

  return {
    subtotal,
    taxAmount,
    cashDiscountAmount: normalizedDiscount,
    total,
    amountPaid: normalizedAmountPaid,
    ...computePaymentStatus(total, normalizedAmountPaid),
  };
}

function getCashDiscountAmount(grossTotal) {
  const roundedTotal = Math.floor(parseFloat(grossTotal || 0) / 5) * 5;
  return Math.max(parseFloat(grossTotal || 0) - roundedTotal, 0);
}

async function findAppendableInvoice(context, deliveryMethod) {
  const dbInstance = await db.connect();
  return await dbInstance.collection(RepairInvoicesModel.COLLECTION)
    .findOne(
      {
        accountType: context.accountType,
        accountID: context.accountID,
        deliveryMethod,
        status: { $in: ['draft', 'open'] },
        paymentStatus: { $ne: 'paid' },
      },
      { projection: { _id: 0 }, sort: { createdAt: -1 } }
    );
}

async function appendRepairsToInvoice(invoice, repairs, repairSnapshots, createdBy = '') {
  const existingRepairIDs = Array.isArray(invoice.repairIDs) ? invoice.repairIDs : [];
  const nextRepairIDs = [...new Set([...existingRepairIDs, ...repairs.map((repair) => repair.repairID)])];
  const existingSnapshots = Array.isArray(invoice.repairSnapshots) ? invoice.repairSnapshots : [];
  const nextSnapshots = [
    ...existingSnapshots.filter((snapshot) => !repairSnapshots.some((repair) => repair.repairID === snapshot.repairID)),
    ...repairSnapshots,
  ];

  const deliveryFee = parseFloat(invoice.deliveryFee || 0);
  const totals = calculateInvoiceTotals(
    nextSnapshots,
    deliveryFee,
    invoice.cashDiscountApplied ? parseFloat(invoice.cashDiscountAmount || 0) : 0,
    invoice.amountPaid
  );

  const updatedInvoice = await RepairInvoicesModel.updateByInvoiceID(invoice.invoiceID, {
    repairIDs: nextRepairIDs,
    repairSnapshots: nextSnapshots,
    ...totals,
    cashDiscountApplied: invoice.cashDiscountApplied === true,
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

async function ensureRepairsCanBatch(repairs) {
  if (repairs.length === 0) throw new Error('At least one repair is required.');

  const baseContext = getRepairAccountContext(repairs[0]);

  for (const repair of repairs) {
    if (repair.status !== 'COMPLETED') {
      throw new Error(`Repair ${repair.repairID} must be COMPLETED before closeout batching.`);
    }
    if (!Array.isArray(repair.afterPhotos) || repair.afterPhotos.length === 0) {
      throw new Error(`Repair ${repair.repairID} requires at least one after photo before batching.`);
    }
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
  const totals = calculateInvoiceTotals(repairSnapshots, normalizedDeliveryFee);

  const invoice = await RepairInvoicesModel.create({
    ...context,
    repairIDs,
    repairSnapshots,
    status: 'draft',
    deliveryMethod,
    deliveryFee: parseFloat(normalizedDeliveryFee || 0),
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

export function computePaymentStatus(total, amountPaid) {
  const remainingBalance = Math.max(parseFloat(total || 0) - parseFloat(amountPaid || 0), 0);
  if (remainingBalance <= 0) {
    return { paymentStatus: 'paid', remainingBalance: 0 };
  }
  if (parseFloat(amountPaid || 0) > 0) {
    return { paymentStatus: 'partial', remainingBalance };
  }
  return { paymentStatus: 'unpaid', remainingBalance };
}

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

  return invoice;
}

export async function updateInvoiceDelivery(invoiceID, { deliveryMethod = 'pickup', deliveryFee = DEFAULT_DELIVERY_FEE } = {}) {
  const invoice = await RepairInvoicesModel.findByInvoiceID(invoiceID);
  if (invoice.paymentStatus === 'paid') throw new Error('Paid invoices cannot be changed.');

  const nextDeliveryMethod = deliveryMethod === 'delivery' ? 'delivery' : 'pickup';
  const nextDeliveryFee = nextDeliveryMethod === 'delivery' ? parseFloat(deliveryFee || DEFAULT_DELIVERY_FEE) : 0;
  const grossTotal = (invoice.repairSnapshots || []).reduce((sum, item) => sum + parseFloat(item.subtotal || 0) + parseFloat(item.taxAmount || 0), 0) + nextDeliveryFee;
  const discount = invoice.cashDiscountApplied ? getCashDiscountAmount(grossTotal) : 0;
  const totals = calculateInvoiceTotals(invoice.repairSnapshots || [], nextDeliveryFee, discount, invoice.amountPaid);

  const updated = await RepairInvoicesModel.updateByInvoiceID(invoiceID, {
    deliveryMethod: nextDeliveryMethod,
    deliveryFee: nextDeliveryFee,
    cashDiscountAmount: discount,
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

export async function setInvoiceCashDiscount(invoiceID, enabled = true) {
  const invoice = await RepairInvoicesModel.findByInvoiceID(invoiceID);
  if (invoice.paymentStatus === 'paid') throw new Error('Paid invoices cannot be changed.');

  const grossTotal = (invoice.repairSnapshots || []).reduce((sum, item) => sum + parseFloat(item.subtotal || 0) + parseFloat(item.taxAmount || 0), 0)
    + parseFloat(invoice.deliveryFee || 0);
  const discount = enabled ? getCashDiscountAmount(grossTotal) : 0;
  const totals = calculateInvoiceTotals(invoice.repairSnapshots || [], invoice.deliveryFee || 0, discount, invoice.amountPaid);

  return await RepairInvoicesModel.updateByInvoiceID(invoiceID, {
    cashDiscountApplied: Boolean(enabled),
    ...totals,
  });
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

  const remainingGross = remainingSnapshots.reduce((sum, item) => sum + parseFloat(item.subtotal || 0) + parseFloat(item.taxAmount || 0), 0)
    + parseFloat(invoice.deliveryFee || 0);
  const remainingDiscount = invoice.cashDiscountApplied ? getCashDiscountAmount(remainingGross) : 0;
  const remainingTotals = calculateInvoiceTotals(remainingSnapshots, invoice.deliveryFee || 0, remainingDiscount, invoice.amountPaid);

  const updatedOriginal = await RepairInvoicesModel.updateByInvoiceID(invoice.invoiceID, {
    repairIDs: remainingIDs,
    repairSnapshots: remainingSnapshots,
    cashDiscountAmount: remainingDiscount,
    ...remainingTotals,
  });

  const newGross = movingSnapshots.reduce((sum, item) => sum + parseFloat(item.subtotal || 0) + parseFloat(item.taxAmount || 0), 0);
  const newDiscount = invoice.cashDiscountApplied ? getCashDiscountAmount(newGross) : 0;
  const newTotals = calculateInvoiceTotals(movingSnapshots, 0, newDiscount, 0);
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
    cashDiscountApplied: invoice.cashDiscountApplied === true,
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
  const grossTotal = repairSnapshots.reduce((sum, item) => sum + parseFloat(item.subtotal || 0) + parseFloat(item.taxAmount || 0), 0)
    + parseFloat(target.deliveryFee || 0);
  const discount = target.cashDiscountApplied ? getCashDiscountAmount(grossTotal) : 0;
  const totals = calculateInvoiceTotals(repairSnapshots, target.deliveryFee || 0, discount, target.amountPaid);

  const updatedTarget = await RepairInvoicesModel.updateByInvoiceID(target.invoiceID, {
    repairIDs,
    repairSnapshots,
    cashDiscountAmount: discount,
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
    const grossTotal = remainingSnapshots.reduce((sum, item) => sum + parseFloat(item.subtotal || 0) + parseFloat(item.taxAmount || 0), 0)
      + parseFloat(invoice.deliveryFee || 0);
    const discount = invoice.cashDiscountApplied ? getCashDiscountAmount(grossTotal) : 0;
    const totals = calculateInvoiceTotals(remainingSnapshots, invoice.deliveryFee || 0, discount, 0);

    updatedInvoice = await RepairInvoicesModel.updateByInvoiceID(invoice.invoiceID, {
      repairIDs: remainingIDs,
      repairSnapshots: remainingSnapshots,
      cashDiscountAmount: discount,
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
