import { describe, expect, it } from 'vitest';
import { buildDebtFoundationReport } from './debtAnalytics';
import { getAnalyticsDateWindow } from './repairAnalytics';
import { splitDebtPaymentAmounts } from './debtAccounts';

describe('debtAnalytics', () => {
  it('uses the latest statement balance and subtracts later principal payments', () => {
    const window = getAnalyticsDateWindow('this_month', new Date('2026-05-20T12:00:00.000Z'));
    const report = buildDebtFoundationReport({
      accounts: [
        {
          debtAccountID: 'debt-card',
          name: 'Business credit card',
          type: 'credit_card',
          active: true,
          openingBalance: 7000,
          openingBalanceDate: '2026-05-01T12:00:00.000Z',
        },
      ],
      statements: [
        {
          debtStatementID: 'stmt-old',
          debtAccountID: 'debt-card',
          statementDate: '2026-05-05T12:00:00.000Z',
          balance: 7000,
          minimumPaymentDue: 100,
          dueDate: '2026-05-25T12:00:00.000Z',
          interestCharged: 20,
          feesCharged: 0,
        },
        {
          debtStatementID: 'stmt-new',
          debtAccountID: 'debt-card',
          statementDate: '2026-05-10T12:00:00.000Z',
          balance: 7100,
          minimumPaymentDue: 125,
          dueDate: '2026-05-18T12:00:00.000Z',
          interestCharged: 30,
          feesCharged: 5,
        },
      ],
      payments: [
        {
          debtPaymentID: 'pay-before',
          debtAccountID: 'debt-card',
          paymentDate: '2026-05-08T12:00:00.000Z',
          amount: 50,
          principalAmount: 50,
          interestAmount: 0,
          feeAmount: 0,
        },
        {
          debtPaymentID: 'pay-after',
          debtAccountID: 'debt-card',
          paymentDate: '2026-05-15T12:00:00.000Z',
          amount: 200,
          principalAmount: 150,
          interestAmount: 40,
          feeAmount: 10,
        },
      ],
      window,
      referenceDate: new Date('2026-05-20T12:00:00.000Z'),
    });

    expect(report.accountRows[0]).toMatchObject({
      currentBalance: 6950,
      minimumPaymentDue: 125,
      upcomingPaymentAmount: 125,
      latestStatementID: 'stmt-new',
    });
    expect(report.summary).toMatchObject({
      totalDebtBalance: 6950,
      upcomingDebtPayments: 125,
      debtPaymentsMade: 250,
      debtPrincipalPaid: 200,
      debtInterestFeesPaid: 50,
      statementInterestFees: 55,
    });
  });

  it('does not subtract the full debt balance from upcoming payments', () => {
    const report = buildDebtFoundationReport({
      accounts: [
        {
          debtAccountID: 'debt-loan',
          name: 'Loan',
          active: true,
          paymentSchedule: 'monthly',
          openingBalance: 10000,
          minimumPayment: 250,
          monthlyDueDay: 10,
        },
      ],
      statements: [],
      payments: [],
      window: getAnalyticsDateWindow('this_month', new Date('2026-05-10T12:00:00.000Z')),
      referenceDate: new Date('2026-05-10T12:00:00.000Z'),
    });

    expect(report.summary.totalDebtBalance).toBe(10000);
    expect(report.summary.upcomingDebtPayments).toBe(250);
  });

  it('counts every weekly payment inside the report window', () => {
    const report = buildDebtFoundationReport({
      accounts: [
        {
          debtAccountID: 'debt-cashapp',
          name: 'Cash App borrow',
          active: true,
          paymentSchedule: 'weekly',
          openingBalance: 400,
          minimumPayment: 71.66,
          nextPaymentDate: '2026-05-08T12:00:00.000Z',
        },
      ],
      statements: [],
      payments: [],
      window: getAnalyticsDateWindow('this_month', new Date('2026-05-31T12:00:00.000Z')),
      referenceDate: new Date('2026-05-09T12:00:00.000Z'),
    });

    expect(report.accountRows[0]).toMatchObject({
      paymentSchedule: 'weekly',
      upcomingPaymentCount: 4,
      upcomingPaymentAmount: 286.64,
    });
    expect(report.summary.upcomingDebtPayments).toBe(286.64);
  });

  it('supports Cash App flat-fee weekly repayment schedules', () => {
    const report = buildDebtFoundationReport({
      accounts: [
        {
          debtAccountID: 'debt-cashapp-flat',
          name: 'Cash App flat fee borrow',
          active: true,
          paymentSchedule: 'cash_app_flat_fee',
          openingBalance: 400,
          flatFeeAmount: 30,
          installmentCount: 6,
          nextPaymentDate: '2026-05-09T12:00:00.000Z',
        },
      ],
      statements: [],
      payments: [],
      window: getAnalyticsDateWindow('this_month', new Date('2026-05-31T12:00:00.000Z')),
      referenceDate: new Date('2026-05-09T12:00:00.000Z'),
    });

    expect(report.accountRows[0]).toMatchObject({
      paymentSchedule: 'cash_app_flat_fee',
      minimumPaymentDue: 71.67,
      upcomingPaymentCount: 4,
      upcomingPaymentAmount: 286.68,
      upcomingPrincipalAmount: 266.68,
      upcomingFeeAmount: 20,
    });
    expect(report.summary).toMatchObject({
      upcomingDebtPayments: 286.68,
      upcomingDebtPrincipal: 266.68,
      upcomingDebtFees: 20,
    });
  });

  it('auto-splits Cash App flat-fee payments into principal and fee', () => {
    const payment = splitDebtPaymentAmounts({
      debtAccountID: 'debt-cashapp-flat',
      paymentDate: '2026-05-15T12:00:00.000Z',
      amount: 71.66,
      principalAmount: null,
      interestAmount: 0,
      feeAmount: 0,
      paymentMethod: 'bank_transfer',
    }, {
      paymentSchedule: 'cash_app_flat_fee',
      openingBalance: 400,
      flatFeeAmount: 30,
    });

    expect(payment).toMatchObject({
      amount: 71.66,
      principalAmount: 66.66,
      interestAmount: 0,
      feeAmount: 5,
    });
  });

  it('shows Cash App payoff balance going down by full payments', () => {
    const report = buildDebtFoundationReport({
      accounts: [
        {
          debtAccountID: 'debt-cashapp-flat',
          name: 'Cash App flat fee borrow',
          active: true,
          paymentSchedule: 'cash_app_flat_fee',
          openingBalance: 400,
          openingBalanceDate: '2026-05-02T12:00:00.000Z',
          flatFeeAmount: 30,
          installmentCount: 6,
          nextPaymentDate: '2026-05-09T12:00:00.000Z',
        },
      ],
      payments: [
        {
          debtPaymentID: 'dpay-1',
          debtAccountID: 'debt-cashapp-flat',
          paymentDate: '2026-05-09T12:00:00.000Z',
          amount: 71.66,
          principalAmount: 66.66,
          interestAmount: 0,
          feeAmount: 5,
        },
      ],
      window: getAnalyticsDateWindow('this_month', new Date('2026-05-31T12:00:00.000Z')),
      referenceDate: new Date('2026-05-10T12:00:00.000Z'),
    });

    expect(report.accountRows[0]).toMatchObject({
      principalRemaining: 333.34,
      feeRemaining: 25,
      payoffBalance: 358.34,
    });
    expect(report.summary).toMatchObject({
      totalDebtBalance: 358.34,
      totalPrincipalRemaining: 333.34,
      totalFeeRemaining: 25,
    });
  });

  it('keeps date-only debt payments and statements inside the intended local month window', () => {
    const report = buildDebtFoundationReport({
      accounts: [
        {
          debtAccountID: 'debt-card',
          name: 'Card',
          active: true,
          paymentSchedule: 'monthly',
          openingBalance: 1000,
          openingBalanceDate: '2026-05-01T00:00:00.000Z',
          minimumPayment: 100,
          monthlyDueDay: 1,
        },
      ],
      statements: [
        {
          debtStatementID: 'stmt-may-first',
          debtAccountID: 'debt-card',
          statementDate: '2026-05-01T00:00:00.000Z',
          balance: 1000,
          minimumPaymentDue: 100,
          dueDate: '2026-05-01T00:00:00.000Z',
          interestCharged: 10,
          feesCharged: 0,
        },
      ],
      payments: [
        {
          debtPaymentID: 'pay-may-first',
          debtAccountID: 'debt-card',
          paymentDate: '2026-05-01T00:00:00.000Z',
          amount: 100,
          principalAmount: 100,
          interestAmount: 0,
          feeAmount: 0,
        },
      ],
      window: getAnalyticsDateWindow('this_month', new Date('2026-05-10T12:00:00.000Z')),
      referenceDate: new Date('2026-05-10T12:00:00.000Z'),
    });

    expect(report.periodPaymentRows.map((row) => row.debtPaymentID)).toEqual(['pay-may-first']);
    expect(report.summary.debtPaymentsMade).toBe(100);
    expect(report.summary.statementInterestFees).toBe(10);
  });

  it('returns empty debt totals when no accounts exist', () => {
    const report = buildDebtFoundationReport();

    expect(report.summary).toMatchObject({
      accountCount: 0,
      totalDebtBalance: 0,
      upcomingDebtPayments: 0,
      debtPaymentsMade: 0,
    });
  });
});
