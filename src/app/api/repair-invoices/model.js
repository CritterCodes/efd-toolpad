import { db } from '@/lib/database';
import { v4 as uuidv4 } from 'uuid';

export default class RepairInvoicesModel {
  static COLLECTION = 'repairInvoices';

  /**
   * `repairIDs` became a correctness-path lookup, not just a convenience: the closeout route asks
   * "does an invoice already exist for this repair?" before handing back the auto-invoice claim
   * (releaseClaimIfUninvoiced), because createRepairInvoice inserts the invoice BEFORE writing
   * repair.invoiceID — so the repair row alone cannot answer it. Unindexed, that query collection-scans.
   *
   * Multikey index (repairIDs is an array of repair ID strings), so `{ repairIDs: 'repair-x' }` matches
   * by element. `invoiceID` is looked up on nearly every invoice operation and is unique by
   * construction, but it is NOT declared unique here — an accidental historical duplicate would make
   * index creation fail and take the whole call down with it.
   *
   * Run via `node scripts/ensure-repair-invoice-indexes.mjs --apply` (nothing in this app calls
   * ensureIndexes at runtime — the other models that define one are decorative).
   */
  static async ensureIndexes() {
    const dbInstance = await db.connect();
    const col = dbInstance.collection(this.COLLECTION);
    await Promise.all([
      col.createIndex({ repairIDs: 1 }, { name: 'repairIDs_1' }),
      col.createIndex({ invoiceID: 1 }, { name: 'invoiceID_1' }),
    ]);
  }

  static async create(data) {
    const dbInstance = await db.connect();
    const now = new Date();
    const invoice = {
      invoiceID: data.invoiceID || `rinv-${uuidv4().slice(0, 8)}`,
      accountType: data.accountType || 'retail',
      accountID: data.accountID || '',
      storeId: data.storeId || '',
      clientID: data.clientID || '',
      customerName: data.customerName || '',
      repairIDs: data.repairIDs || [],
      repairSnapshots: data.repairSnapshots || [],
      status: data.status || 'draft',
      deliveryMethod: data.deliveryMethod || 'pickup',
      deliveryFee: data.deliveryFee ?? 0,
      cashDiscountAmount: data.cashDiscountAmount ?? 0,
      cashDiscountApplied: data.cashDiscountApplied ?? false,
      subtotal: data.subtotal ?? 0,
      taxAmount: data.taxAmount ?? 0,
      total: data.total ?? 0,
      amountPaid: data.amountPaid ?? 0,
      remainingBalance: data.remainingBalance ?? data.total ?? 0,
      paymentStatus: data.paymentStatus || 'unpaid',
      payments: data.payments || [],
      stripePaymentIntentId: data.stripePaymentIntentId || '',
      stripeClientSecret: data.stripeClientSecret || '',
      stripeTerminalPaymentIntentId: data.stripeTerminalPaymentIntentId || '',
      closeoutNotes: data.closeoutNotes || '',
      createdBy: data.createdBy || '',
      createdAt: now,
      updatedAt: now,
      paidAt: data.paidAt || null,
    };

    await dbInstance.collection(this.COLLECTION).insertOne(invoice);
    return invoice;
  }

  static async findAll(filter = {}) {
    const dbInstance = await db.connect();
    return await dbInstance.collection(this.COLLECTION)
      .find(filter)
      .project({ _id: 0 })
      .sort({ createdAt: -1 })
      .toArray();
  }

  static async findByInvoiceID(invoiceID) {
    const dbInstance = await db.connect();
    const invoice = await dbInstance.collection(this.COLLECTION)
      .findOne({ invoiceID }, { projection: { _id: 0 } });
    if (!invoice) throw new Error('Repair invoice not found.');
    return invoice;
  }

  static async updateByInvoiceID(invoiceID, updateData) {
    const dbInstance = await db.connect();
    const result = await dbInstance.collection(this.COLLECTION).updateOne(
      { invoiceID },
      { $set: { ...updateData, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      throw new Error('Repair invoice not found.');
    }

    return await this.findByInvoiceID(invoiceID);
  }
}
