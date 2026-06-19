import { db } from '@/lib/database';
import { randomUUID } from 'crypto';

/**
 * Custom-order invoices (S7c) — single-source, keyed by `customID` (cleaner than
 * legacy's embedded-vs-collection dual-write, same behavior). Deposit / progress /
 * final / partial; payment progress is derived from these + the order's quoteTotal.
 */
export const CUSTOM_INVOICE_TYPE = { DEPOSIT: 'deposit', PROGRESS: 'progress', FINAL: 'final', PARTIAL: 'partial' };
export const CUSTOM_INVOICE_STATUS = { PENDING: 'pending_payment', PAID: 'paid', CANCELLED: 'cancelled' };

export default class CustomInvoicesModel {
  static COLLECTION = 'customInvoices';

  static async collection() {
    const dbInstance = await db.connect();
    return dbInstance.collection(this.COLLECTION);
  }

  static async ensureIndexes() {
    const col = await this.collection();
    await Promise.all([
      col.createIndex({ invoiceID: 1 }, { unique: true }),
      col.createIndex({ customID: 1 }),
      col.createIndex({ status: 1 }),
    ]);
  }

  static async create(data) {
    const col = await this.collection();
    const now = new Date();
    const invoice = {
      invoiceID: data.invoiceID || `cinv-${randomUUID().slice(0, 8)}`,
      invoiceNumber: data.invoiceNumber || `INV-${data.customID}-${Date.now().toString(36)}`,
      customID: data.customID,
      type: data.type || CUSTOM_INVOICE_TYPE.DEPOSIT,
      amount: Number(data.amount) || 0,
      description: data.description || '',
      customerEmail: data.customerEmail || '',
      status: CUSTOM_INVOICE_STATUS.PENDING,
      paidAt: null,
      createdAt: now,
      updatedAt: now,
      createdBy: data.createdBy || null,
    };
    await col.insertOne(invoice);
    return invoice;
  }

  static async listByCustom(customID) {
    const col = await this.collection();
    return col.find({ customID }, { projection: { _id: 0 } }).sort({ createdAt: 1 }).toArray();
  }

  static async findById(invoiceID) {
    const col = await this.collection();
    return col.findOne({ invoiceID }, { projection: { _id: 0 } });
  }

  static async updateStatus(invoiceID, status) {
    const col = await this.collection();
    const set = { status, updatedAt: new Date() };
    if (status === CUSTOM_INVOICE_STATUS.PAID) set.paidAt = new Date();
    await col.updateOne({ invoiceID }, { $set: set });
    return this.findById(invoiceID);
  }

  /** Store the Stripe Checkout session + payment link on the invoice. */
  static async setCheckout(invoiceID, { sessionID, checkoutUrl }) {
    const col = await this.collection();
    await col.updateOne(
      { invoiceID },
      { $set: { stripeSessionID: sessionID, checkoutUrl, checkoutCreatedAt: new Date(), updatedAt: new Date() } },
    );
    return this.findById(invoiceID);
  }
}
