import { ObjectId } from 'mongodb';
import SalesInvoicesModel from './model';
import SalePayoutsModel from '@/app/api/salePayouts/model';
import RepairLaborLogsModel from '@/app/api/repairLaborLogs/model';
import RepairsModel from '@/app/api/repairs/model';
import { db } from '@/lib/database';
import { deriveRepairItemMetadata } from '@/lib/productRepairMetadata';
import { resolveFee } from '@/services/billing/feeResolver';
import { loadFeeSchedule } from '@/services/billing/feeSchedule';
import { reserveLinkedGemstones } from '@/services/production/gemstoneLifecycle';

const DEFAULT_CONSIGNMENT_RATE = 0.20;

function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function roundMoney(value) {
  return Math.round(toNumber(value) * 100) / 100;
}

function getCashDiscountAmount(grossTotal) {
  const total = toNumber(grossTotal);
  const roundedTotal = Math.floor(total / 5) * 5;
  return roundMoney(Math.max(total - roundedTotal, 0));
}

function computePaymentStatus(total, amountPaid) {
  const remainingBalance = roundMoney(Math.max(toNumber(total) - toNumber(amountPaid), 0));
  if (remainingBalance <= 0) return { paymentStatus: 'paid', remainingBalance: 0 };
  if (toNumber(amountPaid) > 0) return { paymentStatus: 'partial', remainingBalance };
  return { paymentStatus: 'unpaid', remainingBalance };
}

async function getSalesSettings() {
  const dbInstance = await db.connect();
  const settings = await dbInstance.collection('adminSettings').findOne({ _id: 'repair_task_admin_settings' });
  return {
    taxRate: toNumber(settings?.pricing?.taxRate, 0),
    consignmentRate: toNumber(settings?.pricing?.consignmentFeeRate, DEFAULT_CONSIGNMENT_RATE),
    feeSchedule: loadFeeSchedule(settings || {}),
  };
}

function getLineSeller(line, product = null) {
  const seller = product?.seller || {};
  return {
    userID: line.sellerUserID || seller.userId || product?.userId || '',
    name: line.sellerName || seller.displayName || product?.vendor || '',
  };
}

function getProductPrice(product, line) {
  return toNumber(line.unitPrice ?? product?.pricing?.retailPrice ?? product?.price, 0);
}

function getProductImageUrl(product) {
  const image = product?.images?.[0]
    || product?.image
    || product?.featuredImage
    || product?.media?.[0]
    || product?.thumbnail
    || product?.imageUrl
    || product?.primaryImage
    || product?.photos?.[0];

  if (!image) return '';
  if (typeof image === 'string') return image;
  return image.url
    || image.thumbnail
    || image.secureUrl
    || image.src
    || image.previewUrl
    || image.imageUrl
    || image.originalUrl
    || '';
}

async function resolveProduct(line) {
  if (!line.productID) return null;
  const dbInstance = await db.connect();
  const id = String(line.productID);
  const query = ObjectId.isValid(id)
    ? { $or: [{ productId: id }, { _id: new ObjectId(id) }], productType: 'jewelry' }
    : { productId: id, productType: 'jewelry' };
  return await dbInstance.collection('products').findOne(query);
}

function normalizeTask(task) {
  const laborHours = toNumber(task?.pricing?.totalLaborHours ?? task?.laborHours, 0);
  return {
    ...task,
    id: task.id || task.taskID || task._id || `included-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    taskID: task.taskID || task._id || task.id || '',
    title: task.title || task.name || 'Included sale labor',
    quantity: toNumber(task.quantity, 1) || 1,
    price: 0,
    customerPrice: 0,
    includedWithSale: true,
    laborHours,
    pricing: {
      ...(task.pricing || {}),
      totalLaborHours: laborHours,
    },
  };
}

function calculateInvoiceTotals(lineItems, taxRate, cashDiscountApplied = false, amountPaid = 0) {
  const subtotal = roundMoney(lineItems.reduce((sum, line) => sum + toNumber(line.lineTotal), 0));
  const taxableSubtotal = roundMoney(lineItems.filter((line) => line.taxable !== false).reduce((sum, line) => sum + toNumber(line.lineTotal), 0));
  const taxAmount = roundMoney(taxableSubtotal * toNumber(taxRate));
  const grossTotal = roundMoney(subtotal + taxAmount);
  const cashDiscountAmount = cashDiscountApplied ? getCashDiscountAmount(grossTotal) : 0;
  const total = roundMoney(Math.max(grossTotal - cashDiscountAmount, 0));
  return {
    subtotal,
    taxableSubtotal,
    taxAmount,
    grossTotal,
    cashDiscountApplied,
    cashDiscountAmount,
    total,
    amountPaid: roundMoney(amountPaid),
    ...computePaymentStatus(total, amountPaid),
  };
}

async function normalizeLineItems(rawLineItems = [], settings) {
  const normalized = [];

  for (const raw of rawLineItems) {
    const product = raw.type === 'product' ? await resolveProduct(raw) : null;
    if (raw.type === 'product' && !product) throw new Error('Selected product was not found.');

    const seller = getLineSeller(raw, product);
    if (!seller.userID) throw new Error('Every sales line must have an artisan/seller owner.');

    const quantity = Math.max(1, toNumber(raw.quantity, 1));
    const unitPrice = raw.type === 'product' ? getProductPrice(product, raw) : toNumber(raw.unitPrice, 0);
    if (unitPrice <= 0) throw new Error('Every sales line must have a positive price.');

    const lineTotal = roundMoney(unitPrice * quantity);
    // Fee via the services-continuum resolver (S6b). Defaults (EFD holds + ships)
    // resolve to the consignment bundle = the legacy flat rate, so existing sales
    // are unchanged until a line supplies channel/custody/fulfilledBy.
    const custodyAtSale = raw.custodyAtSale || product?.custody || 'consignment';
    const fulfilledBy = raw.fulfilledBy || 'efd';
    const channel = raw.channel || 'in_store';
    const fee = resolveFee({
      lineTotal,
      context: { custody: custodyAtSale, fulfilledBy, channel },
      schedule: settings.feeSchedule,
    });
    const consignmentAmount = fee.efdFee;
    const repairItem = raw.repairItem || product?.repairItem || deriveRepairItemMetadata(product || raw);

    normalized.push({
      lineID: raw.lineID || `line-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: raw.type === 'product' ? 'product' : 'custom',
      productID: product?.productId || raw.productID || '',
      productObjectID: product?._id ? String(product._id) : '',
      title: raw.title || product?.title || 'Custom jewelry item',
      description: raw.description || product?.description || '',
      imageUrl: raw.imageUrl || raw.productImageUrl || getProductImageUrl(product),
      repairItem,
      sellerUserID: seller.userID,
      sellerName: seller.name,
      quantity,
      unitPrice: roundMoney(unitPrice),
      lineTotal,
      taxable: raw.taxable !== false,
      consignmentRate: fee.efdFeeRate,
      consignmentAmount,
      feeMode: fee.mode,
      channel,
      custodyAtSale,
      fulfilledBy,
      estimatedLaborHoldback: 0,
      actualLaborDeduction: 0,
      sellerPayoutEstimate: fee.artisanPayout,
      includedTasks: [],
      repairDraft: null,
      linkedRepairIDs: [],
      payoutEntryID: '',
      payoutStatus: 'pending_payment',
    });
  }

  if (normalized.length === 0) throw new Error('At least one sales line is required.');
  return normalized;
}

async function getActualLaborDeduction(repairIDs = []) {
  if (!Array.isArray(repairIDs) || repairIDs.length === 0) return { amount: 0, complete: true };
  let total = 0;

  for (const repairID of repairIDs) {
    const logs = await RepairLaborLogsModel.findByRepair(repairID);
    if (!logs || logs.length === 0) return { amount: 0, complete: false };
    total += logs.reduce((sum, log) => sum + toNumber(log.creditedValue, 0), 0);
  }

  return { amount: roundMoney(total), complete: true };
}

async function createPayoutEntries(invoice) {
  const payoutEntryIDs = [];
  const nextLines = [];

  for (const line of invoice.lineItems) {
    if (line.payoutEntryID) {
      nextLines.push(line);
      payoutEntryIDs.push(line.payoutEntryID);
      continue;
    }

    const labor = await getActualLaborDeduction(line.linkedRepairIDs);
    const actualLaborDeduction = labor.complete ? labor.amount : 0;
    const payoutAmount = roundMoney(line.lineTotal - line.consignmentAmount - actualLaborDeduction);
    const status = labor.complete ? 'payable' : 'labor_pending';

    const payout = await SalePayoutsModel.create({
      invoiceID: invoice.invoiceID,
      lineID: line.lineID,
      productID: line.productID,
      sellerUserID: line.sellerUserID,
      sellerName: line.sellerName,
      saleDescription: line.title,
      grossSale: line.lineTotal,
      consignmentRate: line.consignmentRate,
      consignmentAmount: line.consignmentAmount,
      estimatedLaborHoldback: line.estimatedLaborHoldback,
      actualLaborDeduction,
      payoutAmount,
      linkedRepairIDs: line.linkedRepairIDs,
      status,
    });

    payoutEntryIDs.push(payout.payoutID);
    nextLines.push({
      ...line,
      actualLaborDeduction,
      sellerPayoutFinal: payoutAmount,
      payoutEntryID: payout.payoutID,
      payoutStatus: status,
    });
  }

  return { payoutEntryIDs, lineItems: nextLines };
}

export async function markProductsSold(invoice) {
  const dbInstance = await db.connect();
  const soldProducts = await Promise.all((invoice.lineItems || [])
    .filter((line) => line.type === 'product' && (line.productID || line.productObjectID))
    .map(async (line) => {
      const query = line.productObjectID && ObjectId.isValid(line.productObjectID)
        ? { _id: new ObjectId(line.productObjectID) }
        : { productId: line.productID };
      const product = await dbInstance.collection('products').findOne(query);
      await dbInstance.collection('products').updateOne(query, {
        $set: {
          status: 'sold',
          soldAt: invoice.paidAt || new Date(),
          salesInvoiceID: invoice.invoiceID,
          soldPrice: line.lineTotal,
          soldToClientID: invoice.clientID,
          soldToClientName: invoice.clientName,
          payoutSnapshot: {
            sellerUserID: line.sellerUserID,
            sellerName: line.sellerName,
            consignmentRate: line.consignmentRate,
            consignmentAmount: line.consignmentAmount,
            estimatedLaborHoldback: line.estimatedLaborHoldback,
            actualLaborDeduction: line.actualLaborDeduction,
            sellerPayout: line.sellerPayoutFinal ?? line.sellerPayoutEstimate,
          },
          updatedAt: new Date(),
        },
      });
      return product;
    }));
  await reserveLinkedGemstones(soldProducts);
}

export async function listSalesInvoices(filter = {}) {
  return await SalesInvoicesModel.findAll(filter);
}

export async function getSalesInvoice(invoiceID) {
  return await SalesInvoicesModel.findByInvoiceID(invoiceID);
}

export async function createSalesInvoice(data, actor) {
  const settings = await getSalesSettings();
  const lineItems = await normalizeLineItems(data.lineItems || [], settings);
  const totals = calculateInvoiceTotals(lineItems, settings.taxRate, data.cashDiscountApplied === true, data.amountPaid || 0);

  let invoice = await SalesInvoicesModel.create({
    clientID: data.clientID,
    clientName: data.clientName,
    clientPhone: data.clientPhone || '',
    clientEmail: data.clientEmail || '',
    lineItems,
    taxRate: settings.taxRate,
    status: totals.paymentStatus === 'paid' ? 'open' : 'draft',
    ...totals,
    notes: data.notes || '',
    createdBy: actor.userID || actor.id || actor.email || '',
    paidAt: totals.paymentStatus === 'paid' ? new Date() : null,
    payments: totals.amountPaid > 0 ? [{
      paymentID: `pay-${Date.now()}`,
      method: data.paymentMethod || 'cash',
      amount: totals.amountPaid,
      collectedAt: new Date(),
      collectedBy: actor.userID || actor.email || '',
    }] : [],
  });

  if (invoice.paymentStatus === 'paid') {
    invoice = await finalizePaidInvoice(invoice);
  }

  return invoice;
}

export async function linkRepairToSalesInvoice(invoiceID, { lineID, repairID } = {}) {
  if (!lineID) throw new Error('Sales invoice line ID is required.');
  if (!repairID) throw new Error('Repair ID is required.');

  const invoice = await SalesInvoicesModel.findByInvoiceID(invoiceID);
  const lineItems = (invoice.lineItems || []).map((line) => {
    if (line.lineID !== lineID) return line;
    const linkedRepairIDs = Array.from(new Set([...(line.linkedRepairIDs || []), repairID]));
    return {
      ...line,
      linkedRepairIDs,
      payoutStatus: invoice.paymentStatus === 'paid' ? 'labor_pending' : line.payoutStatus,
    };
  });

  if (!lineItems.some((line) => line.lineID === lineID)) {
    throw new Error('Sales invoice line was not found.');
  }

  // Stamp the sale reference onto the repair so its work order is tagged as
  // sale-service (S2). RepairsModel.updateById triggers the work-order sync.
  await RepairsModel.updateById(repairID, {
    salesInvoiceID: invoiceID,
    salesLineID: lineID,
    updatedAt: new Date(),
  }).catch((error) => {
    console.error('⚠️ Failed to stamp sale reference on repair:', error.message);
  });

  const linkedRepairIDs = Array.from(new Set([
    ...(invoice.linkedRepairIDs || []),
    repairID,
  ]));

  let updated = await SalesInvoicesModel.updateByInvoiceID(invoiceID, {
    lineItems,
    linkedRepairIDs,
    payoutStatus: invoice.paymentStatus === 'paid' ? 'labor_pending' : invoice.payoutStatus,
  });

  const linkedLine = lineItems.find((line) => line.lineID === lineID);
  if (updated.paymentStatus === 'paid' && linkedLine?.payoutEntryID) {
    await SalePayoutsModel.updateByPayoutID(linkedLine.payoutEntryID, {
      linkedRepairIDs: linkedLine.linkedRepairIDs || [],
      status: 'labor_pending',
    });
    updated = await SalesInvoicesModel.updateByInvoiceID(invoiceID, {
      lineItems: lineItems.map((line) => line.lineID === lineID ? { ...line, payoutStatus: 'labor_pending' } : line),
      payoutStatus: 'labor_pending',
    });
  } else if (updated.paymentStatus === 'paid') {
    updated = await finalizePaidInvoice(updated);
  }

  return updated;
}

export async function updateSalesInvoicePayment(invoiceID, { amount, method = 'cash', collectedBy = '' } = {}) {
  const invoice = await SalesInvoicesModel.findByInvoiceID(invoiceID);
  if (invoice.status === 'void') throw new Error('Void invoices cannot be paid.');

  const paymentAmount = toNumber(amount, invoice.remainingBalance);
  const nextAmountPaid = roundMoney(toNumber(invoice.amountPaid) + paymentAmount);
  const status = computePaymentStatus(invoice.total, nextAmountPaid);
  const payments = [
    ...(invoice.payments || []),
    {
      paymentID: `pay-${Date.now()}`,
      method,
      amount: roundMoney(paymentAmount),
      collectedAt: new Date(),
      collectedBy,
    },
  ];

  let updated = await SalesInvoicesModel.updateByInvoiceID(invoiceID, {
    amountPaid: nextAmountPaid,
    ...status,
    payments,
    status: status.paymentStatus === 'paid' ? 'open' : invoice.status,
    paidAt: status.paymentStatus === 'paid' ? new Date() : invoice.paidAt,
  });

  if (updated.paymentStatus === 'paid') {
    updated = await finalizePaidInvoice(updated);
  }

  return updated;
}

export async function updateSalesInvoicePaymentMethod(invoiceID, { paymentID, method } = {}) {
  if (!paymentID) throw new Error('Payment ID is required.');
  if (!method) throw new Error('Payment method is required.');

  const invoice = await SalesInvoicesModel.findByInvoiceID(invoiceID);
  if (invoice.status === 'void') throw new Error('Void invoices cannot be changed.');

  const payments = (invoice.payments || []).map((payment) => (
    payment.paymentID === paymentID ? { ...payment, method } : payment
  ));

  if (!payments.some((payment) => payment.paymentID === paymentID)) {
    throw new Error('Payment record was not found.');
  }

  return await SalesInvoicesModel.updateByInvoiceID(invoiceID, { payments });
}

export async function setSalesInvoiceCashDiscount(invoiceID, enabled = true) {
  const invoice = await SalesInvoicesModel.findByInvoiceID(invoiceID);
  if (invoice.paymentStatus === 'paid') throw new Error('Paid invoices cannot be changed.');

  const totals = calculateInvoiceTotals(invoice.lineItems, invoice.taxRate, enabled, invoice.amountPaid);
  return await SalesInvoicesModel.updateByInvoiceID(invoiceID, totals);
}

export async function voidSalesInvoice(invoiceID, reason = '') {
  const invoice = await SalesInvoicesModel.findByInvoiceID(invoiceID);
  if ((invoice.payoutEntryIDs || []).length > 0) {
    const payouts = await SalePayoutsModel.findByInvoiceID(invoiceID);
    await Promise.all(payouts.map((payout) => {
      if (payout.payrollStatus === 'paid') {
        return SalePayoutsModel.updateByPayoutID(payout.payoutID, { status: 'review_required' });
      }
      return SalePayoutsModel.updateByPayoutID(payout.payoutID, { status: 'void' });
    }));
  }
  return await SalesInvoicesModel.updateByInvoiceID(invoiceID, {
    status: 'void',
    voidedAt: new Date(),
    voidReason: reason,
    payoutStatus: 'void',
  });
}

export async function finalizePaidInvoice(invoice) {
  const payout = await createPayoutEntries(invoice);
  const updated = await SalesInvoicesModel.updateByInvoiceID(invoice.invoiceID, {
    lineItems: payout.lineItems,
    payoutEntryIDs: payout.payoutEntryIDs,
    payoutStatus: payout.lineItems.some((line) => line.payoutStatus === 'labor_pending') ? 'labor_pending' : 'payable',
  });
  await markProductsSold(updated);
  return updated;
}

export async function syncSalesPayoutDeductions() {
  const invoices = await SalesInvoicesModel.findAll({
    paymentStatus: 'paid',
    payoutStatus: 'labor_pending',
    status: { $ne: 'void' },
  });

  for (const invoice of invoices) {
    const payouts = await SalePayoutsModel.findByInvoiceID(invoice.invoiceID);
    const payoutByLine = new Map(payouts.map((payout) => [payout.lineID, payout]));
    let allPayable = true;
    const lineItems = [];

    for (const line of invoice.lineItems || []) {
      const payout = payoutByLine.get(line.lineID);
      if (!payout || payout.status !== 'labor_pending') {
        lineItems.push(line);
        if (line.payoutStatus === 'labor_pending') allPayable = false;
        continue;
      }

      const labor = await getActualLaborDeduction(line.linkedRepairIDs);
      if (!labor.complete) {
        allPayable = false;
        lineItems.push(line);
        continue;
      }

      const payoutAmount = roundMoney(line.lineTotal - line.consignmentAmount - labor.amount);
      await SalePayoutsModel.updateByPayoutID(payout.payoutID, {
        actualLaborDeduction: labor.amount,
        payoutAmount,
        status: 'payable',
      });
      lineItems.push({
        ...line,
        actualLaborDeduction: labor.amount,
        sellerPayoutFinal: payoutAmount,
        payoutStatus: 'payable',
      });
    }

    await SalesInvoicesModel.updateByInvoiceID(invoice.invoiceID, {
      lineItems,
      payoutStatus: allPayable ? 'payable' : 'labor_pending',
    });
  }
}
