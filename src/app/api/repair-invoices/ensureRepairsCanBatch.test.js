import { describe, it, expect } from 'vitest';
import { ensureRepairsCanBatch } from './service';

/**
 * Owner hot fix, 2026-07-31: "i no longer want to require completed photos before invoicing."
 *
 * A missing after photo was stopping finished work from being billed. The requirement lived in THREE
 * places and all three had to go — this is the server-side one, the gate on what may be batched into an
 * invoice at all:
 *   1. here, in ensureRepairsCanBatch (threw on an empty afterPhotos)
 *   2. dashboard/repairs/pick-up's isReadyForInvoice, which made Create Invoice refuse
 *   3. api/repairs/[repairID]/closeout's auto-invoice trigger, which was `nextAfterPhotos.length > 0`
 *      — the deciding one, since the button staff actually press is "Confirm / Move to Invoice"
 *
 * These tests pin (a) that a photo-less repair bills, and (b) that the OTHER preconditions removing it
 * had to leave standing are still standing — the risk of deleting a check from a loop is taking its
 * neighbours with it.
 */

const repair = (over = {}) => ({
  repairID: 'R-1',
  status: 'COMPLETED',
  userID: 'user-1',
  clientName: 'Test Client',
  afterPhotos: [],
  ...over,
});

describe('ensureRepairsCanBatch', () => {
  it('batches a COMPLETED repair with NO after photos — the hot fix', async () => {
    await expect(ensureRepairsCanBatch([repair()])).resolves.toMatchObject({
      accountType: 'retail',
      accountID: 'user-1',
    });
  });

  it('does not care about afterPhotos in any shape', async () => {
    for (const afterPhotos of [[], undefined, null, ['https://example.com/a.jpg']]) {
      await expect(ensureRepairsCanBatch([repair({ afterPhotos })])).resolves.toBeTruthy();
    }
  });

  it('still refuses a repair that is not COMPLETED', async () => {
    await expect(ensureRepairsCanBatch([repair({ status: 'IN_PROGRESS' })]))
      .rejects.toThrow(/must be COMPLETED/);
  });

  it('still refuses a repair already attached to an invoice', async () => {
    // The invoice invariant depends on this: double-attaching would leave one invoice unresolvable.
    await expect(ensureRepairsCanBatch([repair({ invoiceID: 'INV-9' })]))
      .rejects.toThrow(/already attached to invoice INV-9/);
  });

  it('still refuses an empty batch', async () => {
    await expect(ensureRepairsCanBatch([])).rejects.toThrow(/At least one repair/);
  });

  it('still refuses mixing billing accounts in one batch', async () => {
    await expect(ensureRepairsCanBatch([
      repair({ repairID: 'R-1', userID: 'user-1' }),
      repair({ repairID: 'R-2', userID: 'user-2' }),
    ])).rejects.toThrow(/same billing account/);
  });

  it('still refuses mixing retail with wholesale', async () => {
    await expect(ensureRepairsCanBatch([
      repair({ repairID: 'R-1' }),
      repair({ repairID: 'R-2', isWholesale: true, businessName: 'Acme Jewelers' }),
    ])).rejects.toThrow(/same billing account/);
  });

  it('batches multiple photo-less repairs on the same account', async () => {
    await expect(ensureRepairsCanBatch([
      repair({ repairID: 'R-1' }),
      repair({ repairID: 'R-2' }),
      repair({ repairID: 'R-3' }),
    ])).resolves.toMatchObject({ accountID: 'user-1' });
  });
});
