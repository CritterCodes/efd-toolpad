import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { loadInvoiceContext, composeDocument } from '@/services/customs/customInvoiceDelivery';
import { DOC_KIND } from '@/services/customs/customInvoiceDocument';

/**
 * GET /api/custom-orders/[customID]/invoices/[invoiceID]/document?kind=invoice|receipt
 *
 * The rendered customer document — the same HTML the emailed copy uses, so what staff print at the
 * counter and what the customer receives cannot differ.
 *
 * Returns `{ doc, html }`: `html` for printing, `doc` so the page can show the balance without
 * re-deriving it (re-deriving is how the printed and emailed figures drift apart).
 */
export const GET = async (req, { params }) => {
  const { errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;

  const { customID, invoiceID } = await params;
  const kind = new URL(req.url).searchParams.get('kind') === DOC_KIND.RECEIPT
    ? DOC_KIND.RECEIPT
    : DOC_KIND.INVOICE;

  try {
    const ctx = await loadInvoiceContext(customID, invoiceID);
    // A receipt for something unpaid would be a false record — refuse rather than print it.
    if (kind === DOC_KIND.RECEIPT && ctx.invoice.status !== 'paid') {
      return NextResponse.json({ error: 'This invoice is not paid yet, so it has no receipt.' }, { status: 400 });
    }
    const { doc, html } = composeDocument(ctx, kind, { standalone: true });
    return NextResponse.json({ doc, html }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
};
