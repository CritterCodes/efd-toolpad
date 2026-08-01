import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/apiAuth';
import ArtisanInvoicesModel, { ARTISAN_INVOICE_STATUS } from './model';
import { STAFF_ROLES } from '@/lib/designPermissions';

/**
 * GET /api/artisanInvoices — the artisan billing ledger.
 *
 * Until this existed the collection had a model and no way to read it: invoices were raised by the
 * casting rail and could only be resolved by a Stripe webhook or a direct DB write. An artisan could be
 * frozen by an overdue invoice they could not see, and staff had nothing to look at.
 *
 * SCOPE: staff see everything; an artisan sees ONLY their own. That is the same shape as the rest of
 * the artisan surfaces (designs, drops, customs) — the filter is applied server-side from the session,
 * never from a query parameter, so `?billedUserID=` cannot be used to read someone else's bills.
 *
 * Query: ?status=pending_payment|paid|void  ?overdue=1  (both optional)
 */
export const GET = async (req) => {
  const { session, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;

  try {
    const url = new URL(req.url);
    const status = url.searchParams.get('status');
    const overdueOnly = url.searchParams.get('overdue') === '1';

    const isStaff = STAFF_ROLES.includes(session.user.role);
    const filter = {};
    // Scope FIRST, from the session. An artisan's view is their own ledger, full stop.
    if (!isStaff) filter.billedUserID = session.user.userID;
    if (status && Object.values(ARTISAN_INVOICE_STATUS).includes(status)) filter.status = status;

    let invoices = await ArtisanInvoicesModel.list(filter);

    if (overdueOnly) {
      const now = Date.now();
      invoices = invoices.filter((i) => i.status === ARTISAN_INVOICE_STATUS.PENDING
        && new Date(i.dueAt).getTime() < now);
    }

    return NextResponse.json({ success: true, invoices }, { status: 200 });
  } catch (error) {
    console.error('Error listing artisan invoices:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};
