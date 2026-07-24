import { db } from '@/lib/database';
import { randomUUID } from 'crypto';
import Constants from '@/lib/constants';

/**
 * An Artisan Invoice — what an artisan owes EFD for a fulfilled work order or casting
 * (PRODUCTION_RUNS.md §4c). Money flows IN from the artisan (nothing is fronted). Distinct from
 * `customInvoices` (customer receivables) and `salePayouts` (money OUT to artisans). The billed
 * party is `billedUserID`. Unpaid + past `dueAt` = overdue → the artisan FREEZES (no new
 * runs/WOs/listings) until paid. The Stripe hosted invoice is generated via the shared rail.
 */
export const ARTISAN_INVOICE_STATUS = Object.freeze({
  PENDING: 'pending_payment',
  PAID: 'paid',
  VOID: 'void',
});

export const ARTISAN_INVOICE_KIND = Object.freeze({
  WORK_ORDER: 'artisan_wo_invoice',
  CASTING: 'casting_charge',
});

export function validateArtisanInvoice(data = {}) {
  const errors = [];
  if (!data.billedUserID) errors.push('billedUserID is required');
  if (!(Number(data.amount) >= 0)) errors.push('amount must be a non-negative number');
  if (data.kind && !Object.values(ARTISAN_INVOICE_KIND).includes(data.kind)) errors.push('invalid invoice kind');
  return { valid: errors.length === 0, errors };
}

export function buildArtisanInvoice(data = {}) {
  const now = new Date();
  const dueDays = Math.min(90, Math.max(1, Number(data.dueDays) || 14));
  return {
    invoiceID: data.invoiceID || `ainv-${randomUUID().slice(0, 8)}`,
    kind: data.kind || ARTISAN_INVOICE_KIND.WORK_ORDER,
    billedUserID: data.billedUserID ?? null,       // the artisan who owes
    billedEmail: data.billedEmail ?? null,
    sourceType: data.sourceType ?? null,           // 'work_order' | 'casting_batch'
    sourceID: data.sourceID ?? null,               // workOrderID | batchId
    runId: data.runId ?? null,
    amount: Number(data.amount) || 0,              // total owed (incl. markup, excl. tax handled by Stripe Tax)
    breakdown: data.breakdown ?? null,             // { labor, materials, shipping, gems, markupRate }
    description: data.description ?? '',
    status: data.status || ARTISAN_INVOICE_STATUS.PENDING,
    dueDays,
    dueAt: data.dueAt ?? new Date(now.getTime() + dueDays * 24 * 3600 * 1000),
    paidAt: data.paidAt ?? null,
    // Stripe linkage (set by the rail after push).
    stripeInvoiceID: data.stripeInvoiceID ?? null,
    stripeCustomerID: data.stripeCustomerID ?? null,
    checkoutUrl: data.checkoutUrl ?? null,
    createdAt: now,
    updatedAt: now,
    createdBy: data.createdBy ?? null,
  };
}

export default class ArtisanInvoicesModel {
  static COLLECTION = Constants.ARTISAN_INVOICES_COLLECTION;
  static async collection() { return (await db.connect()).collection(this.COLLECTION); }

  static async ensureIndexes() {
    const col = await this.collection();
    await Promise.all([
      col.createIndex({ invoiceID: 1 }, { unique: true }),
      col.createIndex({ billedUserID: 1, status: 1 }),
      col.createIndex({ sourceType: 1, sourceID: 1 }),
      col.createIndex({ stripeInvoiceID: 1 }),
    ]);
  }

  static async create(data) {
    const inv = buildArtisanInvoice(data);
    const validation = validateArtisanInvoice(inv);
    if (!validation.valid) throw new TypeError(validation.errors.join('; '));
    await (await this.collection()).insertOne(inv);
    return inv;
  }

  static async findById(invoiceID) { return (await this.collection()).findOne({ invoiceID }, { projection: { _id: 0 } }); }
  static async list(filter = {}) { return (await this.collection()).find(filter, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray(); }
  static async findOneBySource(sourceType, sourceID) { return (await this.collection()).findOne({ sourceType, sourceID }, { projection: { _id: 0 } }); }

  static async updateById(invoiceID, updateData) {
    await (await this.collection()).updateOne({ invoiceID }, { $set: { ...updateData, updatedAt: new Date() } });
    return this.findById(invoiceID);
  }

  static async setStripe(invoiceID, { stripeInvoiceID, stripeCustomerID, checkoutUrl }) {
    return this.updateById(invoiceID, { stripeInvoiceID, stripeCustomerID, checkoutUrl });
  }

  static async markPaid(invoiceID) {
    return this.updateById(invoiceID, { status: ARTISAN_INVOICE_STATUS.PAID, paidAt: new Date() });
  }

  /** Unpaid invoices for an artisan that are past due — the freeze signal. */
  static async listOverdue(billedUserID, now = new Date()) {
    return (await this.collection())
      .find({ billedUserID, status: ARTISAN_INVOICE_STATUS.PENDING, dueAt: { $lt: now } }, { projection: { _id: 0 } })
      .toArray();
  }
}
