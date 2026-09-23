import { redirect, permanentRedirect } from 'next/navigation';
import { shopLink } from '@/lib/appUrls';

/**
 * /pay/<token> — kept only to forward the links already in customers' inboxes.
 *
 * This page used to BE the retail payment page: it rendered the bill and took a card through its own
 * Stripe Checkout. That was the wrong front door (owner, 2026-09-22) — customers pay in the shop, and
 * paying here could only ever settle one repair at a time. The shop puts a finished repair in the
 * CART, so somebody with two repairs ready pays once (efd-shop: /repair/pay/<token>, lib/repairPayments.js).
 *
 * The token is the same string on the same `repairInvoices` document, which both apps read from the
 * same database, so a forwarded link lands on exactly the right bill.
 */
export const dynamic = 'force-dynamic';

export default async function LegacyPayRedirect({ params }) {
  const { token } = await params;
  const safe = String(token || '').trim();
  // A junk token goes to the shop's own "we can't find that repair" copy rather than a bare 404 here.
  if (!/^[A-Za-z0-9_-]{20,}$/.test(safe)) redirect(shopLink('/repair/pay/invalid'));
  permanentRedirect(shopLink(`/repair/pay/${encodeURIComponent(safe)}`));
}
