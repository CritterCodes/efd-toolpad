/**
 * Custom-order payment progress (S7c) — preserves the legacy custom-ticket behavior:
 * % of the project total paid, with the **50% → production-ready** threshold. Pure;
 * the order's `quote.quoteTotal` is the project total, invoices are the new
 * single-source `customInvoices` records.
 */
function round(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

/**
 * THE PORTION OF AN INVOICE THAT BELONGS TO ONE ORDER.
 *
 * A combined invoice covers several custom orders — a client with two bands in, a wedding set booked
 * as two orders. It carries `orderSnapshots[]`, each naming an order and the amount billed for it, so
 * allocation is EXPLICIT rather than inferred.
 *
 * Deliberately not pro-rata. Splitting a lump payment by share of total sounds fair and is wrong here:
 * each order advances to production at 50% paid and spawns its own work orders, so a fuzzy split starts
 * bench work on the wrong ring. An invoice states what each order is being billed, and that is what
 * gets credited.
 *
 * Single-order invoices have no snapshots and simply return their full amount.
 */
export function amountForOrder(invoice = {}, customID) {
  const snapshots = invoice.orderSnapshots;
  if (Array.isArray(snapshots) && snapshots.length > 0) {
    return snapshots
      .filter((s) => s && s.customID === customID)
      .reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
  }

  // No snapshots. Which orders does it cover?
  const covered = Array.isArray(invoice.customIDs) && invoice.customIDs.length
    ? invoice.customIDs
    : [invoice.customID].filter(Boolean);

  // Spanning several orders with nothing saying how to split them is unallocatable, and GUESSING is
  // the expensive option in both directions: credit it whole to each and two rings start production on
  // one payment; credit it to neither and a customer who has paid waits on a bench that never starts.
  // This shape should be impossible — combined invoices are created with snapshots — so if it appears,
  // it is corrupt data and must be seen rather than silently absorbed.
  if (covered.length > 1) {
    throw new Error(
      `Invoice ${invoice.invoiceID || '(unknown)'} covers ${covered.length} orders but carries no `
      + 'orderSnapshots, so its payment cannot be allocated. Repair the invoice before billing.',
    );
  }

  // Ordinary single-order invoice: wholly its own order's, and nothing to anyone else's.
  return covered[0] === customID ? Number(invoice.amount) || 0 : 0;
}

/** Re-express a mixed list of invoices as this order's share of each. */
export function invoicesForOrder(invoices = [], customID) {
  return (invoices || [])
    .map((i) => ({ ...i, amount: amountForOrder(i, customID) }))
    .filter((i) => i.amount > 0);
}

export function computePaymentProgress(projectTotal, invoices = []) {
  const total = Number(projectTotal) || 0;
  const paid = (invoices || [])
    .filter((i) => i.status === 'paid')
    .reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const pending = (invoices || [])
    .filter((i) => i.status !== 'paid' && i.status !== 'cancelled')
    .reduce((s, i) => s + (Number(i.amount) || 0), 0);

  const paymentProgress = total > 0 ? Math.round((paid / total) * 1000) / 10 : 0;

  // COMPARE IN WHOLE CENTS. Summing decimal amounts in binary floating point leaves a fraction of a
  // cent behind: 5500 + 1617.56 is 7117.5599999999995, so an order paid EXACTLY to its $7,117.56 total
  // reported `isFullyPaid: false`. The customer's receipt then declines to say "paid in full" on a
  // settled account, and `canStartProduction` (hasReached50 && !isFullyPaid) stays true after the final
  // payment. Integer cents make the boundary exact instead of nearly right.
  const cents = (v) => Math.round(v * 100);
  const hasReached50 = total > 0 && cents(paid) >= cents(total * 0.5);
  const isFullyPaid = total > 0 && cents(paid) >= cents(total);

  return {
    projectTotal: round(total),
    totalPaid: round(paid),
    totalPending: round(pending),
    totalInvoiced: round(paid + pending),
    paymentProgress,
    hasReached50,
    isFullyPaid,
    canStartProduction: hasReached50 && !isFullyPaid,
    remainingAmount: round(Math.max(0, total - paid)),
    amountFor50Percent: round(Math.max(0, total * 0.5 - paid)),
  };
}
