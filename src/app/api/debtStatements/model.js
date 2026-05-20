import { db } from '@/lib/database';
import { v4 as uuidv4 } from 'uuid';
import { normalizeMoney, parseDebtLocalDateInput } from '@/services/debtAccounts';

export default class DebtStatementsModel {
  static COLLECTION = 'debtStatements';

  static async create(data = {}) {
    const dbInstance = await db.connect();
    const now = new Date();
    const statement = {
      debtStatementID: data.debtStatementID || `dstm-${uuidv4().slice(0, 8)}`,
      debtAccountID: data.debtAccountID,
      statementDate: parseDebtLocalDateInput(data.statementDate, now),
      balance: normalizeMoney(data.balance),
      minimumPaymentDue: normalizeMoney(data.minimumPaymentDue),
      dueDate: data.dueDate ? parseDebtLocalDateInput(data.dueDate) : null,
      interestCharged: normalizeMoney(data.interestCharged),
      feesCharged: normalizeMoney(data.feesCharged),
      notes: data.notes || '',
      createdBy: data.createdBy || '',
      createdAt: now,
      updatedAt: now,
    };

    if (!statement.debtAccountID) throw new Error('Debt account is required.');
    if (statement.balance < 0) throw new Error('Statement balance cannot be negative.');
    if (statement.minimumPaymentDue < 0) throw new Error('Minimum payment due cannot be negative.');
    if (statement.interestCharged < 0 || statement.feesCharged < 0) {
      throw new Error('Interest and fees cannot be negative.');
    }

    await dbInstance.collection(this.COLLECTION).insertOne(statement);
    return statement;
  }

  static async list(filter = {}) {
    const dbInstance = await db.connect();
    return await dbInstance.collection(this.COLLECTION)
      .find(filter)
      .project({ _id: 0 })
      .sort({ statementDate: -1, createdAt: -1 })
      .toArray();
  }

  static async findByDebtStatementID(debtStatementID) {
    const dbInstance = await db.connect();
    const statement = await dbInstance.collection(this.COLLECTION).findOne(
      { debtStatementID },
      { projection: { _id: 0 } }
    );

    if (!statement) throw new Error('Debt statement not found.');
    return statement;
  }

  static async updateByDebtStatementID(debtStatementID, data = {}) {
    const update = {
      debtAccountID: data.debtAccountID,
      statementDate: parseDebtLocalDateInput(data.statementDate, new Date()),
      balance: normalizeMoney(data.balance),
      minimumPaymentDue: normalizeMoney(data.minimumPaymentDue),
      dueDate: data.dueDate ? parseDebtLocalDateInput(data.dueDate) : null,
      interestCharged: normalizeMoney(data.interestCharged),
      feesCharged: normalizeMoney(data.feesCharged),
      notes: data.notes || '',
      updatedAt: new Date(),
    };

    if (!update.debtAccountID) throw new Error('Debt account is required.');
    if (update.balance < 0) throw new Error('Statement balance cannot be negative.');
    if (update.minimumPaymentDue < 0) throw new Error('Minimum payment due cannot be negative.');
    if (update.interestCharged < 0 || update.feesCharged < 0) {
      throw new Error('Interest and fees cannot be negative.');
    }

    const dbInstance = await db.connect();
    const result = await dbInstance.collection(this.COLLECTION).updateOne(
      { debtStatementID },
      { $set: update }
    );

    if (result.matchedCount === 0) throw new Error('Debt statement not found.');
    return await this.findByDebtStatementID(debtStatementID);
  }
}
