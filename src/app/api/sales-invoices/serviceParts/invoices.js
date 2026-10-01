import SalesInvoicesModel from '@/app/api/sales-invoices/model';
import RepairsModel from '@/app/api/repairs/model';
import SalePayoutsModel from '@/app/api/salePayouts/model';
import { calculateInvoiceTotals, computePaymentStatus, getSalesSettings, normalizeLineItems, roundMoney, toNumber } from './lines';
import { createPayoutEntries, getActualLaborDeduction, markProductsSold } from './payouts';
export async function listSalesInvoices(filter = {}) {
  return await SalesInvoicesModel.findAll(filter);
}

export async function getSalesInvoice(invoiceID) {
  return await SalesInvoicesModel.findByInvoiceID(invoiceID);
}

export async function createSalesInvoice(data, actor) {
  const settings = await getSalesSettings();
  const lineItems = await normalizeLineItems(data.lineItems || [], settings);
  const totals = calculateInvoiceTotals(lineItems, settings.taxRate, data.amountPaid || 0);

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

