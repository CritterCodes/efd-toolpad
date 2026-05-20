import { db } from '@/lib/database';
import { v4 as uuidv4 } from 'uuid';
import {
  normalizeDebtAccountStatus,
  normalizeDebtAccountType,
  normalizeDebtPaymentSchedule,
  normalizeMoney,
  parseDebtLocalDateInput,
} from '@/services/debtAccounts';

export default class DebtAccountsModel {
  static COLLECTION = 'debtAccounts';

  static async create(data = {}) {
    const dbInstance = await db.connect();
    const now = new Date();
    const account = {
      debtAccountID: data.debtAccountID || `debt-${uuidv4().slice(0, 8)}`,
      name: String(data.name || '').trim(),
      type: normalizeDebtAccountType(data.type),
      lender: String(data.lender || '').trim(),
      active: normalizeDebtAccountStatus(data.active),
      openingBalance: normalizeMoney(data.openingBalance),
      openingBalanceDate: parseDebtLocalDateInput(data.openingBalanceDate, now),
      minimumPayment: normalizeMoney(data.minimumPayment),
      interestRateAPR: data.interestRateAPR === '' || data.interestRateAPR == null ? null : Number(data.interestRateAPR),
      paymentSchedule: normalizeDebtPaymentSchedule(data.paymentSchedule),
      monthlyDueDay: data.monthlyDueDay || data.dueDay ? Number(data.monthlyDueDay || data.dueDay) : null,
      nextPaymentDate: data.nextPaymentDate || data.nextDueDate ? parseDebtLocalDateInput(data.nextPaymentDate || data.nextDueDate) : null,
      flatFeeAmount: normalizeMoney(data.flatFeeAmount),
      installmentCount: data.installmentCount ? Number(data.installmentCount) : null,
      dueDay: data.monthlyDueDay || data.dueDay ? Number(data.monthlyDueDay || data.dueDay) : null,
      nextDueDate: data.nextPaymentDate || data.nextDueDate ? parseDebtLocalDateInput(data.nextPaymentDate || data.nextDueDate) : null,
      notes: data.notes || '',
      createdBy: data.createdBy || '',
      createdAt: now,
      updatedAt: now,
    };

    if (!account.name) throw new Error('Debt account name is required.');
    if (account.openingBalance < 0) throw new Error('Opening balance cannot be negative.');
    if (account.minimumPayment < 0) throw new Error('Minimum payment cannot be negative.');
    if (account.interestRateAPR != null && account.interestRateAPR < 0) throw new Error('APR cannot be negative.');
    if (account.monthlyDueDay && (account.monthlyDueDay < 1 || account.monthlyDueDay > 31)) {
      throw new Error('Monthly due day must be between 1 and 31.');
    }
    if (account.flatFeeAmount < 0) throw new Error('Flat fee cannot be negative.');
    if (account.installmentCount && account.installmentCount < 1) {
      throw new Error('Installment count must be greater than zero.');
    }

    await dbInstance.collection(this.COLLECTION).insertOne(account);
    return account;
  }

  static async list(filter = {}) {
    const dbInstance = await db.connect();
    return await dbInstance.collection(this.COLLECTION)
      .find(filter)
      .project({ _id: 0 })
      .sort({ active: -1, name: 1 })
      .toArray();
  }

  static async findByDebtAccountID(debtAccountID) {
    const dbInstance = await db.connect();
    const account = await dbInstance.collection(this.COLLECTION).findOne(
      { debtAccountID },
      { projection: { _id: 0 } }
    );

    if (!account) throw new Error('Debt account not found.');
    return account;
  }

  static async updateByDebtAccountID(debtAccountID, data = {}) {
    const update = {
      name: String(data.name || '').trim(),
      type: normalizeDebtAccountType(data.type),
      lender: String(data.lender || '').trim(),
      active: normalizeDebtAccountStatus(data.active),
      openingBalance: normalizeMoney(data.openingBalance),
      openingBalanceDate: parseDebtLocalDateInput(data.openingBalanceDate, new Date()),
      minimumPayment: normalizeMoney(data.minimumPayment),
      interestRateAPR: data.interestRateAPR === '' || data.interestRateAPR == null ? null : Number(data.interestRateAPR),
      paymentSchedule: normalizeDebtPaymentSchedule(data.paymentSchedule),
      monthlyDueDay: data.monthlyDueDay || data.dueDay ? Number(data.monthlyDueDay || data.dueDay) : null,
      nextPaymentDate: data.nextPaymentDate || data.nextDueDate ? parseDebtLocalDateInput(data.nextPaymentDate || data.nextDueDate) : null,
      flatFeeAmount: normalizeMoney(data.flatFeeAmount),
      installmentCount: data.installmentCount ? Number(data.installmentCount) : null,
      dueDay: data.monthlyDueDay || data.dueDay ? Number(data.monthlyDueDay || data.dueDay) : null,
      nextDueDate: data.nextPaymentDate || data.nextDueDate ? parseDebtLocalDateInput(data.nextPaymentDate || data.nextDueDate) : null,
      notes: data.notes || '',
      updatedAt: new Date(),
    };

    if (!update.name) throw new Error('Debt account name is required.');
    if (update.openingBalance < 0) throw new Error('Opening balance cannot be negative.');
    if (update.minimumPayment < 0) throw new Error('Minimum payment cannot be negative.');
    if (update.interestRateAPR != null && update.interestRateAPR < 0) throw new Error('APR cannot be negative.');
    if (update.monthlyDueDay && (update.monthlyDueDay < 1 || update.monthlyDueDay > 31)) {
      throw new Error('Monthly due day must be between 1 and 31.');
    }
    if (update.flatFeeAmount < 0) throw new Error('Flat fee cannot be negative.');
    if (update.installmentCount && update.installmentCount < 1) {
      throw new Error('Installment count must be greater than zero.');
    }

    const dbInstance = await db.connect();
    const result = await dbInstance.collection(this.COLLECTION).updateOne(
      { debtAccountID },
      { $set: update }
    );

    if (result.matchedCount === 0) throw new Error('Debt account not found.');
    return await this.findByDebtAccountID(debtAccountID);
  }
}
