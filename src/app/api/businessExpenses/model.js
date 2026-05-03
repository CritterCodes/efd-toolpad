import { db } from '@/lib/database';
import { v4 as uuidv4 } from 'uuid';
import {
  BUSINESS_EXPENSE_STATUS,
  normalizeBusinessExpenseCategory,
  normalizeBusinessExpenseStatus,
} from '@/services/businessExpenses';
import { RECURRING_EXPENSE_SOURCE_TYPE } from '@/services/recurringBusinessExpenses';

export default class BusinessExpensesModel {
  static COLLECTION = 'businessExpenses';

  static async create(data) {
    const dbInstance = await db.connect();
    const now = new Date();
    const expense = {
      expenseID: data.expenseID || `bexp-${uuidv4().slice(0, 8)}`,
      expenseDate: data.expenseDate ? new Date(data.expenseDate) : now,
      vendor: (data.vendor || '').trim(),
      category: normalizeBusinessExpenseCategory(data.category),
      amount: Number(data.amount || 0),
      paymentMethod: data.paymentMethod || 'other',
      status: normalizeBusinessExpenseStatus(data.status),
      paidAt: data.paidAt
        ? new Date(data.paidAt)
        : (normalizeBusinessExpenseStatus(data.status) === BUSINESS_EXPENSE_STATUS.PAID
            ? (data.expenseDate ? new Date(data.expenseDate) : now)
            : null),
      notes: data.notes || '',
      isDeductible: data.isDeductible !== false,
      sourceType: data.sourceType || RECURRING_EXPENSE_SOURCE_TYPE.MANUAL,
      sourceRecurringExpenseID: data.sourceRecurringExpenseID || '',
      sourceReferenceType: data.sourceReferenceType || '',
      sourceReferenceID: data.sourceReferenceID || '',
      generatedAt: data.generatedAt ? new Date(data.generatedAt) : null,
      createdBy: data.createdBy || '',
      createdAt: now,
      updatedAt: now,
    };

    await dbInstance.collection(this.COLLECTION).insertOne(expense);
    return expense;
  }

  static async list(filter = {}) {
    const dbInstance = await db.connect();
    return await dbInstance.collection(this.COLLECTION)
      .find(filter)
      .project({ _id: 0 })
      .sort({ expenseDate: -1, createdAt: -1 })
      .toArray();
  }

  static async findByExpenseID(expenseID) {
    const dbInstance = await db.connect();
    const expense = await dbInstance.collection(this.COLLECTION).findOne(
      { expenseID },
      { projection: { _id: 0 } }
    );

    if (!expense) {
      throw new Error('Business expense not found.');
    }

    return expense;
  }

  static async updateByExpenseID(expenseID, updateData) {
    const dbInstance = await db.connect();
    const result = await dbInstance.collection(this.COLLECTION).updateOne(
      { expenseID },
      {
        $set: {
          ...updateData,
          category: normalizeBusinessExpenseCategory(updateData.category),
          status: normalizeBusinessExpenseStatus(updateData.status),
          paidAt: updateData.paidAt
            ? new Date(updateData.paidAt)
            : (normalizeBusinessExpenseStatus(updateData.status) === BUSINESS_EXPENSE_STATUS.PAID
                ? (updateData.expenseDate ? new Date(updateData.expenseDate) : undefined)
                : null),
          sourceType: updateData.sourceType ?? undefined,
          sourceRecurringExpenseID: updateData.sourceRecurringExpenseID ?? undefined,
          sourceReferenceType: updateData.sourceReferenceType ?? undefined,
          sourceReferenceID: updateData.sourceReferenceID ?? undefined,
          generatedAt: updateData.generatedAt ? new Date(updateData.generatedAt) : updateData.generatedAt,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      throw new Error('Business expense not found.');
    }

    return await this.findByExpenseID(expenseID);
  }

  static async deleteByExpenseID(expenseID) {
    const dbInstance = await db.connect();
    const result = await dbInstance.collection(this.COLLECTION).deleteOne({ expenseID });

    if (result.deletedCount === 0) {
      throw new Error('Business expense not found.');
    }
  }

  static async findRecurringOccurrence(sourceRecurringExpenseID, expenseDate) {
    const dbInstance = await db.connect();
    return await dbInstance.collection(this.COLLECTION).findOne(
      {
        sourceType: RECURRING_EXPENSE_SOURCE_TYPE.RECURRING,
        sourceRecurringExpenseID,
        expenseDate: new Date(expenseDate),
      },
      { projection: { _id: 0 } }
    );
  }

  static async findBySourceReference(sourceReferenceType, sourceReferenceID) {
    const dbInstance = await db.connect();
    return await dbInstance.collection(this.COLLECTION).findOne(
      {
        sourceReferenceType,
        sourceReferenceID,
      },
      { projection: { _id: 0 } }
    );
  }
}
