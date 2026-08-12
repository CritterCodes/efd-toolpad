import { money } from '@/services/customs/customInvoiceDocument';
import { THEME as T, esc, emailButton, detailBox, sectionHeading, renderEmailShell } from '../../../lib/emailTheme.js';

/**
 * The invoice/receipt as an EMAIL, in the EFD theme.
 *
 * Separate from `customInvoiceHtml.js` on purpose. That builds the PRINT document — letter `@page`,
 * widths in inches, a <style> block — and I wrongly used it as the email body, so it arrived unstyled
 * and mis-sized in the inbox. Print and email share the document MODEL and nothing else: same numbers,
 * medium-appropriate presentation.
 *
 * Everything is inline-styled and table-laid-out because email clients are not browsers (see
 * lib/emailTheme.js).
 */

const cell = `padding:10px 8px;border-bottom:1px solid ${T.border};font-size:14px`;
const label = `color:${T.textMuted};font-size:11px;text-transform:uppercase;letter-spacing:.08em`;

function totalsRow(name, value, { strong = false, gold = false, rule = false } = {}) {
  return `<tr>
    <td style="padding:6px 0;${rule ? `border-top:1px solid ${T.border};` : ''}color:${gold ? T.gold : T.text};
      font-size:${strong ? '16px' : '14px'};font-weight:${strong ? '700' : '400'}">${esc(name)}</td>
    <td align="right" style="padding:6px 0;${rule ? `border-top:1px solid ${T.border};` : ''}
      color:${gold ? T.gold : T.text};font-size:${strong ? '16px' : '14px'};
      font-weight:${strong ? '700' : '400'};white-space:nowrap">${money(value)}</td>
  </tr>`;
}

/** @param {object} doc from buildInvoiceDocument / buildCombinedInvoiceDocument */
export function renderCustomInvoiceEmail(doc, { logoSrc = '' } = {}) {
  const isReceipt = doc.isReceipt;

  const items = (doc.lineItems && doc.lineItems.length)
    ? doc.lineItems
    : [{ label: doc.description, detail: doc.descriptionDetail, amount: doc.subtotal }];

  const lineRows = items.map((l) => `<tr>
    <td style="${cell};color:${T.text}"><strong>${esc(l.label)}</strong>
      ${l.detail ? `<div style="color:${T.textMuted};font-size:12px">${esc(l.detail)}</div>` : ''}</td>
    <td align="right" style="${cell};color:${T.text};white-space:nowrap">${money(l.amount)}</td>
  </tr>`).join('');

  const payments = (doc.paymentsApplied || []).map((p) => `<tr>
    <td style="${cell};color:${T.textMuted};font-size:13px">${esc(p.paidOn)}
      ${p.method ? `&middot; ${esc(p.method)}` : ''}${p.isThisDocument ? ' &larr; this payment' : ''}</td>
    <td align="right" style="${cell};color:${T.text};white-space:nowrap">${money(p.amount)}</td>
  </tr>`).join('');

  // The headline figure: what they paid (receipt) or what is due (invoice). One number, gold, large —
  // an email is skimmed, so the thing they must act on cannot be buried in a totals table.
  const headline = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"
    style="margin:0 0 24px"><tr><td align="center">
    <div style="${label}">${isReceipt ? 'Payment received' : 'Amount due'}</div>
    <div style="font-size:32px;font-weight:700;color:${T.gold};margin-top:4px">${money(doc.documentAmount)}</div>
    ${doc.balanceDue > 0
      ? `<div style="color:${T.textMuted};font-size:13px;margin-top:6px">
          ${isReceipt ? 'Remaining balance' : 'Balance on this project'} ${money(doc.balanceDue)}</div>`
      : `<div style="color:${T.gold};font-size:13px;margin-top:6px">Paid in full &mdash; thank you</div>`}
  </td></tr></table>`;

  const meta = detailBox(`
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px">
      <tr><td style="${label}">${isReceipt ? 'Receipt' : 'Invoice'}</td>
          <td align="right" style="font-family:${T.mono};color:${T.text}">${esc(doc.invoiceNumber)}</td></tr>
      <tr><td style="${label}">Order</td>
          <td align="right" style="font-family:${T.mono};color:${T.text}">${esc(doc.orderNumber)}</td></tr>
      <tr><td style="${label}">${isReceipt ? 'Paid' : 'Issued'}</td>
          <td align="right" style="color:${T.text}">${esc(isReceipt ? doc.paidOn : doc.issuedOn)}</td></tr>
    </table>`);

  // Payment options, minus the card row — the button below is the card route, so repeating it as a
  // bullet would give two competing calls to action.
  const options = (doc.paymentOptions || []).filter((o) => o.method !== 'Card');
  const optionsBlock = options.length ? `
    <div style="margin-top:28px">
      ${sectionHeading(doc.balanceDue > 0 ? 'Other ways to pay' : 'Payment options')}
      ${options.map((o) => `<div style="margin-bottom:12px;font-size:14px;color:${T.text}">
        <strong style="color:${T.gold}">${esc(o.method)}</strong>
        <div style="color:${T.textMuted};font-size:13px">${esc(o.detail)}</div>
      </div>`).join('')}
    </div>` : '';

  const bodyHtml = `
    ${headline}
    ${doc.customerName ? `<p style="margin:0 0 20px;font-size:16px;color:${T.text}">Hi ${esc(doc.customerName.split(' ')[0])},</p>` : ''}
    <p style="margin:0 0 20px;color:${T.text}">
      ${isReceipt
        ? `Thank you &mdash; we have received ${money(doc.documentAmount)}${doc.paymentMethod ? ` by ${esc(doc.paymentMethod)}` : ''} toward your custom piece.`
        : 'Here is your invoice for your custom piece. Details are below, and you can pay online at any time.'}
    </p>
    ${meta}

    <div style="margin-top:28px">
      ${sectionHeading('Your piece')}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${lineRows}</table>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px">
        ${totalsRow('Subtotal', doc.subtotal)}
        ${totalsRow(`Sales tax (${doc.taxRateLabel})`, doc.taxAmount)}
        ${totalsRow(doc.isCombined ? (isReceipt ? 'Amount paid' : 'Amount due') : 'Project total', doc.isCombined ? doc.documentAmount : doc.projectTotal, { rule: true, strong: true })}
        ${doc.totalPaid > 0 && !doc.isCombined ? totalsRow('Payments received', -doc.totalPaid) : ''}
        ${totalsRow(doc.balanceDue > 0 ? 'Balance due' : 'Paid in full', doc.balanceDue, { rule: true, strong: true, gold: true })}
      </table>
    </div>

    ${payments ? `<div style="margin-top:28px">${sectionHeading('Payments applied')}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${payments}</table></div>` : ''}

    ${doc.balanceDue > 0 && doc.portalUrl
      ? `<table role="presentation" width="100%"><tr><td align="center">
          ${emailButton(doc.portalUrl, 'Pay online')}
          <div style="color:${T.textMuted};font-size:12px">Pay any amount toward your balance</div>
        </td></tr></table>`
      : ''}

    ${optionsBlock}`;

  return renderEmailShell({
    title: isReceipt ? 'Receipt' : 'Invoice',
    bodyHtml,
    logoSrc,
    preheader: isReceipt
      ? `${money(doc.documentAmount)} received for ${doc.orderNumber}`
      : `${money(doc.documentAmount)} due for ${doc.orderNumber}`,
    footerNote: `Reference ${esc(doc.orderNumber)} with any payment.`,
  });
}
