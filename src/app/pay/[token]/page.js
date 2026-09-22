/**
 * /pay/[token] — the PUBLIC "your repair is ready" page a retail customer lands on from the notice
 * (services/repairs/readyForPickup.js). No sign-in: the token is the credential and this path is
 * outside the middleware matcher on purpose. Shows what was done, the balance, and a card button
 * that POSTs to /api/pay/[token]/checkout (hosted Stripe Checkout). Payment state comes from the
 * invoice, which only the Stripe webhook marks paid — so a forged ?status=paid shows nothing paid.
 *
 * Plain HTML + inline styles: this is a server component outside the MUI dashboard shell.
 */
import { notFound } from 'next/navigation';
import RepairInvoicesModel from '@/app/api/repair-invoices/model';
import { db } from '@/lib/database';
import { cardConvenienceFee } from '@/services/wholesale/invoicePayments';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Your repair is ready — Engel Fine Design' };

const money = (n) => Number(n || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const C = { bg: '#0D0D0D', panel: '#141416', border: 'rgba(255,255,255,0.12)', text: '#F5F5F5', muted: 'rgba(255,255,255,0.62)', gold: '#FBBF24', green: '#66BB6A' };

function Row({ label, value, strong = false }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '6px 0', borderBottom: `1px solid ${C.border}` }}>
      <span style={{ color: C.muted }}>{label}</span>
      <span style={{ color: C.text, fontWeight: strong ? 700 : 500, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  );
}

export default async function PayPage({ params, searchParams }) {
  const { token } = await params;
  const query = (await searchParams) || {};
  const safe = String(token || '').trim();
  if (!/^[A-Za-z0-9_-]{20,}$/.test(safe)) notFound();

  const invoice = await RepairInvoicesModel.findAll({ payToken: safe }).then((r) => (Array.isArray(r) ? r[0] : null)).catch(() => null);
  if (!invoice || invoice.accountType !== 'retail') notFound();

  // Snapshots carry money only; the customer wants to see WHAT was done.
  let repairs = [];
  let shop = {};
  try {
    const dbi = await db.connect();
    [repairs, shop] = await Promise.all([
      dbi.collection('repairs').find({ repairID: { $in: invoice.repairIDs || [] } }).project({ _id: 0, repairID: 1, description: 1, 'tasks.title': 1, 'tasks.name': 1 }).toArray(),
      dbi.collection('adminSettings').findOne({ _id: 'repair_task_admin_settings' }, { projection: { 'business.shipFrom': 1, 'business.name': 1 } }).then((d) => d?.business?.shipFrom || {}),
    ]);
  } catch { /* the bill still renders without descriptions */ }
  const repairByID = new Map(repairs.map((r) => [r.repairID, r]));
  const phone = String(shop.phone || '').replace(/\D/g, '');
  const phoneLabel = phone.length === 10 ? `(${phone.slice(0, 3)}) ${phone.slice(3, 6)}-${phone.slice(6)}` : shop.phone || '';
  const address = [shop.street1, shop.street2].filter(Boolean).join(', ') + (shop.city ? `, ${shop.city}, ${String(shop.state || '').toUpperCase()} ${shop.zip || ''}` : '');

  const remaining = Number(invoice.remainingBalance) || 0;
  const paid = invoice.paymentStatus === 'paid' || remaining <= 0;
  const processing = Boolean(invoice.pendingCheckout?.sessionId) && !paid;
  const payable = !paid && !processing && ['draft', 'open'].includes(invoice.status);
  const fee = cardConvenienceFee(remaining);
  const status = String(query.status || '');
  const error = String(query.error || '');
  const firstName = String(invoice.customerName || '').trim().split(/\s+/)[0];

  const banner = paid
    ? { color: C.green, text: 'Paid — thank you. Your repair is ready whenever you are.' }
    : processing
      ? { color: C.gold, text: 'Your payment is processing. This page will show Paid once it settles.' }
      : status === 'paid'
        ? { color: C.gold, text: 'Thanks — we are confirming your payment with the bank. Refresh in a moment.' }
        : status === 'cancel'
          ? { color: C.muted, text: 'No charge was made. You can pay here any time, or at pickup.' }
          : error
            ? { color: '#F87171', text: 'Online payment is unavailable right now. You can pay at pickup.' }
            : null;

  return (
    <main style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif', padding: '24px 16px' }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ letterSpacing: 4, fontSize: 12, color: C.gold, textTransform: 'uppercase' }}>Engel Fine Design</div>
          <h1 style={{ fontSize: 26, margin: '8px 0 4px', fontWeight: 600 }}>{firstName ? `${firstName}, your repair is ready` : 'Your repair is ready'}</h1>
          <p style={{ margin: 0, color: C.muted }}>It passed final inspection and is waiting for you at the shop.</p>
        </div>

        {banner && (
          <div style={{ border: `1px solid ${banner.color}`, color: banner.color, borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 15 }}>{banner.text}</div>
        )}

        <section style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 14, padding: 18, marginBottom: 16 }}>
          <div style={{ fontSize: 12, letterSpacing: 2, color: C.muted, textTransform: 'uppercase', marginBottom: 8 }}>Work completed · {invoice.invoiceID}</div>
          {(invoice.repairSnapshots || []).map((r) => {
            const full = repairByID.get(r.repairID) || {};
            const tasks = (full.tasks || []).map((t) => t.title || t.name).filter(Boolean);
            return (
              <div key={r.repairID} style={{ padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <span style={{ fontWeight: 600 }}>{full.description || r.repairID}</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{money(r.total)}</span>
                </div>
                {tasks.length > 0 && <div style={{ color: C.muted, fontSize: 14, marginTop: 2 }}>{tasks.slice(0, 6).join(' · ')}</div>}
              </div>
            );
          })}
          <div style={{ marginTop: 10 }}>
            <Row label="Subtotal" value={money(invoice.subtotal)} />
            {Number(invoice.taxAmount) > 0 && <Row label="Sales tax" value={money(invoice.taxAmount)} />}
            {Number(invoice.amountPaid) > 0 && <Row label="Paid so far" value={`−${money(invoice.amountPaid)}`} />}
            <Row label={paid ? 'Total' : 'Balance due'} value={money(paid ? invoice.total : remaining)} strong />
          </div>
        </section>

        {payable && (
          <section style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 14, padding: 18, marginBottom: 16 }}>
            <form method="post" action={`/api/pay/${encodeURIComponent(safe)}/checkout`}>
              <button
                type="submit"
                style={{ width: '100%', background: C.gold, color: '#1a1205', border: 0, borderRadius: 10, padding: '14px 16px', fontSize: 17, fontWeight: 700, cursor: 'pointer' }}
              >
                Pay {money(remaining + fee)} by card
              </button>
            </form>
            <p style={{ color: C.muted, fontSize: 13, margin: '10px 0 0', lineHeight: 1.5 }}>
              Includes a {money(fee)} card convenience fee (2.9% + 30¢), itemized on the payment page. Or pay {money(remaining)} at pickup — cash has no fee. Payment is handled by Stripe; we never see your card number.
            </p>
          </section>
        )}

        <p style={{ color: C.muted, fontSize: 13, textAlign: 'center', lineHeight: 1.6 }}>
          Engel Fine Design{address ? ` · ${address}` : ''}{phoneLabel ? ` · ${phoneLabel}` : ''}<br />
          Questions about this bill? Reply to the email you received or call the shop.
        </p>
      </div>
    </main>
  );
}
