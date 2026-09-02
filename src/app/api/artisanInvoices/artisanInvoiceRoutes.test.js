import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * U-BILL-2 — the invoice RESOLUTION surface.
 *
 * `billCompletedWorkOrder` was written, tested and then deliberately left switched off at QC pass,
 * because a `work_order` invoice had no path to paid or void: markPaid/markVoid were hard-keyed to
 * casting, there was no route, and no admin view. Every invoice raised would have gone overdue at +14
 * days and frozen the artisan out of mintRun / requestDesignCad / casting-create with nothing
 * in-product able to clear it — the failure castingSettlement names: "every exit from an invoiced state
 * must resolve the invoice… Getting this wrong is worse than never billing at all."
 *
 * These pin the exits. The scoping test matters most: an artisan must see their own ledger and only
 * their own, and the filter must come from the SESSION, never a query parameter.
 */

const findById = vi.fn();
const list = vi.fn();
const markVoid = vi.fn();
const markArtisanInvoicePaid = vi.fn();
const pushArtisanInvoiceToStripe = vi.fn();
const requireAuth = vi.fn();
const requireRole = vi.fn();

vi.mock('@/lib/apiAuth', () => ({
  requireAuth: (...a) => requireAuth(...a),
  requireRole: (...a) => requireRole(...a),
}));
vi.mock('@/services/production/artisanBilling', () => ({
  markArtisanInvoicePaid: (...a) => markArtisanInvoicePaid(...a),
  pushArtisanInvoiceToStripe: (...a) => pushArtisanInvoiceToStripe(...a),
}));
vi.mock('@/app/api/artisanInvoices/model', async () => {
  const actual = await vi.importActual('@/app/api/artisanInvoices/model');
  return {
    ...actual,
    default: { findById: (...a) => findById(...a), list: (...a) => list(...a), markVoid: (...a) => markVoid(...a) },
  };
});

const { GET } = await import('./route');
const { POST: RESOLVE } = await import('./[invoiceID]/resolve/route');
const { POST: PUSH } = await import('./[invoiceID]/push-to-stripe/route');

const params = Promise.resolve({ invoiceID: 'ainv-1' });
const pending = { invoiceID: 'ainv-1', status: 'pending_payment', amount: 100, billedUserID: 'u-1' };

const getReq = (qs = '') => new Request(`http://localhost/api/artisanInvoices${qs}`);
const postReq = (body) => new Request('http://localhost/x', { method: 'POST', body: JSON.stringify(body) });

beforeEach(() => {
  vi.clearAllMocks();
  requireAuth.mockResolvedValue({ session: { user: { role: 'admin', userID: 'admin-1' } }, errorResponse: null });
  requireRole.mockResolvedValue({ session: { user: { role: 'admin', email: 'a@efd.com' } }, errorResponse: null });
  list.mockResolvedValue([]);
  findById.mockResolvedValue(pending);
});

describe('GET /api/artisanInvoices — scoping', () => {
  it('scopes an artisan to their OWN invoices, from the session', async () => {
    requireAuth.mockResolvedValue({ session: { user: { role: 'artisan', userID: 'u-vernon' } }, errorResponse: null });
    await GET(getReq());
    expect(list).toHaveBeenCalledWith({ billedUserID: 'u-vernon' });
  });

  it('cannot be widened by a query parameter — the obvious attack', async () => {
    requireAuth.mockResolvedValue({ session: { user: { role: 'artisan', userID: 'u-vernon' } }, errorResponse: null });
    await GET(getReq('?billedUserID=u-someone-else'));
    // Scope comes from the session; the param is simply not read.
    expect(list).toHaveBeenCalledWith({ billedUserID: 'u-vernon' });
  });

  it('lets staff see the whole ledger', async () => {
    await GET(getReq());
    expect(list).toHaveBeenCalledWith({});
  });

  it('accepts a known status filter and ignores an unknown one', async () => {
    await GET(getReq('?status=paid'));
    expect(list).toHaveBeenCalledWith({ status: 'paid' });
    list.mockClear();
    await GET(getReq('?status=nonsense'));
    expect(list).toHaveBeenCalledWith({});
  });

  it('filters overdue to unpaid AND past due', async () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    const future = new Date(Date.now() + 86400000).toISOString();
    list.mockResolvedValue([
      { invoiceID: 'a', status: 'pending_payment', dueAt: past },
      { invoiceID: 'b', status: 'pending_payment', dueAt: future },
      { invoiceID: 'c', status: 'paid', dueAt: past },
    ]);
    const res = await GET(getReq('?overdue=1'));
    const body = await res.json();
    expect(body.invoices.map((i) => i.invoiceID)).toEqual(['a']);
  });

  it('refuses an unauthenticated caller', async () => {
    const denied = new Response(null, { status: 401 });
    requireAuth.mockResolvedValue({ errorResponse: denied });
    expect(await GET(getReq())).toBe(denied);
    expect(list).not.toHaveBeenCalled();
  });
});

describe('POST resolve — the exits', () => {
  it('mark-paid goes through the billing service, NOT the model', async () => {
    // markArtisanInvoicePaid also clears a casting batch's shipping gate. Calling the model directly
    // would settle the money and silently strand the parcel.
    markArtisanInvoicePaid.mockResolvedValue({ ...pending, status: 'paid' });
    const res = await RESOLVE(postReq({ action: 'mark-paid' }), { params });
    expect(res.status).toBe(200);
    expect(markArtisanInvoicePaid).toHaveBeenCalledWith('ainv-1');
    expect(markVoid).not.toHaveBeenCalled();
  });

  it('void records who did it', async () => {
    markVoid.mockResolvedValue({ ...pending, status: 'void' });
    await RESOLVE(postReq({ action: 'void', reason: 'duplicate' }), { params });
    expect(markVoid).toHaveBeenCalledWith('ainv-1', expect.stringContaining('duplicate'));
    expect(markVoid.mock.calls[0][1]).toContain('a@efd.com');
  });

  it('refuses to re-resolve a terminal invoice', async () => {
    for (const status of ['paid', 'void']) {
      findById.mockResolvedValue({ ...pending, status });
      const res = await RESOLVE(postReq({ action: 'mark-paid' }), { params });
      expect(res.status).toBe(409);
      expect(markArtisanInvoicePaid).not.toHaveBeenCalled();
    }
  });

  it('rejects an unknown action rather than guessing', async () => {
    const res = await RESOLVE(postReq({ action: 'delete' }), { params });
    expect(res.status).toBe(400);
    expect(markArtisanInvoicePaid).not.toHaveBeenCalled();
    expect(markVoid).not.toHaveBeenCalled();
  });

  it('404s an unknown invoice', async () => {
    findById.mockResolvedValue(null);
    expect((await RESOLVE(postReq({ action: 'void' }), { params })).status).toBe(404);
  });

  it('is admin/dev only — money decisions are not STAFF_ROLES', async () => {
    await RESOLVE(postReq({ action: 'void' }), { params });
    expect(requireRole).toHaveBeenCalledWith(['admin', 'dev']);
  });
});

describe('POST push-to-stripe', () => {
  it('sends a pending invoice and returns the hosted URL', async () => {
    pushArtisanInvoiceToStripe.mockResolvedValue({ id: 'in_123', hostedInvoiceUrl: 'https://pay/x' });
    const res = await PUSH(postReq({}), { params });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ alreadySent: false, checkoutUrl: 'https://pay/x' });
  });

  it('does NOT mint a second Stripe invoice for the same debt', async () => {
    findById.mockResolvedValue({ ...pending, checkoutUrl: 'https://pay/existing', stripeInvoiceID: 'in_old' });
    const res = await PUSH(postReq({}), { params });
    expect(await res.json()).toMatchObject({ alreadySent: true, checkoutUrl: 'https://pay/existing' });
    expect(pushArtisanInvoiceToStripe).not.toHaveBeenCalled();
  });

  it('refuses to send a payment link for a settled or cancelled invoice', async () => {
    for (const status of ['paid', 'void']) {
      findById.mockResolvedValue({ ...pending, status });
      expect((await PUSH(postReq({}), { params })).status).toBe(409);
      expect(pushArtisanInvoiceToStripe).not.toHaveBeenCalled();
    }
  });

  it('reports a missing billing email as a 400, not a server fault', async () => {
    pushArtisanInvoiceToStripe.mockRejectedValue(new Error('artisan has no billing email on file'));
    expect((await PUSH(postReq({}), { params })).status).toBe(400);
  });
});
