import RepairLaborLogsModel from '@/app/api/repairLaborLogs/model';
import SalePayoutsModel from '@/app/api/salePayouts/model';
import { db } from '@/lib/database';
import { ObjectId } from 'mongodb';
import { roundMoney, toNumber } from './lines';
export async function getActualLaborDeduction(repairIDs = []) {
  if (!Array.isArray(repairIDs) || repairIDs.length === 0) return { amount: 0, complete: true };
  let total = 0;

  for (const repairID of repairIDs) {
    const logs = await RepairLaborLogsModel.findByRepair(repairID);
    if (!logs || logs.length === 0) return { amount: 0, complete: false };
    total += logs.reduce((sum, log) => sum + toNumber(log.creditedValue, 0), 0);
  }

  return { amount: roundMoney(total), complete: true };
}

export async function createPayoutEntries(invoice) {
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
  await Promise.all((invoice.lineItems || [])
    .filter((line) => line.type === 'product' && (line.productID || line.productObjectID))
    .map((line) => {
      const query = line.productObjectID && ObjectId.isValid(line.productObjectID)
        ? { _id: new ObjectId(line.productObjectID) }
        : { productId: line.productID };
      return dbInstance.collection('products').updateOne(query, {
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
    }));
}

