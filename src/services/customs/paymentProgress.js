/**
 * Custom-order payment progress (S7c) — preserves the legacy custom-ticket behavior:
 * % of the project total paid, with the **50% → production-ready** threshold. Pure;
 * the order's `quote.quoteTotal` is the project total, invoices are the new
 * single-source `customInvoices` records.
 */
function round(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
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
  const hasReached50 = total > 0 && paid >= total * 0.5;
  const isFullyPaid = total > 0 && paid >= total;

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
