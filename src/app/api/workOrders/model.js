import { db } from '@/lib/database';
import { randomUUID } from 'crypto';
import Constants from '@/lib/constants';
import { DISCIPLINE } from '@/services/workOrders/disciplines';

/** The source that produced a work order. */
export const WORK_ORDER_SOURCE = {
  REPAIR: 'repair',
  PRODUCTION_PIECE: 'production_piece',
  CUSTOM_PIECE: 'custom_piece',
  SALE_SERVICE: 'sale_service',
  CAD_REQUEST: 'cad_request',
};

/**
 * Data access for the source-agnostic Work Order — the unit that lands on a
 * bench and generates labor. See docs/manufacturing/data-model.md.
 */
export default class WorkOrdersModel {
  static COLLECTION = Constants.WORK_ORDERS_COLLECTION;

  static async collection() {
    const dbInstance = await db.connect();
    return dbInstance.collection(this.COLLECTION);
  }

  static async ensureIndexes() {
    const col = await this.collection();
    await Promise.all([
      col.createIndex({ workOrderID: 1 }, { unique: true }),
      col.createIndex({ sourceType: 1, sourceID: 1 }),
      col.createIndex({ assignedToUserID: 1, status: 1 }),
      col.createIndex({ discipline: 1, status: 1 }),
      col.createIndex({ status: 1 }),
    ]);
  }

  static async create(data) {
    const col = await this.collection();
    const now = new Date();
    const workOrder = {
      workOrderID: data.workOrderID || randomUUID(),
      sourceType: data.sourceType,
      sourceID: data.sourceID,
      seq: data.seq ?? 1,
      discipline: data.discipline || DISCIPLINE.BENCH_JEWELRY,
      title: data.title ?? null,
      description: data.description ?? null,
      metalType: data.metalType ?? null,
      karat: data.karat ?? null,
      isRush: !!data.isRush,
      promiseDate: data.promiseDate ?? null,
      status: data.status ?? null,
      assignedJeweler: data.assignedJeweler ?? null,
      assignedToUserID: data.assignedToUserID ?? null,
      claimedAt: data.claimedAt ?? null,
      completedAt: data.completedAt ?? null,
      requiresLaborReview: !!data.requiresLaborReview,
      qcBy: data.qcBy ?? null,
      qcDate: data.qcDate ?? null,
      tasks: Array.isArray(data.tasks) ? data.tasks : [],
      createdAt: now,
      updatedAt: now,
      createdBy: data.createdBy ?? null,
    };
    await col.insertOne(workOrder);
    return workOrder;
  }

  static async findByID(workOrderID) {
    const col = await this.collection();
    return col.findOne({ workOrderID }, { projection: { _id: 0 } });
  }

  static async findBySource(sourceType, sourceID) {
    const col = await this.collection();
    return col
      .find({ sourceType, sourceID }, { projection: { _id: 0 } })
      .sort({ seq: 1 })
      .toArray();
  }

  static async findOneBySource(sourceType, sourceID) {
    const col = await this.collection();
    return col.findOne({ sourceType, sourceID }, { projection: { _id: 0 } });
  }

  static async updateByID(workOrderID, updateData) {
    const col = await this.collection();
    await col.updateOne(
      { workOrderID },
      { $set: { ...updateData, updatedAt: new Date() } }
    );
    return this.findByID(workOrderID);
  }
}
