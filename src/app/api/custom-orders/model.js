import { db } from '@/lib/database';
import { randomUUID } from 'crypto';
import Constants from '@/lib/constants';
import { computeQuote, computeMargin, assertMarkupsSane } from '@/services/customs/customQuote';
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
      // Sparse: only grouped orders carry the field, and most never will.
      col.createIndex({ orderGroupId: 1 }, { name: 'orderGroupId_1', sparse: true }),
    ]);
  }

  /* ---- ORDER GROUPS: several orders billed as one ----
   *
   * A client with two pieces in — two wedding bands, or a set booked as an engagement ring plus a band
   * — should get ONE invoice and swipe ONCE. The group is the join.
   *
   * DELIBERATELY INVOICING-ONLY (owner, 2026-08-11). It is not a customer-facing "set" and nothing in
   * production, CAD or reporting knows about it. Each order keeps its own quote, its own pieces and its
   * own work orders, which is what keeps a wedding set correct: one order stays one piece, so the
   * singular quote shape and per-piece work-order attribution are untouched.
   */

  /** Put orders in a group together. Returns the groupId. Same client only. */
  static async groupOrders(customIDs = [], { groupId = null } = {}) {
    const ids = [...new Set((customIDs || []).filter(Boolean))];
    if (ids.length < 2) throw new Error('Grouping needs at least two orders.');

    const col = await this.collection();
    const orders = await col.find({ customID: { $in: ids } }, { projection: { _id: 0, customID: 1, clientID: 1 } }).toArray();
    if (orders.length !== ids.length) throw new Error('One or more of those orders was not found.');

    // A combined invoice is emailed to ONE customer and paid by ONE person. Grouping across clients
    // would bill somebody for a stranger's ring, so this is a hard refusal rather than a warning.
    const clients = [...new Set(orders.map((o) => o.clientID || ''))];
    if (clients.length > 1) throw new Error('Those orders belong to different clients and cannot be billed together.');

    const id = groupId || `cgrp-${randomUUID().slice(0, 8)}`;
    await col.updateMany({ customID: { $in: ids } }, { $set: { orderGroupId: id, updatedAt: new Date() } });
    return id;
  }

  /** Remove orders from their group. Ungrouping the second-to-last also clears the remaining one. */
  static async ungroupOrders(customIDs = []) {
    const ids = [...new Set((customIDs || []).filter(Boolean))];
    if (!ids.length) return 0;
    const col = await this.collection();

    const affected = await col.find({ customID: { $in: ids } }, { projection: { _id: 0, orderGroupId: 1 } }).toArray();
    const groupIds = [...new Set(affected.map((o) => o.orderGroupId).filter(Boolean))];

    const result = await col.updateMany(
      { customID: { $in: ids } },
      { $unset: { orderGroupId: '' }, $set: { updatedAt: new Date() } },
    );

    // A group of one is not a group: leaving it set would offer "bill together" for a single order.
    for (const gid of groupIds) {
      const remaining = await col.find({ orderGroupId: gid }, { projection: { _id: 0, customID: 1 } }).toArray(); // eslint-disable-line no-await-in-loop
      if (remaining.length === 1) {
        await col.updateOne({ customID: remaining[0].customID }, { $unset: { orderGroupId: '' } }); // eslint-disable-line no-await-in-loop
      }
    }
    return result.modifiedCount;
  }

  /** Every order in a group, oldest first. Empty when `groupId` is falsy. */
  static async listByGroup(groupId) {
    if (!groupId) return [];
    const col = await this.collection();
    return col.find({ orderGroupId: groupId }, { projection: { _id: 0 } }).sort({ createdAt: 1 }).toArray();
  }

  /**
   * Orders that COULD be billed with this one: same client, still owing, not cancelled.
   * Used to offer "bill together" without the operator hunting for the other order's number.
   */
  static async groupableWith(customID) {
    const col = await this.collection();
    const order = await col.findOne({ customID }, { projection: { _id: 0, clientID: 1 } });
    if (!order?.clientID) return [];
    return col
      .find(
        { clientID: order.clientID, customID: { $ne: customID }, status: { $nin: ['cancelled', 'delivered'] } },
        { projection: { _id: 0, customID: 1, title: 1, status: 1, orderGroupId: 1, quote: 1, customerName: 1 } },
      )
      .sort({ createdAt: 1 })
      .toArray();
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
      // Centre-stone markup: a significant stone doesn't carry mounting keystone. Deliberately NOT
      // defaulted here — left undefined, computeQuote falls back to cogMarkup, so nothing reprices
      // until this is actually set.
      const centerstoneMarkup = Number(s?.financial?.centerstoneMarkup);
      return {
        cogMarkup: cogMarkup > 0 ? cogMarkup : 2.5,
        centerstoneMarkup: centerstoneMarkup > 0 ? centerstoneMarkup : undefined,
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
    // Guarded HERE, not in the route, because both writers (create and update) come through this one
    // function — a validator on the PUT alone would leave the create path able to store a typo'd markup.
    assertMarkupsSane(quote);
    const settings = await this.pricingSettings();
    const computed = computeQuote(quote, settings);
    return {
      ...quote,
      cog: computed.cog,
      cogMarkup: computed.cogMarkup,
      // Snapshotted like cogMarkup: the price the customer agreed to must stay reconstructable even if
      // the settings default changes later.
      centerstoneMarkup: computed.centerstoneMarkup,
      quoteTotal: computed.quoteTotal,
      taxRate: computed.taxRate,
      taxAmount: computed.taxAmount,
      total: computed.total,
      // The pay-over-time gates ladder with authoritative per-gate revenue — the
      // shop's payment surfaces read this (efd-shop lib/customPayments.js prefers
      // it over deriving from a blended multiplier, which per-line markups broke).
      // Stamped on every save, like the other computed snapshots, so the ladder a
      // customer sees always matches the quote they were priced with.
      gates: computed.gates,
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
