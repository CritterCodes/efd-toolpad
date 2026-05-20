import { db } from '@/lib/database';
import { v4 as uuidv4 } from 'uuid';
import {
  DEBT_PAYMENT_METHODS,
  normalizeMoney,
  parseDebtLocalDateInput,
  splitDebtPaymentAmounts,
} from '@/services/debtAccounts';

function normalizePaymentMethod(method = '') {
  return DEBT_PAYMENT_METHODS.includes(method) ? method : 'other';
}

export default class DebtPaymentsModel {
  static COLLECTION = 'debtPayments';

  static normalizePaymentData(data = {}, account = null, now = new Date()) {
    const { amount, principalAmount, interestAmount, feeAmount } = splitDebtPaymentAmounts(data, account);

    return {
      debtAccountID: data.debtAccountID,
      paymentDate: parseDebtLocalDateInput(data.paymentDate, now),
      amount,
      principalAmount,
      interestAmount,
      feeAmount,
      paymentMethod: normalizePaymentMethod(data.paymentMethod),
      paymentReference: data.paymentReference || '',
      notes: data.notes || '',
    };
  }

  static async create(data = {}, account = null) {
    const dbInstance = await db.connect();
    const now = new Date();
    const normalized = this.normalizePaymentData(data, account, now);
    const payment = {
      debtPaymentID: data.debtPaymentID || `dpay-${uuidv4().slice(0, 8)}`,
      ...normalized,
      createdBy: data.createdBy || '',
      createdAt: now,
      updatedAt: now,
    };

    if (!payment.debtAccountID) throw new Error('Debt account is required.');
    if (!(payment.amount > 0)) throw new Error('Payment amount must be greater than zero.');
    if (payment.principalAmount < 0 || payment.interestAmount < 0 || payment.feeAmount < 0) {
      throw new Error('Payment splits cannot be negative.');
    }
    if (normalizeMoney(payment.principalAmount + payment.interestAmount + payment.feeAmount) > payment.amount) {
      throw new Error('Payment splits cannot exceed total payment amount.');
    }

    await dbInstance.collection(this.COLLECTION).insertOne(payment);
    return payment;
  }

  static async list(filter = {}) {
    const dbInstance = await db.connect();
    return await dbInstance.collection(this.COLLECTION)
      .find(filter)
      .project({ _id: 0 })
      .sort({ paymentDate: -1, createdAt: -1 })
      .toArray();
  }

  static async findByDebtPaymentID(debtPaymentID) {
    const dbInstance = await db.connect();
    const payment = await dbInstance.collection(this.COLLECTION).findOne(
      { debtPaymentID },
      { projection: { _id: 0 } }
    );

    if (!payment) throw new Error('Debt payment not found.');
    return payment;
  }

  static async updateByDebtPaymentID(debtPaymentID, data = {}) {
    const normalized = this.normalizePaymentData(data);
    const update = {
      ...normalized,
      updatedAt: new Date(),
    };

    if (!update.debtAccountID) throw new Error('Debt account is required.');
    if (!(update.amount > 0)) throw new Error('Payment amount must be greater than zero.');
    if (update.principalAmount < 0 || update.interestAmount < 0 || update.feeAmount < 0) {
      throw new Error('Payment splits cannot be negative.');
    }
    if (normalizeMoney(update.principalAmount + update.interestAmount + update.feeAmount) > update.amount) {
      throw new Error('Payment splits cannot exceed total payment amount.');
    }

    const dbInstance = await db.connect();
    const result = await dbInstance.collection(this.COLLECTION).updateOne(
      { debtPaymentID },
      { $set: update }
    );

    if (result.matchedCount === 0) throw new Error('Debt payment not found.');
    return await this.findByDebtPaymentID(debtPaymentID);
  }
}
