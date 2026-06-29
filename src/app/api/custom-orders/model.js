import { db } from '@/lib/database';
import { randomUUID } from 'crypto';
import Constants from '@/lib/constants';
import { computeQuote, computeMargin } from '@/services/customs/customQuote';
import PiecesModel from '@/app/api/pieces/model';
import SettingsManagerService from '@/app/api/admin/settings/services/settingsManager.service';

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
  // Structured materials (legacy custom-ticket parity).
  centerstone: { item: '', cost: 0 },
  mounting: { item: '', cost: 0 },
  accentStones: [],          // [{ description, quantity, cost }]
  additionalMaterials: [],   // [{ description, quantity, cost }]
  laborTasks: [],            // [{ description, quantity, cost }]
  shippingCosts: [],         // [{ description, cost }]
  isRush: false,
  includeCustomDesign: false,
  // Fees folded into COG.
  castingCost: 0,
  designFee: 0,              // designer CAD fee snapshot (C5)
  glbFee: 0,                 // GLB-creation fee (C6)
  qcReviewFee: 0,            // CAD QC peer-review fee (C6c)
  rushMultiplier: 1,
  // Publish to the client (efd-shop portal — CS).
  quotePublished: false,
  publishedAt: null,
  // Legacy flat fields kept for back-compat (still summed by computeQuote).
  materialCosts: [],
  laborCost: 0,
  shippingCost: 0,
  cogMarkup: 0,              // snapshot of the markup used
  cog: 0,
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
    const quote = await this.normalizeQuote({ ...EMPTY_QUOTE, ...(data.quote || {}) });
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
      // Spec (C1): what the client is commissioning.
      jewelryType: data.jewelryType ?? null,
      metalType: data.metalType ?? null,
      karat: data.karat ?? null,
      goldColor: data.goldColor ?? null,
      size: data.size ?? null,
      gemstones: Array.isArray(data.gemstones) ? data.gemstones : [],
      budget: data.budget ?? null,
      timeline: data.timeline ?? null,
      dueDate: data.dueDate ?? null,
      specialRequests: data.specialRequests ?? '',
      // Collaboration (C1): internal notes, client/internal message threads, moodboard images.
      notes: Array.isArray(data.notes) ? data.notes : [],
      communications: Array.isArray(data.communications) ? data.communications : [],
      images: Array.isArray(data.images) ? data.images : [],
      // Assignments (C5): artisans assigned to roles (cad/bench), with fee snapshots.
      assignments: Array.isArray(data.assignments) ? data.assignments : [],
      designIDs: Array.isArray(data.designIDs) ? data.designIDs : [],
      pieceIDs: Array.isArray(data.pieceIDs) ? data.pieceIDs : [],
      quote,
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
      updateData = { ...updateData, quote: await this.normalizeQuote({ ...existing.quote, ...updateData.quote }) };
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

  /** The markup + tax settings for customs pricing (tolerant of missing admin settings). */
  static async pricingSettings() {
    try {
      const s = await SettingsManagerService.getSettings();
      const cogMarkup = Number(s?.financial?.cogMarkup);
      const rushMultiplier = Number(s?.financial?.rushMultiplier);
      const taxRate = Number(s?.pricing?.taxRate); // sales tax rate (fraction) — same source repairs/sales use
      return {
        cogMarkup: cogMarkup > 0 ? cogMarkup : 2.5,
        rushMultiplier: rushMultiplier > 1 ? rushMultiplier : 1.5,
        taxRate: taxRate >= 0 ? taxRate : 0,
      };
    } catch {
      return { cogMarkup: 2.5, rushMultiplier: 1.5, taxRate: 0 };
    }
  }

  /**
   * Normalize a quote: recompute the single-COG-bucket total using the markup
   * from admin settings, and snapshot cog + cogMarkup + quoteTotal + the sales-tax
   * fields (taxRate/taxAmount/total) onto the quote. quoteTotal stays PRE-tax;
   * `total` is the tax-inclusive amount the customer is billed.
   */
  static async normalizeQuote(quote = {}) {
    const settings = await this.pricingSettings();
    const computed = computeQuote(quote, settings);
    return {
      ...quote,
      cog: computed.cog,
      cogMarkup: computed.cogMarkup,
      quoteTotal: computed.quoteTotal,
      taxRate: computed.taxRate,
      taxAmount: computed.taxAmount,
      total: computed.total,
    };
  }

  /** Link a spawned Design / Piece onto the order (idempotent via $addToSet). */
  static async linkProduction(customID, { designID, pieceID } = {}) {
    const col = await this.collection();
    const add = {};
    if (designID) add.designIDs = designID;
    if (pieceID) add.pieceIDs = pieceID;
    const ops = { $set: { updatedAt: new Date() } };
    if (Object.keys(add).length) ops.$addToSet = add;
    await col.updateOne({ customID }, ops);
    return this.findById(customID);
  }

  /* ---- Collaboration (C1): notes / communications / images ---- */

  /** Append an internal note. type: 'internal' | 'client_visible'. */
  static async addNote(customID, { text, author = null, type = 'internal', tags = [] }) {
    const col = await this.collection();
    const note = {
      id: randomUUID(),
      text: String(text || ''),
      author,
      type: type === 'client_visible' ? 'client_visible' : 'internal',
      tags: Array.isArray(tags) ? tags : [],
      createdAt: new Date(),
    };
    await col.updateOne({ customID }, { $push: { notes: note }, $set: { updatedAt: new Date() } });
    return note;
  }

  static async deleteNote(customID, noteID) {
    const col = await this.collection();
    await col.updateOne({ customID }, { $pull: { notes: { id: noteID } }, $set: { updatedAt: new Date() } });
    return this.findById(customID);
  }

  /** Append a message. thread: 'client' | 'internal'; direction: 'outbound' | 'inbound'. */
  static async addCommunication(customID, { text, author = null, authorUserID = null, thread = 'client', direction = 'outbound' }) {
    const col = await this.collection();
    const message = {
      id: randomUUID(),
      text: String(text || ''),
      author,
      authorUserID, // who sent it — used to award the client-management bonus (C8)
      thread: thread === 'internal' ? 'internal' : 'client',
      direction: direction === 'inbound' ? 'inbound' : 'outbound',
      createdAt: new Date(),
    };
    await col.updateOne({ customID }, { $push: { communications: message }, $set: { updatedAt: new Date() } });
    return message;
  }

  /** Append a moodboard / reference image (url already uploaded to S3). */
  static async addImage(customID, { url, key = null, caption = '', uploadedBy = null }) {
    const col = await this.collection();
    const image = {
      id: randomUUID(),
      url,
      key,
      caption: String(caption || ''),
      uploadedBy,
      uploadedAt: new Date(),
    };
    await col.updateOne({ customID }, { $push: { images: image }, $set: { updatedAt: new Date() } });
    return image;
  }

  static async removeImage(customID, imageID) {
    const col = await this.collection();
    await col.updateOne({ customID }, { $pull: { images: { id: imageID } }, $set: { updatedAt: new Date() } });
    return this.findById(customID);
  }

  /* ---- Assignments (C5): artisans assigned to roles, with fee snapshots ---- */

  static async addAssignment(customID, assignment) {
    const col = await this.collection();
    await col.updateOne({ customID }, { $push: { assignments: assignment }, $set: { updatedAt: new Date() } });
    return assignment;
  }

  static async removeAssignment(customID, assignmentID) {
    const col = await this.collection();
    await col.updateOne({ customID }, { $pull: { assignments: { id: assignmentID } }, $set: { updatedAt: new Date() } });
    return this.findById(customID);
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
