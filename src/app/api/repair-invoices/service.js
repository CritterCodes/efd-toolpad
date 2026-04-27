import { db } from '@/lib/database';
import RepairsModel from '@/app/api/repairs/model';
import RepairInvoicesModel from './model';
import RepairLaborLogsModel from '@/app/api/repairLaborLogs/model';

const DEFAULT_DELIVERY_FEE = 5;

function getRepairAccountContext(repair) {
  if (repair.isWholesale) {
    return {
      accountType: 'wholesale',
      accountID: repair.storeId || repair.submittedBy || repair.createdBy || repair.businessName || '',
      storeId: repair.storeId || repair.submittedBy || repair.createdBy || '',
      clientID: repair.userID || '',
      customerName: repair.businessName || repair.storeName || repair.clientName || '',
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
  const total = parseFloat(repair.totalCost || 0);
  const taxAmount = parseFloat(repair.taxAmount || 0);
  const repairDeliveryFee = parseFloat(repair.deliveryFee || 0);
  const inferredPreDelivery = total - repairDeliveryFee;
  const subtotal = parseFloat(repair.subtotal || 0) > 0
    ? parseFloat(repair.subtotal || 0) + parseFloat(repair.rushFee || 0)
    : Math.max(inferredPreDelivery - taxAmount, 0);

  return {
    subtotal,
    taxAmount,
    totalWithoutDelivery: Math.max(total - repairDeliveryFee, 0),
    existingDeliveryFee: repairDeliveryFee,
  };
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

  const pendingReviews = await Promise.all(
    repairs
      .filter((repair) => repair.requiresLaborReview === true)
      .map(async (repair) => {
        const logs = await RepairLaborLogsModel.findByRepair(repair.repairID);
        return logs.some((log) => log.requiresAdminReview === true && !log.adminReviewedAt)
          ? repair.repairID
          : null;
      })
  );

  const blockedRepairs = pendingReviews.filter(Boolean);
  if (blockedRepairs.length > 0) {
    throw new Error(`Resolve labor review before invoicing: ${blockedRepairs.join(', ')}`);
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
}) {
  const repairs = await Promise.all(repairIDs.map((repairID) => RepairsModel.findById(repairID)));
  const context = await ensureRepairsCanBatch(repairs);

  const repairSnapshots = repairs.map((repair) => {
    const summary = getRepairChargeSummary(repair);
    return {
      repairID: repair.repairID,
      customerName: repair.clientName || repair.businessName || '',
      status: repair.status,
      subtotal: summary.subtotal,
      taxAmount: summary.taxAmount,
      total: summary.totalWithoutDelivery,
    };
  });

  const subtotal = repairSnapshots.reduce((sum, item) => sum + item.subtotal, 0);
  const taxAmount = repairSnapshots.reduce((sum, item) => sum + item.taxAmount, 0);
  const normalizedDeliveryFee = deliveryMethod === 'delivery'
    ? (deliveryFee ?? repairs.find((repair) => parseFloat(repair.deliveryFee || 0) > 0)?.deliveryFee ?? DEFAULT_DELIVERY_FEE)
    : 0;
  const total = subtotal + taxAmount + parseFloat(normalizedDeliveryFee || 0);

  const invoice = await RepairInvoicesModel.create({
    ...context,
    repairIDs,
    repairSnapshots,
    status: 'draft',
    deliveryMethod,
    deliveryFee: parseFloat(normalizedDeliveryFee || 0),
    subtotal,
    taxAmount,
    total,
    amountPaid: 0,
    remainingBalance: total,
    paymentStatus: 'unpaid',
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
