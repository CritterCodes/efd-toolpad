import CustomOrdersModel from '@/app/api/custom-orders/model';
import CustomInvoicesModel from '@/app/api/custom-orders/invoices/model';
import SettingsManagerService from '@/app/api/admin/settings/services/settingsManager.service';
import { buildInvoiceDocument, DOC_KIND, money } from '@/services/customs/customInvoiceDocument';
import { renderCustomInvoiceHtml } from '@/services/customs/customInvoiceHtml';
import { adminBase, shopBase } from '@/lib/appUrls';
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
  const [order, invoice, allInvoices, settings] = await Promise.all([
    CustomOrdersModel.findById(customID),
    CustomInvoicesModel.findById(invoiceID),
    CustomInvoicesModel.listByCustom(customID),
    SettingsManagerService.getSettings().catch(() => ({})),
  ]);
  if (!order) throw new Error('Custom order not found.');
  if (!invoice || invoice.customID !== customID) throw new Error('Invoice not found.');
  return { order, invoice, allInvoices, settings };
}

/**
 * Build the document model + rendered HTML for one invoice.
 * @param {'invoice'|'receipt'} kind
 */
export function composeDocument({ order, invoice, allInvoices, settings }, kind, { standalone = true } = {}) {
  const doc = buildInvoiceDocument(order, invoice, allInvoices, {
    kind,
    businessName: settings?.business?.name || 'Engel Fine Design',
    // The customer pays a balance by card in the shop portal — admin never takes the card.
    portalUrl: `${shopBase()}/custom-work/portal`,
    zelleHandle: settings?.business?.zelleHandle || '',
  });
  const html = renderCustomInvoiceHtml(doc, {
    standalone,
    logoSrc: ASSET('/logos/%5Befd%5DLogoBlack.png'),
    zelleQrSrc: ASSET('/logos/zelle-qr.jpg'),
    // Passing the order arms assertNoCostBasis — a leak throws here rather than reaching a customer.
    order,
  });
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
  const { doc, html } = composeDocument(ctx, DOC_KIND.INVOICE, { standalone: false });

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
  const { doc, html } = composeDocument(ctx, DOC_KIND.RECEIPT, { standalone: false });

  const subject = doc.balanceDue > 0
    ? `Receipt — ${money(doc.documentAmount)} received for ${doc.orderNumber} (${money(doc.balanceDue)} remaining)`
    : `Receipt — ${money(doc.documentAmount)} received, ${doc.orderNumber} paid in full`;
  const result = await emailDocument({ to: doc.customerEmail, subject, html });

  await CustomInvoicesModel.recordDelivery(invoiceID, {
    kind: DOC_KIND.RECEIPT, sent: result.sent, error: result.error, to: doc.customerEmail,
  });
  return { doc, delivery: result };
}
