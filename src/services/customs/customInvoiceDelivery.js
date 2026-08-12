import CustomOrdersModel from '@/app/api/custom-orders/model';
import CustomInvoicesModel, { invoiceCovers } from '@/app/api/custom-orders/invoices/model';
import SettingsManagerService from '@/app/api/admin/settings/services/settingsManager.service';
import { buildInvoiceDocument, buildCombinedInvoiceDocument, assertNoCostBasis, DOC_KIND, money } from '@/services/customs/customInvoiceDocument';
import { renderCustomInvoiceHtml } from '@/services/customs/customInvoiceHtml';
import { renderCustomInvoiceEmail } from '@/services/customs/customInvoiceEmail';
import { adminBase, portalLink } from '@/lib/appUrls';
import { sendEmailWithRetry } from '../../../lib/email.js';

/**
 * CUSTOM-ORDER INVOICE + RECEIPT DELIVERY — internal EFD documents, no Stripe hosted invoice.
 *
 * The flow this serves:
 *   quote → EFD invoice → invoice email (printable, links to the shop portal for card, explains Zelle)
 *   cash / card in store → staff mark paid  → receipt emailed + printable at the counter
 *   Zelle                → staff verify    → mark paid → receipt emailed
 *
 * Previously the customer's invoice email existed only as a side effect of creating a Stripe hosted
 * invoice, which is why `invoice-created` was deliberately `channels: ['inApp']` — EFD never sent an
 * invoice itself. Now it does, and Stripe is not involved in billing a custom order at all.
 *
 * Email goes through sendEmailWithRetry directly rather than NotificationService, because these are
 * documents, not notices: the body is the pre-rendered document, and a caller needs the true delivery
 * outcome to store on the invoice. The in-app/push notice is still raised separately by the callers.
 */

const ASSET = (path) => `${adminBase()}${path}`;

/** Everything the document needs, loaded once. */
export async function loadInvoiceContext(customID, invoiceID) {
  const [order, invoice, settings] = await Promise.all([
    CustomOrdersModel.findById(customID),
    CustomInvoicesModel.findById(invoiceID),
    SettingsManagerService.getSettings().catch(() => ({})),
  ]);
  if (!order) throw new Error('Custom order not found.');
  // A combined invoice's `customID` is its PRIMARY order, but it legitimately belongs to every order in
  // `customIDs` — so accept either, or printing a combined invoice from the second order 404s.
  const covers = Array.isArray(invoice?.customIDs) && invoice.customIDs.length
    ? invoice.customIDs
    : [invoice?.customID];
  if (!invoiceCovers(invoice, customID)) throw new Error('Invoice not found.');

  // COMBINED: load every covered order, and every invoice touching any of them, so the document can
  // state the balance across the group rather than just this order's slice.
  const isCombined = covers.length > 1;
  const orders = isCombined
    ? (await Promise.all(covers.map((id) => CustomOrdersModel.findById(id)))).filter(Boolean)
    : [order];
  const invoiceLists = await Promise.all(orders.map((o) => CustomInvoicesModel.listByCustom(o.customID)));
  // De-duplicate: a combined invoice appears in every covered order's list.
  const allInvoices = [...new Map(invoiceLists.flat().map((i) => [i.invoiceID, i])).values()]
    .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));

  return { order, orders, invoice, allInvoices, settings, isCombined };
}

/**
 * Build the document model + rendered HTML for one invoice.
 * @param {'invoice'|'receipt'} kind
 */
/**
 * @param {object} opts
 *   medium — 'print' (letter-size document) or 'email' (600px EFD themed message). The document MODEL is
 *            the same either way; only the presentation differs. Using the print document as an email
 *            body is what made the first invoice email arrive unstyled: @page rules, inch widths and a
 *            <style> block that clients strip.
 */
export function composeDocument({ order, orders, invoice, allInvoices, settings, isCombined }, kind, { standalone = true, medium = 'print' } = {}) {
  const opts = {
    kind,
    businessName: settings?.business?.name || 'Engel Fine Design',
    // The customer pays a balance by card in the shop portal — admin never takes the card. Deep-linked
    // to the INVOICES tab of THIS request: the Pay button in an invoice email must land on the invoice,
    // not on a list of requests the customer then has to search.
    portalUrl: portalLink(order?.customID || invoice?.customID, 'invoices'),
    zelleHandle: settings?.business?.zelleHandle || '',
  };
  const doc = isCombined
    ? buildCombinedInvoiceDocument(orders || [order], invoice, allInvoices, opts)
    : buildInvoiceDocument(order, invoice, allInvoices, opts);
  const html = medium === 'email'
    // The email uses the shop's theme (dark ground, gold accent, 600px) so admin and shop mail look like
    // one brand. A white-on-dark logo is required against that ground.
    ? renderCustomInvoiceEmail(doc, { logoSrc: ASSET('/logos/%5Befd%5DLogoWhite.png') })
    : renderCustomInvoiceHtml(doc, {
      standalone,
      logoSrc: ASSET('/logos/%5Befd%5DLogoBlack.png'),
      zelleQrSrc: ASSET('/logos/zelle-qr.jpg'),
      // Passing the order arms assertNoCostBasis — a leak throws here rather than reaching a customer.
      order,
    });

  // EVERY covered order, not just the primary. The renderer only ever sees one, so on a combined
  // invoice the second order's stone cost and markups would otherwise go unchecked — and that is the
  // document listing both pieces, so it is exactly where a second order's figures could surface.
  for (const o of (orders || [order]).filter(Boolean)) assertNoCostBasis(html, o, doc);

  return { doc, html };
}

/**
 * Email a document. Returns {sent, error} and NEVER throws: marking an invoice paid is a committed
 * money event, and a dead mail server must not roll it back or 500 the counter.
 */
async function emailDocument({ to, subject, html }) {
  if (!to) return { sent: false, error: 'no customer email on this invoice' };
  try {
    // __html routes past the .hbs template loader — see lib/email.js sendEmail.
    await sendEmailWithRetry({ to, subject, template: 'generic-notification', data: { __html: html } });
    return { sent: true, error: null };
  } catch (e) {
    console.error('[customs] document email failed:', e?.message || e);
    return { sent: false, error: e?.message || String(e) };
  }
}

/** Send the INVOICE to the customer and record the send on the invoice. */
export async function sendCustomInvoiceEmail(customID, invoiceID) {
  const ctx = await loadInvoiceContext(customID, invoiceID);
  const { doc, html } = composeDocument(ctx, DOC_KIND.INVOICE, { standalone: false, medium: 'email' });

  const subject = doc.balanceDue > 0
    ? `Invoice ${doc.invoiceNumber} — ${money(doc.documentAmount)} due for ${doc.orderNumber}`
    : `Invoice ${doc.invoiceNumber} for ${doc.orderNumber}`;
  const result = await emailDocument({ to: doc.customerEmail, subject, html });

  await CustomInvoicesModel.recordDelivery(invoiceID, {
    kind: DOC_KIND.INVOICE, sent: result.sent, error: result.error, to: doc.customerEmail,
  });
  return { doc, delivery: result };
}

/** Send the RECEIPT for a payment just recorded, and record the send. */
export async function sendCustomReceiptEmail(customID, invoiceID) {
  const ctx = await loadInvoiceContext(customID, invoiceID);
  const { doc, html } = composeDocument(ctx, DOC_KIND.RECEIPT, { standalone: false, medium: 'email' });

  const subject = doc.balanceDue > 0
    ? `Receipt — ${money(doc.documentAmount)} received for ${doc.orderNumber} (${money(doc.balanceDue)} remaining)`
    : `Receipt — ${money(doc.documentAmount)} received, ${doc.orderNumber} paid in full`;
  const result = await emailDocument({ to: doc.customerEmail, subject, html });

  await CustomInvoicesModel.recordDelivery(invoiceID, {
    kind: DOC_KIND.RECEIPT, sent: result.sent, error: result.error, to: doc.customerEmail,
  });
  return { doc, delivery: result };
}
