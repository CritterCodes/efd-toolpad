import { money, assertNoCostBasis } from '@/services/customs/customInvoiceDocument';

/**
 * ONE HTML RENDERER for a custom-order invoice/receipt, used by BOTH the print view and the email.
 *
 * Not a Handlebars template on purpose. The two documents have to be byte-identical, and lib/email.js
 * loads .hbs files from `process.cwd()/emails` — a runtime path Next's tracer can't follow, which is a
 * standing bundling risk. A pure string function is shared by both paths, ships as ordinary code, and
 * has no filesystem dependency at all.
 *
 * Styling mirrors the repair invoice (`buildInvoicePrintHtml` in dashboard/repairs/pick-up) so a
 * customer who has had a repair recognises the paperwork: same header block, same Zelle panel, same
 * boxed grid and totals ladder.
 *
 * TABLE-BASED LAYOUT for the totals and header. Email clients (Outlook especially) don't do flexbox or
 * grid, and this same markup goes in the body of an email, not only to a printer.
 */

const BRAND = {
  address: '115 N 10th St #A107, Fort Smith, AR 72901',
  phone: '(479) 546-6740',
};

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const CSS = `
  @page { size: letter; margin: 0.35in; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #111827; font-size: 12px;
         -webkit-print-color-adjust: exact; print-color-adjust: exact; background: #fff; }
  .sheet { max-width: 7.6in; margin: 0 auto; padding: 8px; }
  .hd { width: 100%; border-bottom: 2px solid #111827; padding-bottom: 10px; margin-bottom: 14px; }
  .brand { font-size: 22px; font-weight: 800; letter-spacing: -0.02em; }
  .contact { line-height: 1.35; margin-top: 4px; color: #374151; }
  .title { font-size: 18px; font-weight: 700; text-align: right; }
  .muted { color: #6B7280; font-size: 11px; margin-top: 3px; }
  .mono { font-family: "Courier New", monospace; }
  .label { color: #6B7280; font-size: 10px; text-transform: uppercase; letter-spacing: .08em; margin-bottom: 4px; }
  .value { font-size: 13px; font-weight: 700; }
  .box { border: 1px solid #D1D5DB; padding: 8px; vertical-align: top; }
  .paidstamp { display: inline-block; border: 2px solid #1b6b3a; color: #1b6b3a; padding: 3px 10px;
               font-weight: 700; letter-spacing: .12em; text-transform: uppercase; margin-top: 6px; }
  table.items { width: 100%; border-collapse: collapse; margin-top: 8px; }
  table.items th { text-align: left; color: #374151; font-size: 10px; text-transform: uppercase;
                   letter-spacing: .08em; border-bottom: 1px solid #9CA3AF; padding: 7px 6px; }
  table.items td { border-bottom: 1px solid #E5E7EB; padding: 7px 6px; vertical-align: top; }
  .money { text-align: right; white-space: nowrap; }
  .strong { font-weight: 700; }
  table.totals { width: 300px; margin-left: auto; margin-top: 14px; border-collapse: collapse; }
  table.totals td { padding: 5px 0; border-bottom: 1px solid #E5E7EB; }
  table.totals td.money { text-align: right; }
  tr.grand td { font-size: 15px; font-weight: 800; border-bottom: 2px solid #111827; }
  tr.credit td { color: #1b6b3a; }
  tr.due td { font-size: 16px; font-weight: 800; border-bottom: 2px solid #111827; }
  .section { margin-top: 16px; }
  .pay { margin-top: 16px; border: 1px solid #D1D5DB; padding: 10px; page-break-inside: avoid; }
  .pay h4 { margin: 0 0 6px; font-size: 12px; }
  .pay .opt { padding: 6px 0; border-top: 1px solid #E5E7EB; }
  .pay .opt:first-of-type { border-top: 0; }
  .btn { display: inline-block; background: #111827; color: #fff !important; text-decoration: none;
         padding: 9px 18px; border-radius: 4px; font-weight: 700; margin-top: 6px; }
  .zelle { border: 1px solid #D1D5DB; padding: 6px; }
  .zelle img { width: .78in; height: .78in; object-fit: contain; display: block; }
  .foot { margin-top: 22px; border-top: 1px solid #E5E7EB; padding-top: 10px; color: #6B7280; font-size: 11px; }
  .noprint button { font: 13px Arial, sans-serif; padding: 9px 18px; cursor: pointer; background: #111827;
                    color: #fff; border: 0; border-radius: 4px; }
  @media print { .noprint { display: none !important; } }
`;

/**
 * @param {object} doc  from buildInvoiceDocument
 * @param {object} opts { logoSrc, zelleQrSrc, standalone, order }
 *   `order` is passed only so the finished HTML can be checked for cost-basis leakage.
 */
export function renderCustomInvoiceHtml(doc, opts = {}) {
  const { logoSrc = '', zelleQrSrc = '', standalone = true, order = null } = opts;
  const isReceipt = doc.isReceipt;

  const zellePanel = zelleQrSrc ? `
    <td width="200" class="zelle">
      <table cellpadding="0" cellspacing="0"><tr>
        <td width="80"><img src="${esc(zelleQrSrc)}" alt="Zelle payment QR" /></td>
        <td style="padding-left:7px">
          <div class="label">Zelle</div>
          <div><strong>Memo:</strong> <span class="mono">${esc(doc.orderNumber)}</span></div>
          <div class="muted">Verified by staff</div>
        </td>
      </tr></table>
    </td>` : '';

  // Payments ledger. On a receipt the row for THIS payment is emphasised so the customer can see which
  // one they are holding among several instalments.
  const paymentRows = (doc.paymentsApplied || []).map((p) => `
    <tr${p.isThisDocument ? ' class="strong"' : ''}>
      <td class="mono">${esc(p.invoiceNumber)}${p.isThisDocument ? ' &larr; this payment' : ''}</td>
      <td>${esc((p.method || '').toUpperCase())}</td>
      <td>${esc(p.paidOn)}</td>
      <td class="money">${money(p.amount)}</td>
    </tr>`).join('');

  const payOptions = (doc.paymentOptions || []).map((o) => `
    <div class="opt">
      <strong>${esc(o.method)}</strong> &mdash; ${esc(o.detail)}
      ${o.actionUrl ? `<div><a class="btn" href="${esc(o.actionUrl)}">${esc(o.actionLabel || 'Pay online')}</a></div>` : ''}
    </div>`).join('');

  const body = `
  <div class="sheet">
    ${standalone ? '<div class="noprint" style="text-align:right;margin-bottom:8px"><button onclick="window.print()">Print</button></div>' : ''}

    <table class="hd" cellpadding="0" cellspacing="0"><tr>
      <td valign="top">
        <table cellpadding="0" cellspacing="0"><tr>
          ${logoSrc ? `<td width="70" valign="top"><img src="${esc(logoSrc)}" alt="Engel Fine Design" style="width:62px" /></td>` : ''}
          <td valign="top">
            <div class="brand">${esc(doc.businessName)}</div>
            <div class="contact">${esc(BRAND.address)}<br />${esc(BRAND.phone)}</div>
          </td>
        </tr></table>
      </td>
      ${zellePanel}
      <td valign="top" class="title">
        ${esc(doc.title)}<br />
        <span class="mono" style="font-size:13px">${esc(doc.invoiceNumber)}</span>
        <div class="muted">Order ${esc(doc.orderNumber)}</div>
        <div class="muted">${isReceipt ? `Paid ${esc(doc.paidOn)}` : `Issued ${esc(doc.issuedOn)}`}</div>
        ${doc.isPaid ? `<div class="paidstamp">Paid${doc.paymentMethod ? ` &middot; ${esc(doc.paymentMethod)}` : ''}</div>` : ''}
      </td>
    </tr></table>

    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td class="box" width="50%">
        <div class="label">Billed to</div>
        <div class="value">${esc(doc.customerName)}</div>
        <div class="muted">${esc(doc.customerEmail)}</div>
      </td>
      <td width="10"></td>
      <td class="box" width="50%">
        <div class="label">${isReceipt ? 'Payment received' : 'Amount due on this invoice'}</div>
        <div class="value">${money(doc.documentAmount)}</div>
        <div class="muted">${isReceipt && doc.paymentMethod ? `${esc(doc.paymentMethod)} &middot; ${esc(doc.paidOn)}` : `${doc.paymentProgress}% of the project paid to date`}</div>
      </td>
    </tr></table>

    <div class="section">
      <table class="items">
        <thead><tr><th>Description</th><th class="money">Amount</th></tr></thead>
        <tbody><tr>
          <td><span class="strong">${esc(doc.description)}</span><div class="muted">${esc(doc.descriptionDetail)}</div></td>
          <td class="money">${money(doc.subtotal)}</td>
        </tr></tbody>
      </table>
    </div>

    <table class="totals" cellpadding="0" cellspacing="0">
      <tr><td>Subtotal</td><td class="money">${money(doc.subtotal)}</td></tr>
      <tr><td>Sales tax (${esc(doc.taxRateLabel)})</td><td class="money">${money(doc.taxAmount)}</td></tr>
      <tr class="grand"><td>Project total</td><td class="money">${money(doc.projectTotal)}</td></tr>
      ${doc.totalPaid > 0 ? `<tr class="credit"><td>Payments received</td><td class="money">&minus;${money(doc.totalPaid)}</td></tr>` : ''}
      <tr class="due"><td>${doc.balanceDue > 0 ? 'Balance due' : 'Paid in full'}</td><td class="money">${money(doc.balanceDue)}</td></tr>
    </table>

    ${paymentRows ? `
    <div class="section">
      <div class="label">Payments applied</div>
      <table class="items">
        <thead><tr><th>Invoice</th><th>Method</th><th>Date</th><th class="money">Amount</th></tr></thead>
        <tbody>${paymentRows}</tbody>
      </table>
    </div>` : ''}

    ${payOptions ? `
    <div class="pay">
      <h4>${doc.balanceDue > 0 ? `How to pay the remaining ${money(doc.balanceDue)}` : 'Payment options'}</h4>
      ${payOptions}
    </div>` : ''}

    <div class="foot">
      ${isReceipt
        ? `Thank you. This receipt records ${money(doc.documentAmount)}${doc.paymentMethod ? ` paid by ${esc(doc.paymentMethod)}` : ''} toward ${esc(doc.orderNumber)}.`
        : `Please reference ${esc(doc.orderNumber)} with any payment.`}
      ${doc.balanceDue > 0
        ? ` A balance of <strong>${money(doc.balanceDue)}</strong> remains${isReceipt ? ', due on completion' : ''}.`
        : ' This project is paid in full.'}
    </div>
  </div>`;

  const html = standalone
    ? `<!doctype html><html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><title>${esc(doc.invoiceNumber)} ${esc(doc.title)}</title><style>${CSS}</style></head><body>${body}</body></html>`
    : `<div><style>${CSS}</style>${body}</div>`;

  // Fail loudly rather than post a customer their own buy price. Only possible when the caller hands us
  // the order; the API routes always do.
  if (order) assertNoCostBasis(html, order);
  return html;
}
