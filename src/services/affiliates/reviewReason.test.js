import { describe, it, expect } from 'vitest';
import { affiliateReviewExplanation, withReviewExplanations } from './reviewReason';

describe('affiliateReviewExplanation (pure)', () => {
  it('names the product the shop still has to cost', () => {
    const r = affiliateReviewExplanation({ status: 'needs_review', basis: { reviewReason: '"Emerald halo ring" has no cost basis recorded' } });
    expect(r.title).toBe('Waiting on the shop to enter a cost for “Emerald halo ring”');
    expect(r.product).toBe('Emerald halo ring');
    expect(r.detail).toMatch(/share of pre-tax PROFIT/);
    expect(r.nextStep).toMatch(/Nothing to do on your side/);
  });
  it('explains an unidentified line and an empty order', () => {
    expect(affiliateReviewExplanation({ status: 'needs_review', basis: { reviewReason: 'a line ("Mystery piece") carries no productId to price from' } }).title).toBe('Waiting on the shop to identify “Mystery piece”');
    expect(affiliateReviewExplanation({ status: 'needs_review', basis: { reviewReason: 'the order has no line items to price' } }).title).toMatch(/no priced lines/);
  });
  it('falls back to a generic explanation when the reason is unknown or missing', () => {
    expect(affiliateReviewExplanation({ status: 'needs_review' }).title).toBe('Waiting on the shop to price this order');
    expect(affiliateReviewExplanation({ status: 'needs_review', reviewReason: 'something new' }).reason).toBe('something new');
  });
  it('is null for anything not waiting on review', () => {
    expect(affiliateReviewExplanation({ status: 'earned' })).toBeNull();
    expect(affiliateReviewExplanation({ status: 'void' })).toBeNull();
    expect(affiliateReviewExplanation(null)).toBeNull();
  });
  it('withReviewExplanations decorates a list without dropping fields', () => {
    const out = withReviewExplanations([{ commissionId: 'c1', status: 'earned', amount: 5 }, { commissionId: 'c2', status: 'needs_review', basis: { reviewReason: '"X" has no cost basis recorded' } }]);
    expect(out[0]).toMatchObject({ commissionId: 'c1', amount: 5, review: null });
    expect(out[1].review.product).toBe('X');
  });
});
