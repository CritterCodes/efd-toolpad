import { db } from '@/lib/database';
import { randomUUID } from 'crypto';
import Constants from '@/lib/constants';
import { computeQuote, computeMargin } from '@/services/customs/customQuote';
import PiecesModel from '@/app/api/pieces/model';

/**
 * NEW customs (S7) — a custom order on the production engine: customer + Design +
 * Piece(s) + billing, with full billing parity. The legacy `customTickets` system is
 * frozen; new customs use this collection. See docs/manufacturing/data-model.md.
 */
export const CUSTOM_ORDER_STATUS = {
  PENDING: 'pending',
  CONSULTATION: 'consultation',
  DESIGN: 'design',
  QUOTE: 'quote',
  DEPOSIT: 'deposit',
  IN_PRODUCTION: 'in_production',
  QC: 'qc',
  COMPLETED: 'completed',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
};

function genCustomID() {
  return `CO-${Date.now().toString(36)}-${randomUUID().slice(0, 6)}`;
}

const EMPTY_QUOTE = {
  materialCosts: [],
  laborCost: 0,
  laborHours: 0,
  castingCost: 0,
  shippingCost: 0,
  designFee: 0,
  rushMultiplier: 1,
  markup: 0.40,
  quoteTotal: 0,
};

export default class CustomOrdersModel {
  static COLLECTION = Constants.CUSTOM_ORDERS_COLLECTION;

  static async collection() {
    const dbInstance = await db.connect();
    return dbInstance.collection(this.COLLECTION);
  }

  static async ensureIndexes() {
    const col = await this.collection();
    await Promise.all([
      col.createIndex({ customID: 1 }, { unique: true }),
      col.createIndex({ clientID: 1 }),
      col.createIndex({ status: 1 }),
      col.createIndex({ createdAt: -1 }),
    ]);
  }

  static async create(data) {
    const col = await this.collection();
    const now = new Date();
    const status = data.status || CUSTOM_ORDER_STATUS.PENDING;
    const order = {
      customID: data.customID || genCustomID(),
      clientID: data.clientID ?? null,
      customerName: data.customerName ?? '',
      customerEmail: data.customerEmail ?? '',
      customerPhone: data.customerPhone ?? '',
      title: data.title ?? '',
      description: data.description ?? '',
      type: data.type || 'custom-design',
      priority: data.priority || 'normal',
      isRush: !!data.isRush,
      status,
      statusHistory: [{ status, changedAt: now, changedBy: data.createdBy ?? null, reason: 'created' }],
      designIDs: Array.isArray(data.designIDs) ? data.designIDs : [],
      pieceIDs: Array.isArray(data.pieceIDs) ? data.pieceIDs : [],
      quote: this.normalizeQuote({ ...EMPTY_QUOTE, ...(data.quote || {}) }),
      billing: data.billing ?? { mode: 'retail' },
      designModel: data.designModel ?? null,
      shareTitle: data.shareTitle ?? null,
      share: data.share ?? null,
      createdAt: now,
      updatedAt: now,
      createdBy: data.createdBy ?? null,
    };
    await col.insertOne(order);
    return order;
  }

  static async findById(customID) {
    const col = await this.collection();
    return col.findOne({ customID }, { projection: { _id: 0 } });
  }

  static async list(filter = {}) {
    const col = await this.collection();
    return col.find(filter, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray();
  }

  /** Update; appends to statusHistory when status changes (parity with legacy). */
  static async updateById(customID, updateData = {}, { changedBy = null, reason = '' } = {}) {
    const col = await this.collection();
    const existing = await this.findById(customID);
    if (!existing) return null;

    // Recompute quoteTotal whenever the quote changes (merge partial onto existing).
    if (updateData.quote) {
      updateData = { ...updateData, quote: this.normalizeQuote({ ...existing.quote, ...updateData.quote }) };
    }

    const set = { ...updateData, updatedAt: new Date() };
    const ops = { $set: set };
    if (updateData.status && updateData.status !== existing.status) {
      ops.$push = {
        statusHistory: { status: updateData.status, changedAt: new Date(), changedBy, reason },
      };
    }
    await col.updateOne({ customID }, ops);
    return this.findById(customID);
  }

  /** Normalize a quote: recompute quoteTotal from inputs (40% markup parity). */
  static normalizeQuote(quote = {}) {
    return { ...quote, quoteTotal: computeQuote(quote).quoteTotal };
  }

  /** Margin = quoteTotal − Σ COGS of linked pieces (real cost incl. bench labor). */
  static async marginFor(customID) {
    const order = await this.findById(customID);
    if (!order) return null;
    const pieces = await Promise.all((order.pieceIDs || []).map((id) => PiecesModel.findById(id)));
    const cogsList = pieces.filter(Boolean).map((p) => p.totalCOGS);
    return computeMargin(order.quote?.quoteTotal || 0, cogsList);
  }
}
