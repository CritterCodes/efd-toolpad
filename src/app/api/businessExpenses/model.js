import { db } from '@/lib/database';
import { v4 as uuidv4 } from 'uuid';
import {
  BUSINESS_EXPENSE_STATUS,
  normalizeBusinessExpenseCategory,
  normalizeBusinessExpenseStatus,
} from '@/services/businessExpenses';

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
}
