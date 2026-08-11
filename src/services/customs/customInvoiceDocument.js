import { computePaymentProgress, invoicesForOrder, amountForOrder } from '@/services/customs/paymentProgress';

/**
 * THE CUSTOMER-FACING DOCUMENT for a custom-order invoice or receipt. Pure: hand it the order, the
 * invoice, and every invoice on that order, and it returns the model. No DB, no formatting decisions
 * beyond money/date strings — so the print page and the email template render the SAME numbers.
 *
 * WHY ONE MODEL. The printed copy and the emailed copy are the same legal document, and the failure
 * mode when they are built separately is silent: two renderers drift, the customer's email says one
 * balance and the paper in their hand says another, and nobody notices until a dispute. Every number
 * here is computed once.
 *
 * WHAT IT DELIBERATELY OMITS: the quote breakdown. `quote` carries EFD's cost basis — the stone at
 * cost, per-line markups, cogMarkup, the centre-stone markup. Itemising a custom job to the customer
 * hands over the buy price on their own diamond. The document shows ONE description line at the
 * marked-up subtotal, then tax, payments and balance. `assertNoCostBasis` below is the guard.
 *
 * BALANCE APPEARS ON BOTH. An invoice states what is still owed; a receipt states what was paid AND
 * what remains, because a custom job is paid in instalments and "receipt" without a balance is how a
 * customer comes to believe they are square when they owe another $1,617.
 */

export const DOC_KIND = { INVOICE: 'invoice', RECEIPT: 'receipt' };

const n = (v) => Number(v) || 0;
const round = (v) => Math.round(n(v) * 100) / 100;

export function money(value) {
  const v = n(value);
  const s = Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${v < 0 ? '-' : ''}$${s}`;
}

/** Fixed timezone: the shop is in Fort Smith, and a date on an invoice must not shift by viewer. */
export function docDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/Chicago' });
}

/**
 * A plain-English description of the piece, built from the quote's ITEM NAMES only — never its costs.
 */
export function describePiece(quote = {}) {
  const parts = [quote.mounting?.item, quote.centerstone?.item].filter((x) => String(x || '').trim());
  if (!parts.length) return 'Custom piece';
  return parts.join(' with ');
}

/**
 * How a customer may pay a remaining balance. Zelle is deliberately explicit that verification is
 * MANUAL: the customer sends money and nothing happens automatically, so if the document doesn't say a
 * human has to confirm it, the silence reads as a lost payment and generates a phone call.
 */
export function paymentInstructions({ portalUrl, zelleHandle, balanceDue }) {
  if (n(balanceDue) <= 0) return [];
  const options = [];
  if (portalUrl) {
    options.push({
      method: 'Card',
      detail: 'Pay online by card through your custom order portal.',
      actionUrl: portalUrl,
      actionLabel: 'Pay online',
    });
  }
  // Zelle is ALWAYS offered: the QR panel in the header is the instruction, exactly as on the repair
  // invoice, so it works whether or not a handle string is configured in settings.
  options.push({
    method: 'Zelle',
    detail: `${zelleHandle ? `Send to ${zelleHandle}, or scan` : 'Scan'} the QR code on this document. `
      + 'Zelle payments are verified by hand — once a member of staff confirms yours, we will email '
      + 'your receipt. Please put your order number in the memo so we can match it.',
  });
  options.push({ method: 'Cash or card in store', detail: 'Pay in person and we will print your receipt on the spot.' });
  return options;
}

/**
 * Build the document model.
 *
 * @param {object}   order        the custom order (needs quote + customer fields)
 * @param {object}   invoice      the invoice this document is FOR
 * @param {object[]} allInvoices  every invoice on the order — needed for payments-applied and balance
 * @param {object}   opts         { kind, businessName, portalUrl, zelleHandle }
 */
export function buildInvoiceDocument(order = {}, invoice = {}, allInvoices = [], opts = {}) {
  const kind = opts.kind === DOC_KIND.RECEIPT ? DOC_KIND.RECEIPT : DOC_KIND.INVOICE;
  const quote = order.quote || {};

  // Bill against the TAX-INCLUSIVE total, matching customInvoices.service progressFor. Falling back to
  // the pre-tax quoteTotal keeps orders quoted before sales tax existed computing.
  const projectTotal = round(quote.total ?? quote.quoteTotal ?? 0);
  const subtotal = round(quote.quoteTotal ?? 0);
  const taxAmount = round(quote.taxAmount ?? 0);
  const taxRate = n(quote.taxRate);

  const invoices = Array.isArray(allInvoices) && allInvoices.length ? allInvoices : [invoice];
  // Allocated to THIS order. Identical to the raw amounts for a single-order invoice; for a combined
  // invoice it takes only this order's billed share, so the balance shown is this order's balance.
  const orderInvoices = invoicesForOrder(invoices, order.customID || invoice.customID);
  const progress = computePaymentProgress(projectTotal, orderInvoices);

  // Every settled payment, oldest first — the ledger the customer can reconcile against.
  const thisOrder = order.customID || invoice.customID;
  const paymentsApplied = invoices
    .filter((i) => i && i.status === 'paid' && amountForOrder(i, thisOrder) > 0)
    .sort((a, b) => new Date(a.paidAt || a.createdAt || 0) - new Date(b.paidAt || b.createdAt || 0))
    .map((i) => ({
      invoiceNumber: i.invoiceNumber,
      // THIS ORDER'S SHARE, not the invoice's face value. A combined invoice covering two rings would
      // otherwise show the full amount on each ring's document, so the ledger would not reconcile
      // against the balance directly beneath it.
      amount: round(amountForOrder(i, thisOrder)),
      method: i.paymentMethod || null,
      paidOn: docDate(i.paidAt),
      // True when the payment covers several orders, so the line can say what else it paid for.
      isCombined: Array.isArray(i.orderSnapshots) && i.orderSnapshots.length > 1,
      isThisDocument: i.invoiceID === invoice.invoiceID,
    }));

  const balanceDue = progress.remainingAmount;

  return {
    kind,
    isReceipt: kind === DOC_KIND.RECEIPT,
    title: kind === DOC_KIND.RECEIPT ? 'Receipt' : 'Invoice',
    businessName: opts.businessName || 'Engel Fine Design',

    invoiceNumber: invoice.invoiceNumber || invoice.invoiceID || '',
    orderNumber: order.customID || invoice.customID || '',
    issuedOn: docDate(invoice.createdAt),
    paidOn: docDate(invoice.paidAt),
    isPaid: invoice.status === 'paid',
    paymentMethod: invoice.paymentMethod || null,

    customerName: order.customerName || '',
    customerEmail: invoice.customerEmail || order.customerEmail || '',

    description: describePiece(quote),
    // Kept vague on purpose — it names the WORK, not the cost lines behind it.
    descriptionDetail: 'Design, casting, bench work and stone setting.',
    // ONE line here; a combined invoice supplies several. The renderer iterates this, so both shapes
    // go through the same table and cannot drift apart.
    lineItems: [{
      label: describePiece(quote),
      detail: 'Design, casting, bench work and stone setting.',
      amount: subtotal,
    }],
    isCombined: false,

    subtotal,
    taxRate,
    taxRateLabel: `${(taxRate * 100).toFixed(3).replace(/0+$/, '').replace(/\.$/, '')}%`,
    taxAmount,
    projectTotal,

    // The amount THIS document is about: what was received (receipt) or what is being asked (invoice).
    // For a combined invoice this is still the FULL amount — the customer pays it as one payment, so
    // the figure they act on is the whole thing. The per-order split appears in the ledger above.
    documentAmount: round(invoice.amount),
    // Set when this invoice covers more than one order, so a renderer can list them.
    coversOrders: Array.isArray(invoice.orderSnapshots) && invoice.orderSnapshots.length > 1
      ? invoice.orderSnapshots.map((s) => ({ orderNumber: s.customID, description: s.description || '', amount: round(s.amount) }))
      : [],
    paymentsApplied,
    totalPaid: progress.totalPaid,
    balanceDue,
    isFullyPaid: progress.isFullyPaid,
    paymentProgress: progress.paymentProgress,

    paymentOptions: paymentInstructions({
      portalUrl: opts.portalUrl,
      zelleHandle: opts.zelleHandle,
      balanceDue: kind === DOC_KIND.RECEIPT && balanceDue <= 0 ? 0 : balanceDue,
    }),
    portalUrl: opts.portalUrl || '',
  };
}

/**
 * THE DOCUMENT FOR A COMBINED INVOICE — one invoice covering several custom orders.
 *
 * Shaped differently from a single-order document on purpose. A single-order invoice is a statement
 * about one project: its full price, tax, everything paid, what remains. A combined invoice is a
 * statement about ONE PAYMENT spanning projects, so the body lists what is being billed for each order
 * and totals to the amount the customer actually pays. Showing each order's full project price here
 * would put four large numbers on a page whose point is a single figure to settle.
 *
 * Amounts on an invoice are TAX-INCLUSIVE (see customInvoices model), so the subtotal and tax lines are
 * backed OUT of them: tax = amount × rate / (1 + rate). Presenting the billed amount as a pre-tax
 * subtotal and then adding tax on top would overstate the total by the tax on the tax.
 *
 * @param {object[]} orders    every order the invoice covers
 * @param {object}   invoice   the combined invoice
 * @param {object[]} invoices  every invoice touching any of those orders — for the group balance
 */
export function buildCombinedInvoiceDocument(orders = [], invoice = {}, invoices = [], opts = {}) {
  const kind = opts.kind === DOC_KIND.RECEIPT ? DOC_KIND.RECEIPT : DOC_KIND.INVOICE;
  const byId = new Map(orders.map((o) => [o.customID, o]));
  const snapshots = Array.isArray(invoice.orderSnapshots) ? invoice.orderSnapshots : [];

  const lineItems = snapshots.map((s) => {
    const order = byId.get(s.customID);
    return {
      label: s.description || (order ? describePiece(order.quote) : 'Custom piece'),
      detail: `Order ${s.customID}`,
      amount: round(s.amount),
      orderNumber: s.customID,
    };
  });

  const documentAmount = round(invoice.amount);
  // Back the tax out of the tax-inclusive amounts, per line, so mixed rates stay correct.
  const taxAmount = round(snapshots.reduce((sum, s) => {
    const rate = n(s.taxRate ?? invoice.taxRate);
    return sum + (n(s.amount) * rate) / (1 + rate);
  }, 0));
  const subtotal = round(documentAmount - taxAmount);
  const blendedRate = subtotal > 0 ? taxAmount / subtotal : n(invoice.taxRate);

  // What remains across ALL the covered orders once this invoice is settled — the customer's real
  // position. Each order's own share of every invoice, summed.
  const groupBalance = round(orders.reduce((sum, order) => {
    const projectTotal = n(order.quote?.total ?? order.quote?.quoteTotal);
    const p = computePaymentProgress(projectTotal, invoicesForOrder(invoices, order.customID));
    return sum + p.remainingAmount;
  }, 0));

  const paymentsApplied = (invoices || [])
    .filter((i) => i && i.status === 'paid' && orders.some((o) => amountForOrder(i, o.customID) > 0))
    .sort((a, b) => new Date(a.paidAt || a.createdAt || 0) - new Date(b.paidAt || b.createdAt || 0))
    .map((i) => ({
      invoiceNumber: i.invoiceNumber,
      amount: round(orders.reduce((sum, o) => sum + amountForOrder(i, o.customID), 0)),
      method: i.paymentMethod || null,
      paidOn: docDate(i.paidAt),
      isCombined: Array.isArray(i.orderSnapshots) && i.orderSnapshots.length > 1,
      isThisDocument: i.invoiceID === invoice.invoiceID,
    }));

  const primary = orders[0] || {};
  return {
    kind,
    isReceipt: kind === DOC_KIND.RECEIPT,
    isCombined: true,
    title: kind === DOC_KIND.RECEIPT ? 'Receipt' : 'Invoice',
    businessName: opts.businessName || 'Engel Fine Design',

    invoiceNumber: invoice.invoiceNumber || invoice.invoiceID || '',
    // Several orders, so no single order number heads the document.
    orderNumber: orders.map((o) => o.customID).join(', '),
    orderNumbers: orders.map((o) => o.customID),
    issuedOn: docDate(invoice.createdAt),
    paidOn: docDate(invoice.paidAt),
    isPaid: invoice.status === 'paid',
    paymentMethod: invoice.paymentMethod || null,

    customerName: primary.customerName || '',
    customerEmail: invoice.customerEmail || primary.customerEmail || '',

    description: lineItems.map((l) => l.label).join(' + '),
    descriptionDetail: `Covers ${orders.length} custom orders.`,
    lineItems,

    subtotal,
    taxRate: blendedRate,
    taxRateLabel: `${(blendedRate * 100).toFixed(3).replace(/0+$/, '').replace(/\.$/, '')}%`,
    taxAmount,
    // For a combined invoice the "project total" IS this payment: the document exists to state one
    // figure to settle, not to restate the price of every project it touches.
    projectTotal: documentAmount,
    documentAmount,

    paymentsApplied,
    totalPaid: round(paymentsApplied.reduce((s, p) => s + p.amount, 0)),
    balanceDue: kind === DOC_KIND.RECEIPT ? groupBalance : documentAmount,
    groupBalance,
    isFullyPaid: groupBalance <= 0,
    paymentProgress: 0,

    paymentOptions: paymentInstructions({
      portalUrl: opts.portalUrl,
      zelleHandle: opts.zelleHandle,
      balanceDue: kind === DOC_KIND.RECEIPT ? groupBalance : documentAmount,
    }),
    portalUrl: opts.portalUrl || '',
    coversOrders: lineItems.map((l) => ({ orderNumber: l.orderNumber, description: l.label, amount: l.amount })),
  };
}

/**
 * Guard: fail loudly if any cost-basis figure reaches a customer document.
 *
 * Called by the renderers rather than trusted by convention, because the leak this prevents is
 * invisible in review — a template adding `{{quote.centerstone.cost}}` looks like any other field, and
 * the resulting document reveals what EFD paid for the customer's diamond. Compares against the actual
 * cost values on the order, so it cannot go stale as the quote shape changes.
 */
export function assertNoCostBasis(rendered, order = {}) {
  const quote = order.quote || {};
  const secrets = [
    quote.centerstone?.cost, quote.mounting?.cost, quote.cog, quote.cogMarkup, quote.centerstoneMarkup,
    ...(quote.accentStones || []).map((x) => x?.cost),
    ...(quote.additionalMaterials || []).map((x) => x?.cost),
    ...(quote.laborTasks || []).map((x) => x?.cost),
  ];
  const text = String(rendered);
  for (const raw of secrets) {
    const v = n(raw);
    if (v <= 0) continue;
    // Match the number as it would be WRITTEN — bare and comma-grouped, on a value boundary.
    for (const form of [v.toFixed(2), String(v), v.toLocaleString('en-US', { minimumFractionDigits: 2 })]) {
      if (new RegExp(`(^|[^\\d.])${form.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^\\d]|$)`).test(text)) {
        throw new Error(`Customer document leaked a cost-basis figure (${form}). Show the marked-up price only.`);
      }
    }
  }
  return true;
}
