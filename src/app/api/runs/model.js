import { db } from '@/lib/database';
import { randomUUID } from 'crypto';
import Constants from '@/lib/constants';

/**
 * A Production Run — artisan-initiated production of N pieces of a Design, WITHOUT a shop order.
 * See docs/manufacturing/PRODUCTION_RUNS.md §2. The run is bookkeeping + a container: the pieces
 * it mints are the real edition-bearing artifacts (minted transactionally by productionRun.js).
 */
export const RUN_STATUS = {
  PLANNED: 'planned',
  CAD: 'cad',
  CASTING: 'casting',
  BENCH: 'bench',
  QC: 'qc',
  DONE: 'done',
  CANCELLED: 'cancelled',
};

export function validateRun(data = {}) {
  const errors = [];
  if (!data.designID) errors.push('designID is required');
  if (!data.createdBy) errors.push('createdBy is required');
  if (!Array.isArray(data.items) || data.items.length === 0) errors.push('items[] is required');
  for (const it of data.items || []) {
    if (!it || !it.variantId) { errors.push('each item needs a variantId'); break; }
    if (!Number.isInteger(it.qty) || it.qty < 1) { errors.push('each item needs a positive integer qty'); break; }
  }
  if (data.status && !Object.values(RUN_STATUS).includes(data.status)) errors.push('invalid run status');
  return { valid: errors.length === 0, errors };
}

/** Build a run document (pure — no DB). Used by the transactional minter and by create(). */
export function buildRun(data = {}) {
  const now = new Date();
  return {
    runId: data.runId || randomUUID(),
    designID: data.designID ?? null,
    createdBy: data.createdBy ?? null,
    status: data.status || RUN_STATUS.PLANNED,
    items: Array.isArray(data.items) ? data.items.map((it) => ({ variantId: it.variantId, qty: it.qty })) : [],
    pieceIDs: Array.isArray(data.pieceIDs) ? data.pieceIDs : [],
    gemClaims: Array.isArray(data.gemClaims) ? data.gemClaims : [],   // aggregate reservation, for audit
    solo: data.solo !== false,   // default private/self-assigned (§0)
    collaborators: Array.isArray(data.collaborators) ? data.collaborators : [],
    payoutSplit: data.payoutSplit ?? null,   // collab runs: the dual-signed declared split (§4e)
    signatures: Array.isArray(data.signatures) ? data.signatures : [],   // [{ userID, at }] — collab dual-sign
    createdAt: now,
    updatedAt: now,
  };
}

export default class RunsModel {
  static COLLECTION = Constants.RUNS_COLLECTION;

  static async collection() {
    const dbInstance = await db.connect();
    return dbInstance.collection(this.COLLECTION);
  }

  static async ensureIndexes() {
    const col = await this.collection();
    await Promise.all([
      col.createIndex({ runId: 1 }, { unique: true }),
      col.createIndex({ designID: 1 }),
      col.createIndex({ createdBy: 1 }),
      col.createIndex({ status: 1 }),
    ]);
  }

  static async create(data) {
    const col = await this.collection();
    const run = buildRun(data);
    const validation = validateRun(run);
    if (!validation.valid) throw new TypeError(validation.errors.join('; '));
    await col.insertOne(run);
    return run;
  }

  static async findById(runId) {
    const col = await this.collection();
    return col.findOne({ runId }, { projection: { _id: 0 } });
  }

  static async list(filter = {}) {
    const col = await this.collection();
    return col.find(filter, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray();
  }

  static async findByCreator(createdBy) {
    const col = await this.collection();
    return col.find({ createdBy }, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray();
  }

  static async updateById(runId, updateData) {
    const col = await this.collection();
    await col.updateOne({ runId }, { $set: { ...updateData, updatedAt: new Date() } });
    return this.findById(runId);
  }
}
