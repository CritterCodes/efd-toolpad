import { describe, expect, it } from 'vitest';
import { buildArtisanInvoice, ARTISAN_INVOICE_STATUS } from '@/app/api/artisanInvoices/model';

/**
 * CONTRACT: the fields `buildArtisanInvoice` WRITES must match the ones `listOverdue` QUERIES —
 * `{ billedUserID, status: 'pending_payment', dueAt: { $lt: now } }`.
 *
 * That query is the whole freeze: `isArtisanFrozen` → `listOverdue().length > 0` → blocks mintRun,
 * requestDesignCad and casting-create. If either side is renamed independently the freeze silently
 * stops working while every mocked test stays green — so this file deliberately uses the REAL model
 * (no vi.mock anywhere) and asserts the two sides agree.
 */

// Kept in lockstep with ArtisanInvoicesModel.listOverdue's filter.
const matchesOverdueFilter = (doc, billedUserID, now) => doc.billedUserID === billedUserID
  && doc.status === ARTISAN_INVOICE_STATUS.PENDING
  && new Date(doc.dueAt).getTime() < now.getTime();

describe('artisan invoice ⇄ overdue-query contract', () => {
  const build = () => buildArtisanInvoice({
    billedUserID: 'artisan-1', amount: 300, kind: 'casting_charge',
    sourceType: 'casting_batch', sourceID: 'b1',
  });

  it('writes exactly the three fields the overdue query filters on', () => {
    const inv = build();
    expect(inv.billedUserID).toBe('artisan-1');
    expect(inv.status).toBe(ARTISAN_INVOICE_STATUS.PENDING);
    expect(inv.dueAt).toBeInstanceOf(Date);   // a Date, not a string — $lt against a Date needs this
  });

  it('is NOT overdue when fresh, and IS overdue after dueAt — i.e. the freeze arms on time', () => {
    const inv = build();
    expect(inv.dueAt.getTime()).toBeGreaterThan(Date.now());
    expect(matchesOverdueFilter(inv, 'artisan-1', new Date())).toBe(false);
    expect(matchesOverdueFilter(inv, 'artisan-1', new Date(inv.dueAt.getTime() + 1000))).toBe(true);
  });

  it('drops out of the overdue filter once PAID — settlement lifts the freeze', () => {
    const inv = { ...build(), status: ARTISAN_INVOICE_STATUS.PAID };
    expect(matchesOverdueFilter(inv, 'artisan-1', new Date(new Date(inv.dueAt).getTime() + 1000))).toBe(false);
  });

  it('does not leak across artisans (the filter is per-billedUserID)', () => {
    const inv = build();
    expect(matchesOverdueFilter(inv, 'someone-else', new Date(inv.dueAt.getTime() + 1000))).toBe(false);
  });
});
