const PLACEHOLDER_DOMAINS = new Set(['example.com', 'example.test', 'test.com']);

export function isBillableEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;
  const domain = email.split('@')[1];
  return !PLACEHOLDER_DOMAINS.has(domain) && !domain.endsWith('.test');
}

/**
 * THE DEPOSIT FLOOR — the point at which a deposit still covers what the job costs to make.
 *
 * The 50% deposit was never arbitrary: at a 2.5× markup COG is exactly 40% of retail, so half of retail
 * is 1.25 × COG and clears cost with a quarter of COG to spare, on every job. **It breaks below ~2×
 * blended markup**, because then half of retail is less than cost.
 *
 * That is not hypothetical. On CO-msnijwee-11bb75 the centre stone went in at 1.3× (a natural diamond
 * cannot take keystone), the blend came out 1.43×, COG was 70% of retail — and a 50% deposit would have
 * been $1,307 SHORT of cost. The owner charged $5,500 by instinct, which is COG × 1.21: almost exactly
 * this rule, a day before it was written down.
 *
 * So the durable rule is a MULTIPLE OF COG, not a percentage of retail. `COG × 1.25` preserves the
 * cushion the 50% deposit has always delivered (owner, 2026-08-12).
 *
 * ADVISORY, NOT ENFORCED. The owner overrides gates as a matter of course — he waived the mounting gate
 * on that very order because he had taken enough profit. This returns the numbers so the UI can warn;
 * it must not block an invoice.
 *
 * @returns {{ floor, floorPct, breakEven, cushioned10, clearsCost, shortfall, blendedMarkup }}
 */
export function depositFloor({ cog, total, requestedPct = 50 } = {}) {
  const round = (v) => Math.round((Number(v) || 0) * 100) / 100;
  const c = round(cog);
  const t = round(total);

  const floor = round(c * 1.25);                 // the historical cushion — 50% at 2.5×
  const requested = round(t * (Number(requestedPct) || 0) / 100);

  return {
    floor,
    // What percentage of retail that floor represents for THIS job. On a thin-margin job it is large,
    // and the operator should see that rather than have it implied.
    //
    // ROUNDED UP, deliberately. This is shown as "use 87.7%", so it must be a percentage that ACTUALLY
    // clears the floor when typed in. Rounding to nearest gave 87.6% on Bryce — $2 short. A suggestion
    // that fails when you follow it is worse than no suggestion.
    floorPct: t > 0 ? Math.ceil((floor / t) * 1000) / 10 : 0,
    breakEven: c,                                // covers cost, no margin banked
    cushioned10: round(c * 1.1),
    requested,
    clearsCost: requested >= floor,
    shortfall: requested >= floor ? 0 : round(floor - requested),
    blendedMarkup: c > 0 ? Math.round((t / c) * 100) / 100 : 0,
  };
}

export function calculateCustomInvoice({ type, amount, depositPct, dueDays, progress }) {
  const round = (value) => Math.round((Number(value) || 0) * 100) / 100;
  const projectTotal = round(progress?.projectTotal);
  const totalPaid = round(progress?.totalPaid);
  const totalPending = round(progress?.totalPending);
  const available = round(Math.max(0, projectTotal - totalPaid - totalPending));
  let resolvedAmount;

  if (type === 'deposit') {
    const percent = Number(depositPct ?? 50);
    if (!Number.isFinite(percent) || percent <= 0 || percent > 100) {
      throw new Error('Deposit percentage must be between 1 and 100.');
    }
    resolvedAmount = round(projectTotal * percent / 100);
  } else if (type === 'final') {
    resolvedAmount = available;
  } else {
    resolvedAmount = round(amount);
  }

  if (projectTotal <= 0) throw new Error('The published quote must have a positive total.');
  if (resolvedAmount <= 0) throw new Error('Invoice amount must be greater than zero.');
  if (resolvedAmount > available) {
    throw new Error(`Invoice exceeds the uninvoiced balance of $${available.toFixed(2)}.`);
  }

  return {
    amount: resolvedAmount,
    dueDays: Math.max(1, Math.min(90, Number(dueDays) || 7)),
    available,
  };
}
