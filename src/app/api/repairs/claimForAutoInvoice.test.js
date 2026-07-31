import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * The auto-invoice claim (hot fix, 2026-07-31).
 *
 * Since after photos stopped gating invoicing, EVERY closeout confirm raises an invoice — so every
 * confirm is in the read-then-write race that used to catch only the photo-carrying ones. Two staff
 * confirming the same repair from two devices could both read an empty `invoiceID` and both call
 * createRepairInvoice: the same repair billed twice, with an orphan draft invoice holding a priced
 * snapshot of it.
 *
 * These tests pin the FILTER, which is the whole mechanism — if the compare-and-swap conditions drift,
 * the claim silently stops being exclusive and the double-billing comes back with no visible symptom.
 */

const updateOne = vi.fn();
vi.mock('@/lib/database', () => ({
  db: { connect: async () => ({ collection: () => ({ updateOne }) }) },
}));
// Pulled in by the model; irrelevant here.
vi.mock('@/app/api/workOrders/model', () => ({ default: { syncFromRepair: vi.fn() } }));
vi.mock('uuid', () => ({ v4: () => 'test-uuid' }));

const { default: RepairsModel } = await import('./model');

beforeEach(() => {
  updateOne.mockReset();
});

describe('claimForAutoInvoice', () => {
  it('returns true only when it actually won the swap', async () => {
    updateOne.mockResolvedValue({ modifiedCount: 1 });
    await expect(RepairsModel.claimForAutoInvoice('R-1')).resolves.toBe(true);
  });

  it('returns false for the loser — the second device must NOT invoice', async () => {
    updateOne.mockResolvedValue({ modifiedCount: 0 });
    await expect(RepairsModel.claimForAutoInvoice('R-1')).resolves.toBe(false);
  });

  it('keys off modifiedCount, not matchedCount', async () => {
    // A matched-but-unmodified doc means someone else already owns the claim. Reading matchedCount
    // here would hand the claim to BOTH callers, which is precisely the bug being prevented.
    updateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 0 });
    await expect(RepairsModel.claimForAutoInvoice('R-1')).resolves.toBe(false);
  });

  it('demands an unbatched closeout AND an empty invoiceID in one filter', async () => {
    updateOne.mockResolvedValue({ modifiedCount: 1 });
    await RepairsModel.claimForAutoInvoice('R-7');
    const [filter, update] = updateOne.mock.calls[0];

    expect(filter.repairID).toBe('R-7');
    // Both halves must be in the FILTER — moving either into application code reintroduces the race.
    expect(filter.closeoutStatus).toEqual({ $ne: 'batched' });
    expect(filter.$or).toEqual(
      expect.arrayContaining([
        { invoiceID: '' },
        { invoiceID: null },
        { invoiceID: { $exists: false } },
      ])
    );
    // 'batched' is the claim token because a successful invoice sets it anyway, and it's in the
    // repair schema enum — winning the claim never writes a state the repair wasn't about to reach.
    expect(update).toEqual({ $set: { closeoutStatus: 'batched' } });
  });

  it('a repair with an invoiceID cannot be claimed — no filter branch admits a non-empty one', async () => {
    updateOne.mockResolvedValue({ modifiedCount: 1 });
    await RepairsModel.claimForAutoInvoice('R-8');
    const [filter] = updateOne.mock.calls[0];
    const admitsExistingInvoice = filter.$or.some(
      (clause) => clause.invoiceID && typeof clause.invoiceID === 'string' && clause.invoiceID !== ''
    );
    expect(admitsExistingInvoice).toBe(false);
  });
});

describe('appendAfterPhotos', () => {
  it('merges with $addToSet instead of overwriting the array (#48)', async () => {
    updateOne.mockResolvedValue({ matchedCount: 1 });
    await RepairsModel.appendAfterPhotos('R-1', ['a.jpg', 'b.jpg']);
    // Last call is the append; the first is the malformed-field normalize (see below).
    const [filter, update] = updateOne.mock.calls.at(-1);

    expect(filter).toEqual({ repairID: 'R-1' });
    // A $set here is the bug: it discards a photo a concurrent confirm just added.
    expect(update).not.toHaveProperty('$set');
    expect(update).toEqual({ $addToSet: { afterPhotos: { $each: ['a.jpg', 'b.jpg'] } } });
  });

  it('normalizes a malformed afterPhotos first, targeting ONLY non-array values', async () => {
    // $addToSet errors on a field that exists with a non-array type. The old read-modify-write coerced
    // such a value away silently; without this, a malformed field would 500 on every retry and
    // permanently block attaching a photo to that repair — after the upload already hit MinIO.
    updateOne.mockResolvedValue({ matchedCount: 1 });
    await RepairsModel.appendAfterPhotos('R-1', ['a.jpg']);

    expect(updateOne).toHaveBeenCalledTimes(2);
    const [filter, update] = updateOne.mock.calls[0];
    expect(filter).toEqual({ repairID: 'R-1', afterPhotos: { $exists: true, $not: { $type: 'array' } } });
    expect(update).toEqual({ $set: { afterPhotos: [] } });
    // $exists is what keeps this from blanking a healthy doc: a MISSING field must fall through to
    // $addToSet (which creates the array), not be pre-set here.
    expect(filter.afterPhotos.$exists).toBe(true);
  });

  it('is a no-op for an empty, missing or all-falsy list — never an empty write', async () => {
    for (const input of [[], undefined, null, [null, '', undefined]]) {
      updateOne.mockReset();
      await RepairsModel.appendAfterPhotos('R-1', input);
      expect(updateOne).not.toHaveBeenCalled();
    }
  });

  it('accepts a bare string as well as an array', async () => {
    updateOne.mockResolvedValue({ matchedCount: 1 });
    await RepairsModel.appendAfterPhotos('R-1', 'only.jpg');
    expect(updateOne.mock.calls.at(-1)[1]).toEqual({ $addToSet: { afterPhotos: { $each: ['only.jpg'] } } });
  });

  it('drops falsy entries rather than storing them', async () => {
    updateOne.mockResolvedValue({ matchedCount: 1 });
    await RepairsModel.appendAfterPhotos('R-1', ['a.jpg', '', null, 'b.jpg']);
    expect(updateOne.mock.calls.at(-1)[1].$addToSet.afterPhotos.$each).toEqual(['a.jpg', 'b.jpg']);
  });

  it('throws when the repair does not exist', async () => {
    updateOne.mockResolvedValue({ matchedCount: 0 });
    await expect(RepairsModel.appendAfterPhotos('nope', ['a.jpg'])).rejects.toThrow('Repair not found.');
  });
});

describe('releaseAutoInvoiceClaim', () => {
  it('hands the claim back so the billing can be retried', async () => {
    updateOne.mockResolvedValue({ modifiedCount: 1 });
    await RepairsModel.releaseAutoInvoiceClaim('R-2');
    const [filter, update] = updateOne.mock.calls[0];

    expect(filter.repairID).toBe('R-2');
    expect(update).toEqual({ $set: { closeoutStatus: 'in_review' } });
  });

  it('refuses to release a repair whose invoiceID is already written', async () => {
    // NOTE the limit of this guard: it proves nothing about whether an invoice DOCUMENT exists, because
    // createRepairInvoice inserts the invoice before writing repair.invoiceID. Covering that partial
    // failure is the caller's job (the closeout route queries the invoices collection first) — this
    // filter only stops a release from walking back a repair that already points at an invoice.
    updateOne.mockResolvedValue({ modifiedCount: 0 });
    await RepairsModel.releaseAutoInvoiceClaim('R-3');
    const [filter] = updateOne.mock.calls[0];

    expect(filter.closeoutStatus).toBe('batched');
    expect(filter.$or).toEqual(
      expect.arrayContaining([
        { invoiceID: '' },
        { invoiceID: null },
        { invoiceID: { $exists: false } },
      ])
    );
  });
});
