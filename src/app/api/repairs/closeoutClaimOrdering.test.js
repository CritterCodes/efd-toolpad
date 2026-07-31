import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * INTEGRATION guard for the auto-invoice claim, written because the unit tests could not see the bug
 * that mattered.
 *
 * The first cut of the claim was defeated by the closeout route itself: the route wrote
 * `closeoutStatus: 'in_review'` in its main $set and only claimed afterwards. Two concurrent requests
 * therefore BOTH won —
 *   A updateById → 'in_review'; A claim → 'batched' (A wins)
 *   B updateById → 'in_review'  ← clobbers A's token
 *   B claim → matches again → 'batched' (B wins too)
 * — and the repair got billed twice. Every filter-shape unit test passed green throughout, because the
 * defect was in the ORDER of writes and in which fields the route touches, not in the swap itself.
 *
 * So these tests assert the two properties that make the token durable:
 *   1. the claim is the FIRST write of the request
 *   2. no later write in the request touches `closeoutStatus`
 * Either one regressing reopens the double-billing hole silently.
 */

const claimForAutoInvoice = vi.fn();
const releaseAutoInvoiceClaim = vi.fn();
const updateById = vi.fn();
const findById = vi.fn();
const createRepairInvoice = vi.fn();
const invoicesFindAll = vi.fn();

// Records the interleaving of model writes so ordering can be asserted, not assumed.
const callLog = [];

// Alias path, NOT the route's own '../../model' specifier — vi.mock resolves relative to THIS file, so
// a relative copy of the route's import would mock src/app/model (nonexistent) and silently intercept
// nothing, leaving the real model to hit Mongo.
vi.mock('@/app/api/repairs/model', () => ({
  default: {
    findById: (...a) => { callLog.push('findById'); return findById(...a); },
    updateById: (...a) => { callLog.push('updateById'); return updateById(...a); },
    claimForAutoInvoice: (...a) => { callLog.push('claim'); return claimForAutoInvoice(...a); },
    releaseAutoInvoiceClaim: (...a) => { callLog.push('release'); return releaseAutoInvoiceClaim(...a); },
  },
}));
vi.mock('@/app/api/repair-invoices/service', () => ({
  createRepairInvoice: (...a) => { callLog.push('createInvoice'); return createRepairInvoice(...a); },
}));
vi.mock('@/app/api/repair-invoices/model', () => ({
  default: { findAll: (...a) => { callLog.push('invoicesFindAll'); return invoicesFindAll(...a); } },
}));
vi.mock('@/utils/s3.util', () => ({ uploadRepairImage: vi.fn() }));
vi.mock('@/services/repairLaborReviewSync', () => ({ syncLaborLogAfterRepairChange: vi.fn() }));
vi.mock('@/lib/apiAuth', () => ({
  requireRole: async () => ({ errorResponse: { status: 403 } }),
  requireRepairOpsAny: async () => ({
    session: { user: { name: 'Vernon', email: 'v@example.com' } },
    errorResponse: null,
  }),
}));

const { POST } = await import('./[repairID]/closeout/route');

const COMPLETED = { repairID: 'R-1', status: 'COMPLETED', afterPhotos: [], closeoutNotes: 'note' };

// A photo-less, notes-only confirm — the normal path now that photos don't gate invoicing.
function request() {
  const form = new FormData();
  form.append('closeoutNotes', 'picked up');
  return new Request('http://localhost/api/repairs/R-1/closeout', {
    method: 'POST',
    body: form,
  });
}

// A PROMISE, because that is what Next 15 actually hands a route handler. My first cut passed a Promise
// while the route destructured it synchronously, so every request 400'd — and three of these tests went
// green anyway, exactly the false confidence this file exists to prevent. The lesson was NOT "pass a
// plain object to match the route"; it was that the route needed to await. Keeping the realistic shape
// here means these tests fail if that await is ever removed.
const params = Promise.resolve({ repairID: 'R-1' });

beforeEach(() => {
  callLog.length = 0;
  vi.clearAllMocks();
  findById.mockResolvedValue(COMPLETED);
  updateById.mockResolvedValue({ ...COMPLETED, invoiceID: '' });
  claimForAutoInvoice.mockResolvedValue(true);
  releaseAutoInvoiceClaim.mockResolvedValue(undefined);
  createRepairInvoice.mockResolvedValue({ invoiceID: 'INV-1', status: 'open' });
  invoicesFindAll.mockResolvedValue([]);
});

describe('closeout route — auto-invoice claim ordering', () => {
  it('claims BEFORE any write, so a concurrent request cannot clobber the token', async () => {
    await POST(request(), { params });

    const claimAt = callLog.indexOf('claim');
    const firstWriteAt = callLog.indexOf('updateById');
    expect(claimAt).toBeGreaterThanOrEqual(0);
    expect(firstWriteAt).toBeGreaterThanOrEqual(0);
    // THE regression: claiming after the update let both callers win.
    expect(claimAt).toBeLessThan(firstWriteAt);
  });

  it('never writes closeoutStatus in the main update — the claim owns that field', async () => {
    await POST(request(), { params });

    expect(updateById).toHaveBeenCalled();
    for (const [, update] of updateById.mock.calls) {
      expect(update).not.toHaveProperty('closeoutStatus');
    }
  });

  it('does not invoice when the claim is lost', async () => {
    claimForAutoInvoice.mockResolvedValue(false);
    await POST(request(), { params });

    expect(createRepairInvoice).not.toHaveBeenCalled();
    expect(releaseAutoInvoiceClaim).not.toHaveBeenCalled();
  });

  it('invoices exactly once when the claim is won', async () => {
    await POST(request(), { params });

    expect(createRepairInvoice).toHaveBeenCalledTimes(1);
    expect(createRepairInvoice.mock.calls[0][0]).toMatchObject({ repairIDs: ['R-1'], appendToOpen: true });
    expect(releaseAutoInvoiceClaim).not.toHaveBeenCalled();
  });

  it('releases the claim when invoicing fails and NO invoice exists', async () => {
    createRepairInvoice.mockRejectedValue(new Error('mongo blip'));
    invoicesFindAll.mockResolvedValue([]);
    await POST(request(), { params });

    expect(releaseAutoInvoiceClaim).toHaveBeenCalledWith('R-1');
  });

  it('does NOT release when an invoice document already exists — the partial-failure trap', async () => {
    // createRepairInvoice inserts the invoice BEFORE writing repair.invoiceID, so a failure in between
    // leaves a real invoice with the repair row still looking unbilled. Releasing there would let the
    // next confirm raise a SECOND invoice for work already billed.
    createRepairInvoice.mockRejectedValue(new Error('timeout after insert'));
    invoicesFindAll.mockResolvedValue([{ invoiceID: 'INV-1', repairIDs: ['R-1'] }]);
    await POST(request(), { params });

    expect(invoicesFindAll).toHaveBeenCalledWith({ repairIDs: 'R-1' });
    expect(releaseAutoInvoiceClaim).not.toHaveBeenCalled();
  });

  it('refuses to release when it cannot PROVE no invoice exists', async () => {
    // Fail closed: a stuck claim is recoverable by an admin, a duplicate bill reaches the customer.
    createRepairInvoice.mockRejectedValue(new Error('insert failed'));
    invoicesFindAll.mockRejectedValue(new Error('invoices unreachable'));
    await POST(request(), { params });

    expect(releaseAutoInvoiceClaim).not.toHaveBeenCalled();
  });

  /**
   * The THIRD durability property, and the one the first two tests can't see: a claim that is taken must
   * always be either consumed (invoiced) or released. Ordering and field-exclusivity make the token
   * durable; this makes it recoverable.
   *
   * Why it matters more than it looks: removing `closeoutStatus` from the main $set — necessary to fix
   * the clobber — also removed the accidental self-heal that used to free an orphaned token. So a throw
   * between the claim and the invoicing block now strands the repair permanently: the claim filter
   * demands an unbatched closeout, so every later confirm silently declines to invoice while still
   * returning 200 and a green "Closed out" message. Invisible, not merely broken.
   */
  it('releases the claim when the closeout WRITE fails, not just when invoicing fails', async () => {
    updateById.mockRejectedValue(new Error('write timeout'));

    await expect(POST(request(), { params })).resolves.toBeDefined();

    expect(claimForAutoInvoice).toHaveBeenCalled();
    expect(createRepairInvoice).not.toHaveBeenCalled();
    // Without this the repair keeps 'batched' forever and can never be billed by the per-card button.
    expect(releaseAutoInvoiceClaim).toHaveBeenCalledWith('R-1');
  });

  it('does not release a write-failure claim when an invoice already exists', async () => {
    updateById.mockRejectedValue(new Error('write timeout'));
    invoicesFindAll.mockResolvedValue([{ invoiceID: 'INV-1', repairIDs: ['R-1'] }]);

    await POST(request(), { params });

    expect(releaseAutoInvoiceClaim).not.toHaveBeenCalled();
  });

  it('does not attempt a release when the claim was never won', async () => {
    claimForAutoInvoice.mockResolvedValue(false);
    updateById.mockRejectedValue(new Error('write timeout'));

    await POST(request(), { params });

    // Releasing here would hand back a token this request never held — i.e. free the winner's claim.
    expect(releaseAutoInvoiceClaim).not.toHaveBeenCalled();
    expect(invoicesFindAll).not.toHaveBeenCalled();
  });

  it('still refuses a repair that is not COMPLETED, and claims nothing', async () => {
    findById.mockResolvedValue({ ...COMPLETED, status: 'IN_PROGRESS' });
    const res = await POST(request(), { params });

    expect(res.status).toBe(400);
    expect(claimForAutoInvoice).not.toHaveBeenCalled();
    expect(updateById).not.toHaveBeenCalled();
  });
});
