import { db } from '@/lib/database';
import { v4 as uuidv4 } from 'uuid';
import {
  BUSINESS_EXPENSE_STATUS,
  normalizeBusinessExpenseCategory,
  normalizeBusinessExpenseStatus,
} from '@/services/businessExpenses';
import {
  getNextRecurringOccurrence,
  normalizeRecurringExpenseFrequency,
  normalizeRecurringExpenseTemplate,
  RECURRING_EXPENSE_DEFAULT_STATUS,
} from '@/services/recurringBusinessExpenses';

export default class RecurringBusinessExpensesModel {
  static COLLECTION = 'recurringBusinessExpenses';

  static buildDocument(data = {}) {
    const now = new Date();
    const normalized = normalizeRecurringExpenseTemplate(data);
    const nextOccurrenceDate = normalized.nextOccurrenceDate
      || getNextRecurringOccurrence(normalized, normalized.startDate);

    return {
      recurringExpenseID: data.recurringExpenseID || `rexp-${uuidv4().slice(0, 8)}`,
      vendor: (data.vendor || '').trim(),
      category: normalizeBusinessExpenseCategory(data.category),
      amount: Number(data.amount || 0),
      paymentMethod: data.paymentMethod || 'other',
      isDeductible: data.isDeductible !== false,
      frequency: normalizeRecurringExpenseFrequency(data.frequency),
      dayOfWeek: normalized.dayOfWeek,
      dayOfMonth: normalized.dayOfMonth,
      startDate: normalized.startDate,
      endDate: normalized.endDate,
      statusDefault: normalizeBusinessExpenseStatus(
        data.statusDefault || BUSINESS_EXPENSE_STATUS.SCHEDULED || RECURRING_EXPENSE_DEFAULT_STATUS
      ),
      nextOccurrenceDate,
      lastGeneratedAt: normalized.lastGeneratedAt,
      active: normalized.active,
      notes: data.notes || '',
      createdBy: data.createdBy || '',
      createdAt: data.createdAt ? new Date(data.createdAt) : now,
      updatedAt: now,
    };
  }

  static async create(data) {
    const dbInstance = await db.connect();
    const recurringExpense = this.buildDocument(data);
    await dbInstance.collection(this.COLLECTION).insertOne(recurringExpense);
    return recurringExpense;
  }

  static async list(filter = {}) {
    const dbInstance = await db.connect();
    return await dbInstance.collection(this.COLLECTION)
      .find(filter)
      .project({ _id: 0 })
      .sort({ active: -1, nextOccurrenceDate: 1, vendor: 1 })
      .toArray();
  }

  static async findByRecurringExpenseID(recurringExpenseID) {
    const dbInstance = await db.connect();
    const recurringExpense = await dbInstance.collection(this.COLLECTION).findOne(
      { recurringExpenseID },
      { projection: { _id: 0 } }
    );

    if (!recurringExpense) {
      throw new Error('Recurring expense template not found.');
    }

    return recurringExpense;
  }

  static async updateByRecurringExpenseID(recurringExpenseID, data) {
    const current = await this.findByRecurringExpenseID(recurringExpenseID);
    const next = this.buildDocument({
      ...current,
      ...data,
      recurringExpenseID,
      createdAt: current.createdAt,
      createdBy: current.createdBy,
      lastGeneratedAt: data.lastGeneratedAt ?? current.lastGeneratedAt,
      nextOccurrenceDate: data.nextOccurrenceDate ?? current.nextOccurrenceDate,
    });

    const dbInstance = await db.connect();
    const result = await dbInstance.collection(this.COLLECTION).updateOne(
      { recurringExpenseID },
      { $set: next }
    );

    if (result.matchedCount === 0) {
      throw new Error('Recurring expense template not found.');
    }

    return await this.findByRecurringExpenseID(recurringExpenseID);
  }

  static async deleteByRecurringExpenseID(recurringExpenseID) {
    const dbInstance = await db.connect();
    const result = await dbInstance.collection(this.COLLECTION).deleteOne({ recurringExpenseID });
    if (result.deletedCount === 0) {
      throw new Error('Recurring expense template not found.');
    }
  }
}
