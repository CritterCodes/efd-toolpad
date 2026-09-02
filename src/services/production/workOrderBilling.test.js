import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * WORK-ORDER COMPLETION BILLING (U-BILL-3).
 *
 * `billWorkOrder` shipped in S5 with ZERO callers — work orders passed QC, labor became
 * payroll-payable, and nobody was ever charged. EFD paid the bench and invoiced nothing. These tests
 * pin the money rules of the caller.
 *
 * The four ways this could lose or misdirect money, each with a test below:
 *  1. billing the PIECE total instead of the work order's own labor → charges the whole piece once per
 *     work order on it
 *  2. billing `payer:'self'` labor → charges an artisan for their own hands
 *  3. billing materials here → double-bills casting, which is already invoiced at cost at receipt
 *  4. billing the wrong party → the owning artisan is the drop owner, else the design's primary
 *     artisan, and it must match what `laborPayer` used to decide `self`
 */

const state = { wo: null, logs: [], piece: null, design: null, drop: null, users: {}, billed: [] };

vi.mock('@/app/api/workOrders/model', () => ({
  default: { findByID: async () => state.wo },
  WORK_ORDER_SOURCE: {
    REPAIR: 'repair', PRODUCTION_PIECE: 'production_piece', CUSTOM_PIECE: 'custom_piece',
    SALE_SERVICE: 'sale_service', CAD_REQUEST: 'cad_request',
  },
}));
vi.mock('@/app/api/repairLaborLogs/model', () => ({
  default: { findByWorkOrder: async () => state.logs },
}));
vi.mock('@/app/api/pieces/model', () => ({ default: { findById: async () => state.piece } }));
vi.mock('@/app/api/designs/model', () => ({ default: { findById: async () => state.design } }));
vi.mock('@/app/api/drops/model', () => ({ default: { findById: async () => state.drop } }));
vi.mock('@/lib/database', () => ({
  db: { connect: async () => ({ collection: () => ({ findOne: async ({ userID }) => state.users[userID] || null }) }) },
}));
const pushToStripe = vi.fn();
const createNotification = vi.fn();
vi.mock('@/services/production/artisanBilling', () => ({
  // FAITHFUL to the real isEfdSelf: it THROWS when it can't tell (lookup failure, or a userID that
  // resolves to no user) rather than returning false ⇒ "bill them". A lenient mock here would let a
  // test pass green while production skipped the bill — mock-boundary blindness on a money path.
  isEfdSelf: async (id) => {
    if (state.efdSelfThrows) throw new Error('mongo down');
    if (!state.users[id]) throw new Error(`No user found for ${id}, so nothing was billed.`);
    return ['admin', 'dev', 'staff'].includes(state.users[id].role);
  },
  pushArtisanInvoiceToStripe: (...a) => pushToStripe(...a),
  billWorkOrder: async (args) => {
    state.billed.push(args);
    // Mirror the real guard: nothing owed → no invoice.
    if (!(Number(args.labor) + Number(args.materials || 0) > 0)) return null;
    return {
      invoiceID: 'ainv-wo-1', amount: Number(args.labor) * 1.5,
      billedUserID: args.billedUserID, description: args.description,
      dueAt: new Date('2026-08-14'),
      ...(state.billedInvoiceOverride || {}),
    };
  },
}));
vi.mock('@/lib/notificationService', () => ({
  NotificationService: { createNotification: (...a) => createNotification(...a) },
  NOTIFICATION_TYPES: { INVOICE_CREATED: 'invoice-created' },
}));

const { billCompletedWorkOrder, billableLabor } = await import('@/services/production/workOrderBilling');

const log = (over = {}) => ({ workOrderID: 'wo-1', payer: 'efd', creditedValue: 100, pendingQc: false, ...over });

beforeEach(() => {
  state.wo = { workOrderID: 'wo-1', sourceType: 'production_piece', sourceID: 'p-1', runId: 'r-1', title: 'Set stones' };
  state.logs = [log()];
  state.piece = { pieceID: 'p-1', designID: 'd-1', dropId: null };
  state.design = { designID: 'd-1', primaryArtisanId: 'u-artisan' };
  state.drop = null;
  state.users = { 'u-artisan': { email: 'a@t.test', role: 'artisan' }, 'u-owner': { email: 'o@t.test', role: 'admin' } };
  state.billed = [];
});

describe('billableLabor (pure)', () => {
  it('sums EFD-paid, QC-released labor', () => {
    expect(billableLabor([log({ creditedValue: 100 }), log({ creditedValue: 50 })])).toBe(150);
  });

  it('EXCLUDES payer:self — solo work realizes at sale, it is not a bill', () => {
    expect(billableLabor([log({ payer: 'self', creditedValue: 500 })])).toBe(0);
    expect(billableLabor([log({ payer: 'self', creditedValue: 500 }), log({ creditedValue: 40 })])).toBe(40);
  });

  it('EXCLUDES labor still held pending QC', () => {
    expect(billableLabor([log({ pendingQc: true, creditedValue: 900 })])).toBe(0);
  });

  it('treats a missing payer as billable (pre-S2 / repair logs)', () => {
    expect(billableLabor([{ creditedValue: 30 }])).toBe(30);
  });

  it('tolerates junk', () => {
    expect(billableLabor()).toBe(0);
    expect(billableLabor([null, undefined, {}, log({ creditedValue: 'abc' })])).toBe(0);
  });
});

describe('who gets billed', () => {
  it("bills the design's primary artisan, at that WO's labor only", async () => {
    const res = await billCompletedWorkOrder({ workOrderID: 'wo-1', createdBy: 'u-staff' });
    expect(res).toMatchObject({ billed: true, invoiceID: 'ainv-wo-1' });
    expect(state.billed[0]).toMatchObject({
      workOrderID: 'wo-1', billedUserID: 'u-artisan', billedEmail: 'a@t.test',
      labor: 100, runId: 'r-1', createdBy: 'u-staff',
    });
  });

  it('an ARTISAN-OWNED DROP wins over the design owner (matches laborPayer)', async () => {
    // Who is billed must agree with who laborPayer called `self`, or one path bills and the other
    // credits the wrong person.
    state.piece = { ...state.piece, dropId: 'drop-1' };   // the drop is only loaded when the piece points at one
    state.drop = { ownerType: 'artisan', ownerId: 'u-dropowner' };
    state.users['u-dropowner'] = { email: 'd@t.test', role: 'artisan' };
    await billCompletedWorkOrder({ workOrderID: 'wo-1' });
    expect(state.billed[0].billedUserID).toBe('u-dropowner');
  });

  it('bills NOBODY for an EFD-owned piece', async () => {
    state.design = { designID: 'd-1' };          // no primaryArtisanId
    state.drop = { ownerType: 'efd', ownerId: null };
    const res = await billCompletedWorkOrder({ workOrderID: 'wo-1' });
    expect(res.billed).toBe(false);
    expect(state.billed).toHaveLength(0);
  });

  it('bills NOBODY when the owner is EFD staff (EFD does not bill EFD)', async () => {
    state.design = { designID: 'd-1', primaryArtisanId: 'u-owner' };   // role: admin
    const res = await billCompletedWorkOrder({ workOrderID: 'wo-1' });
    expect(res).toMatchObject({ billed: false });
    expect(state.billed).toHaveLength(0);
  });
});

describe('what is billed', () => {
  it('NEVER bills materials here — casting is already invoiced at cost at receipt', async () => {
    await billCompletedWorkOrder({ workOrderID: 'wo-1' });
    expect(state.billed[0].materials).toBe(0);
  });

  it('bills only THIS work order (the model is queried by workOrderID, not by piece)', async () => {
    // Regression guard for the double-charge: computePieceCosts sums the whole PIECE, so billing from
    // that would charge the full piece once per work order on it.
    state.logs = [log({ creditedValue: 60 })];
    await billCompletedWorkOrder({ workOrderID: 'wo-1' });
    expect(state.billed[0].labor).toBe(60);
  });

  it('solo work bills nothing at all', async () => {
    state.logs = [log({ payer: 'self', creditedValue: 300 })];
    const res = await billCompletedWorkOrder({ workOrderID: 'wo-1' });
    expect(res.billed).toBe(false);
    expect(state.billed).toHaveLength(0);
  });
});

describe('sources that must NOT be artisan-billed', () => {
  it.each([['repair'], ['sale_service'], ['cad_request']])('%s is skipped', async (sourceType) => {
    state.wo = { ...state.wo, sourceType };
    const res = await billCompletedWorkOrder({ workOrderID: 'wo-1' });
    expect(res.billed).toBe(false);
    expect(state.billed).toHaveLength(0);
  });
});

describe('never throws — QC pass has already committed', () => {
  it('reports a structured error instead of throwing', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const logs = await import('@/app/api/repairLaborLogs/model');
    const orig = logs.default.findByWorkOrder;
    logs.default.findByWorkOrder = async () => { throw new Error('mongo down'); };
    try {
      const res = await billCompletedWorkOrder({ workOrderID: 'wo-1' });
      expect(res).toMatchObject({ billed: false, error: true });
      expect(res.reason).toContain('mongo down');
    } finally { logs.default.findByWorkOrder = orig; spy.mockRestore(); }
  });

  it('degrades cleanly on a missing work order', async () => {
    state.wo = null;
    await expect(billCompletedWorkOrder({ workOrderID: 'nope' })).resolves.toMatchObject({ billed: false });
  });
});

/**
 * DELIVERY (U-BILL-2). Raising an invoice silently is how the freeze this rail was gated on comes
 * back: at +14 days isArtisanFrozen blocks new runs and work orders — over a bill the artisan was
 * never shown and cannot pay unless staff happen to open the admin page and press Send. An exit only
 * staff know about is not an exit. Delivery is best-effort: the receivable already exists, so a Stripe
 * or notification failure must leave it standing for staff to send by hand, never roll back a QC pass
 * whose labor is already credited.
 */
/**
 * #52 — the ownership lookup must not GUESS.
 *
 * isEfdSelf used to return false ⇒ "bill them" on a DB error. Defensible once per casting receipt;
 * not once work-order billing turned on and it began running at EVERY piece-WO QC pass. A transient
 * blip while billing an OWNER-owned piece raises a real receivable against the owner, which at +14
 * days trips isArtisanFrozen and locks him out of mintRun / requestDesignCad / casting-create —
 * self-inflicted downtime on his own platform.
 *
 * It now throws, and billCompletedWorkOrder (which never throws) turns that into a reported
 * non-billing. An unbilled WO is recoverable; a wrong receivable against the owner isn't.
 */
describe('when ownership cannot be determined (#52)', () => {
  const billable = () => {
    state.wo = { workOrderID: 'wo-1', sourceType: 'production_piece', sourceID: 'p-1' };
    state.piece = { pieceID: 'p-1', designID: 'd-1' };
    state.design = { designID: 'd-1', primaryArtisanId: 'u-artisan' };
    state.drop = null;
    state.users = { 'u-artisan': { role: 'artisan', email: 'a@example.com' } };
    state.logs = [log({ creditedValue: 100 })];
  };

  it('raises NO invoice when the lookup fails, and reports why', async () => {
    billable();
    state.efdSelfThrows = true;
    const res = await billCompletedWorkOrder({ workOrderID: 'wo-1' });
    state.efdSelfThrows = false;

    expect(res.billed).toBe(false);
    expect(res.error).toBe(true);
    expect(res.reason).toMatch(/mongo down/);
    expect(state.billed).toHaveLength(0);   // billWorkOrder never reached
  });

  it('does not throw into the QC pass — labor is already credited', async () => {
    billable();
    state.efdSelfThrows = true;
    await expect(billCompletedWorkOrder({ workOrderID: 'wo-1' })).resolves.toBeDefined();
    state.efdSelfThrows = false;
  });

  it('raises no invoice when the owner resolves to no user', async () => {
    billable();
    state.users = {};   // owner userID present on the design, but no such user
    const res = await billCompletedWorkOrder({ workOrderID: 'wo-1' });

    expect(res.billed).toBe(false);
    expect(res.reason).toMatch(/No user found/);
    expect(state.billed).toHaveLength(0);
  });
});

describe('delivering the invoice to the artisan', () => {
  beforeEach(() => {
    pushToStripe.mockReset();
    createNotification.mockReset();
    pushToStripe.mockResolvedValue({ id: 'in_1', hostedInvoiceUrl: 'https://pay/x' });
    createNotification.mockResolvedValue({});
  });

  const billable = () => {
    state.wo = { workOrderID: 'wo-1', sourceType: 'production_piece', sourceID: 'p-1' };
    state.piece = { pieceID: 'p-1', designID: 'd-1' };
    state.design = { designID: 'd-1', primaryArtisanId: 'u-artisan' };
    state.drop = null;
    state.users = { 'u-artisan': { role: 'artisan', email: 'a@example.com' } };
    state.logs = [log({ creditedValue: 100 })];
  };

  it('sends the hosted invoice and notifies, reporting both', async () => {
    billable();
    const res = await billCompletedWorkOrder({ workOrderID: 'wo-1' });
    expect(res).toMatchObject({ billed: true, sent: true, notified: true });
    expect(pushToStripe).toHaveBeenCalledWith('ainv-wo-1');
  });

  it('puts the pay link in the notification so the artisan can act on it', async () => {
    billable();
    await billCompletedWorkOrder({ workOrderID: 'wo-1' });
    const [note] = createNotification.mock.calls[0];
    expect(note.userId).toBe('u-artisan');
    expect(note.data.actionUrl).toBe('https://pay/x');
    expect(note.type).toBe('invoice-created');
  });

  it('still notifies when Stripe fails — the artisan must learn they owe money', async () => {
    // Commonly "no billing email on file": a data problem for staff, not a reason to say nothing.
    billable();
    pushToStripe.mockRejectedValue(new Error('artisan has no billing email on file'));
    const res = await billCompletedWorkOrder({ workOrderID: 'wo-1' });
    expect(res).toMatchObject({ billed: true, sent: false, notified: true });
    expect(res.sendError).toMatch(/billing email/);
    expect(createNotification).toHaveBeenCalled();
  });

  it('keeps the invoice when delivery fails entirely — never rolls back the bill', async () => {
    billable();
    pushToStripe.mockRejectedValue(new Error('stripe down'));
    createNotification.mockRejectedValue(new Error('notifications down'));
    const res = await billCompletedWorkOrder({ workOrderID: 'wo-1' });
    expect(res).toMatchObject({ billed: true, invoiceID: 'ainv-wo-1', sent: false, notified: false });
  });

  it('does NOT re-deliver an invoice that was already sent', async () => {
    // billWorkOrder returns the EXISTING invoice when the WO already has one, and approveCadQc has no
    // status guard — so a second Approve re-enters here. Past Stripe's 24h idempotency window that
    // mints a SECOND Stripe invoice for one debt; the notify half has no protection at all.
    billable();
    pushToStripe.mockResolvedValue({ id: 'in_1', hostedInvoiceUrl: 'https://pay/x' });
    state.billedInvoiceOverride = { checkoutUrl: 'https://pay/already' };
    const res = await billCompletedWorkOrder({ workOrderID: 'wo-1' });

    expect(res).toMatchObject({ billed: true, alreadyDelivered: true });
    expect(pushToStripe).not.toHaveBeenCalled();
    expect(createNotification).not.toHaveBeenCalled();
    state.billedInvoiceOverride = null;
  });

  it('omits the action link when there is no pay link, rather than pointing at a staff page', async () => {
    billable();
    pushToStripe.mockRejectedValue(new Error('artisan has no billing email on file'));
    await billCompletedWorkOrder({ workOrderID: 'wo-1' });
    const [note] = createNotification.mock.calls[0];
    expect(note.data.actionUrl).toBeUndefined();
    expect(note.data.invoiceID).toBe('ainv-wo-1');
  });

  it('delivers nothing when nothing was billed', async () => {
    state.wo = { workOrderID: 'wo-1', sourceType: 'production_piece', sourceID: 'p-1' };
    state.piece = { pieceID: 'p-1', designID: 'd-1' };
    state.design = { designID: 'd-1', primaryArtisanId: 'u-artisan' };
    state.drop = null;
    state.users = { 'u-artisan': { role: 'artisan', email: 'a@example.com' } };
    state.logs = [log({ payer: 'self', creditedValue: 500 })];   // solo work: nothing owed
    const res = await billCompletedWorkOrder({ workOrderID: 'wo-1' });
    expect(res.billed).toBe(false);
    expect(pushToStripe).not.toHaveBeenCalled();
    expect(createNotification).not.toHaveBeenCalled();
  });
});
