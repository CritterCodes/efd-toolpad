import { db } from '@/lib/database';
import { v4 as uuidv4 } from 'uuid';

export default class RepairInvoicesModel {
  static COLLECTION = 'repairInvoices';

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
