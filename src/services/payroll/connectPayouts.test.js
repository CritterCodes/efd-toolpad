import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/database', () => ({ db: { connect: vi.fn() } }));
vi.mock('@/app/api/repairPayrollBatches/model', () => ({ default: { findByBatchID: vi.fn(), list: vi.fn() } }));
vi.mock('@/app/api/repairs/payroll/service', () => ({ markPayrollBatchPaid: vi.fn() }));
vi.mock('@/lib/notificationService', () => ({ notifyAllAdmins: vi.fn(async () => ({})) }));
vi.mock('@/lib/appUrls', () => ({ adminBase: () => 'http://test' }));

import { payoutEligibility, batchAmount } from './connectPayouts';
import { encodeForm, summarizeAccount, availableUsdCents } from '@/lib/stripeConnect';

const live = { stripeConnect: { accountId: 'acct_1', payoutsEnabled: true } };
const finalized = { batchID: 'b1', status: 'finalized', laborPay: 480.5, salePay: 19.5 };

describe('Connect payout eligibility (pure)', () => {
  it('pays only finalized batches with money, to a live account — connected means paid, there is no switch', () => {
    expect(payoutEligibility({ batch: finalized, user: live })).toEqual({ eligible: true, amount: 500 });
    expect(payoutEligibility({ batch: { ...finalized, status: 'draft' }, user: live }).reason).toMatch(/batch is draft/);
    expect(payoutEligibility({ batch: { ...finalized, status: 'paid' }, user: live }).reason).toMatch(/batch is paid/);
    expect(payoutEligibility({ batch: { ...finalized, laborPay: 0, salePay: 0 }, user: live }).reason).toBe('nothing to pay');
    expect(payoutEligibility({ batch: finalized, user: {} }).reason).toMatch(/no Stripe account/);
    expect(payoutEligibility({ batch: finalized, user: { ...live, stripeConnect: { accountId: 'acct_1', payoutsEnabled: false } } }).reason).toMatch(/onboarding not finished/);
  });

  it('batch amount is labor + sale payouts, to the cent', () => {
    expect(batchAmount({ laborPay: 0.1, salePay: 0.2 })).toBe(0.3);
    expect(batchAmount({ laborPay: 595 })).toBe(595);
  });
});

describe('Stripe REST helpers (pure)', () => {
  it('form-encodes nested objects and arrays the way Stripe expects', () => {
    const q = encodeForm({ type: 'express', capabilities: { transfers: { requested: true } }, metadata: { userID: 'u1' }, skip: undefined });
    expect(q.get('type')).toBe('express');
    expect(q.get('capabilities[transfers][requested]')).toBe('true');
    expect(q.get('metadata[userID]')).toBe('u1');
    expect(q.has('skip')).toBe(false);
  });

  it('summarizes an account into the fields we store', () => {
    const s = summarizeAccount({ id: 'acct_9', details_submitted: true, payouts_enabled: false, capabilities: { transfers: 'pending' }, requirements: { currently_due: ['external_account'], past_due: [], disabled_reason: 'requirements.past_due' }, email: 'a@x.test' });
    expect(s).toEqual({ accountId: 'acct_9', detailsSubmitted: true, payoutsEnabled: false, chargesEnabled: false, transfersActive: false, requirementsDue: ['external_account'], disabledReason: 'requirements.past_due', email: 'a@x.test' });
  });

  it('reads only the available USD balance', () => {
    expect(availableUsdCents({ available: [{ currency: 'usd', amount: 61500 }, { currency: 'eur', amount: 9 }], pending: [{ currency: 'usd', amount: 99999 }] })).toBe(61500);
    expect(availableUsdCents({})).toBe(0);
  });
});
