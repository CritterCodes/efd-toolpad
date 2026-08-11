import { db } from '@/lib/database';
import { randomUUID } from 'crypto';

/**
 * Custom-order invoices (S7c) — single-source, keyed by `customID` (cleaner than
 * legacy's embedded-vs-collection dual-write, same behavior). Deposit / progress /
 * final / partial; payment progress is derived from these + the order's quoteTotal.
 */
export const CUSTOM_INVOICE_TYPE = { DEPOSIT: 'deposit', PROGRESS: 'progress', FINAL: 'final', PARTIAL: 'partial' };

/**
 * Does this invoice belong to this order?
 *
 * `customID` is only the PRIMARY order of a combined invoice, so comparing it alone makes the invoice
 * invisible from every other order it covers — sending or printing it from the second order would 404
 * on an invoice that is genuinely theirs. Shared so the three call sites cannot drift.
 */
export function invoiceCovers(invoice, customID) {
  if (!invoice || !customID) return false;
  if (Array.isArray(invoice.customIDs) && invoice.customIDs.length) return invoice.customIDs.includes(customID);
  return invoice.customID === customID;
}
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
      // Multikey (customIDs is an array), so `{ customIDs: 'CO-x' }` matches any combined invoice
      // covering that order. This is a CORRECTNESS lookup, not a convenience: payment progress and the
      // 50%-to-production trigger are derived from it, so a combined invoice that an order cannot find
      // is money the order never sees. Same reasoning as repairInvoices.repairIDs.
      col.createIndex({ customIDs: 1 }, { name: 'customIDs_1' }),
      col.createIndex({ status: 1 }),
    ]);
  }

  static async create(data) {
    const col = await this.collection();
    const now = new Date();
    const invoice = {
      invoiceID: data.invoiceID || `cinv-${randomUUID().slice(0, 8)}`,
      invoiceNumber: data.invoiceNumber || `INV-${data.customID}-${Date.now().toString(36)}`,
      // `customID` remains the PRIMARY order — every existing query, notification and document path
      // keys off it, so it must never become null for a combined invoice.
      customID: data.customID,
      // COMBINED INVOICES: one invoice covering several orders (a client with two bands in; a wedding
      // set booked as two orders). `customIDs` is what lookups match on, and `orderSnapshots` carries
      // the amount billed per order so allocation is explicit rather than inferred — see
      // paymentProgress.amountForOrder for why pro-rata would be wrong.
      customIDs: Array.isArray(data.customIDs) && data.customIDs.length
        ? [...new Set(data.customIDs)]
        : [data.customID],
      orderSnapshots: Array.isArray(data.orderSnapshots) ? data.orderSnapshots : [],
      type: data.type || CUSTOM_INVOICE_TYPE.DEPOSIT,
      amount: Number(data.amount) || 0,
      // Sales-tax rate (fraction) in effect when billed. `amount` is tax-INCLUSIVE; the
      // tax portion = amount × taxRate / (1 + taxRate). Stored so analytics can back out
      // the pass-through tax. Legacy/untaxed invoices have 0.
      taxRate: Number(data.taxRate) || 0,
      description: data.description || '',
      customerEmail: data.customerEmail || '',
      dueDays: Math.max(1, Math.min(90, Number(data.dueDays) || 7)),
      status: CUSTOM_INVOICE_STATUS.PENDING,
      paidAt: null,
      createdAt: now,
      updatedAt: now,
      createdBy: data.createdBy || null,
    };
    await col.insertOne(invoice);
    return invoice;
  }

  /**
   * Every invoice this order appears on, INCLUDING combined invoices where it is not the primary.
   *
   * Matching `customID` alone would silently drop a combined invoice from the non-primary order's
   * ledger: its payment progress would read as unpaid, the 50%-to-production trigger would never fire,
   * and the customer's paid ring would sit waiting for money it had already handed over. Invoices
   * created before combining exist have no `customIDs`, hence the $or.
   */
  static async listByCustom(customID) {
    const col = await this.collection();
    return col
      .find({ $or: [{ customID }, { customIDs: customID }] }, { projection: { _id: 0 } })
      .sort({ createdAt: 1 })
      .toArray();
  }

  static async findById(invoiceID) {
    const col = await this.collection();
    return col.findOne({ invoiceID }, { projection: { _id: 0 } });
  }

  static async updateStatus(invoiceID, status, paymentMethod = null) {
    const col = await this.collection();
    const set = { status, updatedAt: new Date() };
    if (status === CUSTOM_INVOICE_STATUS.PAID) {
      set.paidAt = new Date();
      if (paymentMethod) set.paymentMethod = paymentMethod; // cash | card | stripe | other
    }
    await col.updateOne({ invoiceID }, { $set: set });
    return this.findById(invoiceID);
  }

  /**
   * Record an emailed invoice/receipt and whether it ACTUALLY went out.
   *
   * Stored per kind and never overwritten across kinds, so "we sent the invoice" and "we sent the
   * receipt" are separate facts. `sent: false` plus the reason is recorded deliberately — the whole
   * reason a customer's $5,500 cash receipt went missing unnoticed is that the old notification path
   * recorded every email as delivered whether or not it was.
   */
  static async recordDelivery(invoiceID, { kind, sent, error = null, to = null } = {}) {
    const col = await this.collection();
    const key = kind === 'receipt' ? 'receiptEmail' : 'invoiceEmail';
    await col.updateOne(
      { invoiceID },
      {
        $set: {
          [key]: { sent: Boolean(sent), error: sent ? null : (error || 'unknown error'), to, at: new Date() },
          updatedAt: new Date(),
        },
        $inc: { [`${key}Count`]: 1 },
      },
    );
    return this.findById(invoiceID);
  }

  /** Store the Stripe hosted invoice state and client payment URL. */
  static async setStripeInvoice(invoiceID, stripeInvoice = {}) {
    const col = await this.collection();
    const set = {
      stripeInvoiceID: stripeInvoice.id,
      stripeCustomerID: stripeInvoice.customerID,
      stripeInvoiceNumber: stripeInvoice.number,
      stripeStatus: stripeInvoice.status,
      checkoutUrl: stripeInvoice.hostedInvoiceUrl,
      invoicePdf: stripeInvoice.invoicePdf || null,
      stripeLivemode: Boolean(stripeInvoice.livemode),
      stripeSentAt: new Date(),
      updatedAt: new Date(),
    };
    for (const key of Object.keys(set)) if (set[key] === undefined) delete set[key];
    await col.updateOne(
      { invoiceID },
      { $set: set, $inc: { stripeSendCount: 1 } },
    );
    return this.findById(invoiceID);
  }

  static async updateStripeStatus(invoiceID, stripeStatus) {
    const col = await this.collection();
    await col.updateOne({ invoiceID }, { $set: { stripeStatus, updatedAt: new Date() } });
    return this.findById(invoiceID);
  }
}
