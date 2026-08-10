import { describe, expect, it, vi, beforeEach } from 'vitest';

/**
 * Coverage for CASTING RECEIPT → ARTISAN INVOICE (U-BILL-1).
 *
 * This is the call that puts casting debt on the `artisanInvoices` rail. Before it existed, the
 * charge minted at receipt lived only on the batch, so `isArtisanFrozen` — which reads
 * artisanInvoices — could never fire for a casting, and the nothing-is-fronted ship gate was a staff
 * click and nothing more.
 *
 * The two money properties pinned here:
 *  1. the invoice bills the MARKED-UP charge, never the raw vendor cost (billing the raw cost would
 *     silently hand EFD's infra fee back to the artisan), and
 *  2. it can never double-bill.
 */

const state = { batch: null, invoices: [], created: [], users: {} };

// `isEfdSelf` looks the batch owner up to decide whether this is EFD billing itself. Mocked so the
// test never opens a real connection — and so the lookup FILTER can be asserted (see below).
const userQueries = [];
vi.mock('@/lib/database', () => ({
  db: {
    connect: async () => ({
      collection: () => ({
        findOne: async (filter) => { userQueries.push(filter); return state.users[filter?.userID] || null; },
      }),
    }),
  },
}));

vi.mock('@/app/api/castingBatches/model', () => ({
  default: { findById: async () => state.batch },
  CASTING_STATUS: { NEEDS_ORDERING: 'needs_ordering', ORDERED: 'ordered', RECEIVED: 'received', DELIVERED: 'delivered', DISPUTED: 'disputed', ACCEPTED: 'accepted', CANCELLED: 'cancelled' },
}));
vi.mock('@/app/api/artisanInvoices/model', () => ({
  default: {
    findOneBySource: async (sourceType, sourceID) => state.invoices.find((i) => i.sourceType === sourceType && i.sourceID === sourceID) || null,
    create: async (data) => {
      const inv = { invoiceID: `ainv-${state.invoices.length + 1}`, status: 'pending_payment', ...data };
      state.invoices.push(inv); state.created.push(inv);
      return inv;
    },
    listOverdue: async () => [],
  },
  ARTISAN_INVOICE_KIND: { WORK_ORDER: 'artisan_wo_invoice', CASTING: 'casting_charge' },
  ARTISAN_INVOICE_STATUS: { PENDING: 'pending_payment', PAID: 'paid', VOID: 'void' },
}));
// artisanBilling imports castingBoard for markCastingPaid — stub it so this test never reaches a DB.
vi.mock('@/services/production/castingBoard', () => ({ markCastingPaid: async () => ({}) }));
vi.mock('@/services/production/workOrderPricing', () => ({
  getWorkOrderMarkupMultiplier: async () => 1.5,
  applyWorkOrderMarkup: (cost, m) => Math.round((Number(cost) || 0) * m * 100) / 100,
  DEFAULT_WO_MARKUP: 1.5,
}));

const load = async () => import('@/services/production/artisanBilling');

beforeEach(() => {
  // A received vendor batch: $200 actual vendor cost, billed AT COST (no markup on Carrera orders).
  state.batch = {
    batchId: 'b1', ownerId: 'artisan-1', runId: 'r1', vendor: 'Carrera',
    status: 'received', actualCost: 200,
    charge: { amount: 200, passthrough: true, markupMultiplier: null, paid: false, paidAt: null, invoiceID: null },
  };
  state.invoices = [];
  state.created = [];
  state.users = { 'artisan-1': { role: 'artisan' } };   // an outside artisan → billable
  userQueries.length = 0;
});

describe('billCastingBatch', () => {
  it('bills what the board RECORDED as the charge — at cost, no markup', async () => {
    const { billCastingBatch } = await load();
    const inv = await billCastingBatch({ batchId: 'b1', billedEmail: 'a@t.test', createdBy: 'staff-9' });
    expect(inv.amount).toBe(200);            // charge.amount === actualCost (reimbursement)
    expect(inv.breakdown).toEqual({ casting: 200, passthrough: true, markupMultiplier: null });
  });

  it('bills charge.amount VERBATIM, never a figure it recomputes', async () => {
    // A legacy marked-up row (billed before the 2026-07-29 at-cost decision) must still bill what it
    // says — the pricing policy lives in castingChargeFromCost, not here, so this module must not
    // reinterpret an amount it didn't set.
    state.batch.charge = { amount: 300, passthrough: false, markupMultiplier: 1.5, paid: false };
    const { billCastingBatch } = await load();
    const inv = await billCastingBatch({ batchId: 'b1' });
    expect(inv.amount).toBe(300);
    expect(inv.breakdown).toEqual({ casting: 200, passthrough: false, markupMultiplier: 1.5 });
  });

  it('bills the OWNING artisan and carries the run + kind + email', async () => {
    const { billCastingBatch } = await load();
    const inv = await billCastingBatch({ batchId: 'b1', billedEmail: 'a@t.test', createdBy: 'staff-9' });
    expect(inv).toMatchObject({
      kind: 'casting_charge',
      billedUserID: 'artisan-1',
      billedEmail: 'a@t.test',
      sourceType: 'casting_batch',
      sourceID: 'b1',
      runId: 'r1',
    });
    expect(inv.description).toContain('Carrera');
  });

  it('is IDEMPOTENT — billing twice never creates a second debt', async () => {
    const { billCastingBatch } = await load();
    const first = await billCastingBatch({ batchId: 'b1' });
    const second = await billCastingBatch({ batchId: 'b1' });
    expect(second.invoiceID).toBe(first.invoiceID);
    expect(state.created).toHaveLength(1);
  });

  it('creates NOTHING when the batch has no charge yet (not received)', async () => {
    state.batch = { batchId: 'b1', ownerId: 'artisan-1', status: 'ordered', charge: { amount: null } };
    const { billCastingBatch } = await load();
    expect(await billCastingBatch({ batchId: 'b1' })).toBeNull();
    expect(state.created).toHaveLength(0);
  });

  // EFD DOESN'T BILL EFD (owner, 2026-07-29). Staff use the same rails as artisans, but invoicing
  // yourself is fake money — and an unpaid self-invoice would trip isArtisanFrozen and lock the owner
  // out of his own platform. Mirrors the selfFulfilled=$0 rule work orders already had.
  describe('EFD self-billing exemption', () => {
    it.each([['admin'], ['dev'], ['staff']])('creates NO invoice when the run owner is %s', async (role) => {
      state.users['artisan-1'] = { role };
      const { billCastingBatch } = await load();
      expect(await billCastingBatch({ batchId: 'b1' })).toBeNull();
      expect(state.created).toHaveLength(0);
    });

    it('still bills an outside artisan, and a wholesaler', async () => {
      const { billCastingBatch } = await load();
      expect(await billCastingBatch({ batchId: 'b1' })).toBeTruthy();
      state.users['artisan-1'] = { role: 'wholesaler' };
      state.invoices = []; state.created = [];
      expect(await billCastingBatch({ batchId: 'b1' })).toBeTruthy();
    });

    it('looks the owner up by a PLAIN STRING userID — an operator object cannot match a staff user', async () => {
      // A `{$ne:null}` ownerId reaching the lookup would match an arbitrary user; if that user were
      // staff, the exemption would hand out free casting.
      state.batch.ownerId = { $ne: null };
      const { billCastingBatch } = await load();
      // Stringified it matches nobody, which is now uncertainty rather than "bill them" — so it
      // refuses. Either way the security property holds: the operator never reaches Mongo.
      await expect(billCastingBatch({ batchId: 'b1' })).rejects.toThrow();
      expect(userQueries.at(-1).userID).toBe('[object Object]');   // stringified, never an operator
      expect(typeof userQueries.at(-1).userID).toBe('string');
    });

    /**
     * POLICY REVERSED, 2026-08-10. This used to assert the opposite — that a lookup error BILLS the
     * artisan — on the reasoning that a skipped bill silently loses revenue while a wrong bill is
     * visible and clearable.
     *
     * That held while this ran once per casting receipt. It stopped holding when work-order billing
     * turned on (U-BILL-2) and isEfdSelf began running at EVERY piece-WO QC pass: a transient blip
     * while billing an OWNER-owned piece raises a real receivable against the owner, and at +14 days
     * isArtisanFrozen locks him out of mintRun / requestDesignCad / casting-create — self-inflicted
     * downtime on his own platform, the exact thing "EFD does not bill EFD" exists to prevent.
     *
     * An unbilled work order is recoverable. A wrong receivable against the owner isn't, until
     * somebody works out why the platform locked him out.
     */
    it('REFUSES TO GUESS — a lookup error bills nobody and says why', async () => {
      state.users = new Proxy({}, { get() { throw new Error('mongo down'); } });
      const { billCastingBatch } = await load();
      await expect(billCastingBatch({ batchId: 'b1' })).rejects.toThrow(/Could not determine whether/);
      expect(state.created).toHaveLength(0);   // no invoice, not even a wrong one
    });

    it('retries once before giving up, so a single blip does not skip a real bill', async () => {
      // The cost of giving up is revenue that never gets invoiced, so one retry is worth it.
      let calls = 0;
      state.users = new Proxy({}, {
        get(_t, key) {
          if (key === 'artisan-1') {
            calls += 1;
            if (calls === 1) throw new Error('transient');
            return { role: 'artisan' };
          }
          return undefined;
        },
      });
      const { billCastingBatch } = await load();
      expect(await billCastingBatch({ batchId: 'b1' })).toBeTruthy();  // billed on the retry
      expect(calls).toBeGreaterThanOrEqual(2);
    });

    it('refuses when the owner resolves to no user — a receivable against a ghost is not a bill', async () => {
      // Ownership comes from drop.ownerId / design.primaryArtisanId, both real userIDs, so a miss
      // means the data is wrong. Billing it would invoice someone with no account and no email.
      state.users = {};
      state.batch.ownerId = 'user-does-not-exist';
      const { billCastingBatch } = await load();
      await expect(billCastingBatch({ batchId: 'b1' })).rejects.toThrow(/No user found/);
      expect(state.created).toHaveLength(0);
    });
  });

  it('a $0 charge bills nothing (a comped casting creates no debt)', async () => {
    state.batch.charge = { amount: 0, passthrough: true, markupMultiplier: null, paid: false };
    const { billCastingBatch } = await load();
    expect(await billCastingBatch({ batchId: 'b1' })).toBeNull();
    expect(state.created).toHaveLength(0);
  });

  it('throws on a missing batch rather than inventing an invoice', async () => {
    state.batch = null;
    const { billCastingBatch } = await load();
    await expect(billCastingBatch({ batchId: 'nope' })).rejects.toThrow(/not found/);
    expect(state.created).toHaveLength(0);
  });

  it('a null email still produces the invoice (it can be pushed to Stripe later)', async () => {
    const { billCastingBatch } = await load();
    const inv = await billCastingBatch({ batchId: 'b1' });
    expect(inv.invoiceID).toBeTruthy();
    expect(inv.billedEmail).toBeNull();
  });
});

describe('the freeze becomes real once a casting invoice is overdue', () => {
  it('hasOverdueInvoices sees a past-due casting invoice', async () => {
    const { hasOverdueInvoices } = await load();
    const past = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    expect(hasOverdueInvoices([{ status: 'pending_payment', dueAt: past }])).toBe(true);
  });
  it('and ignores it once paid', async () => {
    const { hasOverdueInvoices } = await load();
    const past = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    expect(hasOverdueInvoices([{ status: 'paid', dueAt: past }])).toBe(false);
  });
});

