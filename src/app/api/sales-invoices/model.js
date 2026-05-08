import { db } from '@/lib/database';
import { v4 as uuidv4 } from 'uuid';

export default class SalesInvoicesModel {
  static COLLECTION = 'salesInvoices';

  static async create(data) {
    const dbInstance = await db.connect();
    const now = new Date();
    const invoice = {
      invoiceID: data.invoiceID || `sinv-${uuidv4().slice(0, 8)}`,
      clientID: data.clientID || '',
      clientName: data.clientName || '',
      clientPhone: data.clientPhone || '',
      clientEmail: data.clientEmail || '',
      lineItems: Array.isArray(data.lineItems) ? data.lineItems : [],
      linkedRepairIDs: Array.isArray(data.linkedRepairIDs) ? data.linkedRepairIDs : [],
      status: data.status || 'draft',
      paymentStatus: data.paymentStatus || 'unpaid',
      subtotal: Number(data.subtotal || 0),
      taxableSubtotal: Number(data.taxableSubtotal || 0),
      taxRate: Number(data.taxRate || 0),
      taxAmount: Number(data.taxAmount || 0),
      grossTotal: Number(data.grossTotal || 0),
      cashDiscountApplied: data.cashDiscountApplied === true,
      cashDiscountAmount: Number(data.cashDiscountAmount || 0),
      total: Number(data.total || 0),
      amountPaid: Number(data.amountPaid || 0),
      remainingBalance: Number(data.remainingBalance ?? data.total ?? 0),
      payments: Array.isArray(data.payments) ? data.payments : [],
      payoutStatus: data.payoutStatus || 'pending_payment',
      payoutEntryIDs: Array.isArray(data.payoutEntryIDs) ? data.payoutEntryIDs : [],
      notes: data.notes || '',
      createdBy: data.createdBy || '',
      createdAt: now,
      updatedAt: now,
      paidAt: data.paidAt || null,
      voidedAt: data.voidedAt || null,
      voidReason: data.voidReason || '',
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
    if (!invoice) throw new Error('Sales invoice not found.');
    return invoice;
  }

  static async updateByInvoiceID(invoiceID, updateData) {
    const dbInstance = await db.connect();
    const result = await dbInstance.collection(this.COLLECTION).updateOne(
      { invoiceID },
      { $set: { ...updateData, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) throw new Error('Sales invoice not found.');
    return await this.findByInvoiceID(invoiceID);
  }
}
