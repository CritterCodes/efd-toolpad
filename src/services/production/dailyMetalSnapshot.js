/**
 * Daily metal-price snapshot (M3-T4 / decision 0005 §8 amended — owner 2026-07-07 #3, thread #169).
 *
 * Owner rule: pricing is a **daily** snapshot — the displayed price = the charged price within a day
 * (not a live per-tick rate). So `/api/refrakt-price` prices off the day's frozen metal rates and
 * returns a `priceDay` marker; commit re-verify the same day agrees; a cross-day change is what the
 * shop's stale-guard catches.
 *
 * Mechanism = **capture-on-first-read (self-seeding), idempotent per day.** The first pricing request
 * of a `priceDay` freezes that day's rates from the live `metalPrices` doc into a `metalPriceSnapshots`
 * doc keyed by `priceDay`; every later request that day reads the frozen doc. No cron dependency to
 * function — a scheduled pre-warm cron can write the same doc earlier without changing this code.
 */

const CATEGORIES = ['gold', 'silver', 'platinum', 'palladium'];

/** UTC calendar day (YYYY-MM-DD) the price is valid for. (Refresh-time tz is a deferred owner knob.) */
export function currentPriceDay(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

/** Shape a raw `metalPrices` doc into the numeric category rates the engine consumes. */
export function toRates(doc = {}) {
  const out = {};
  for (const c of CATEGORIES) out[c] = Number(doc?.[c]) || 0;
  return out;
}

/**
 * Get the frozen metal rates for `priceDay`, capturing them from the live `metalPrices` doc on first
 * read of the day (idempotent upsert — safe under concurrent first requests).
 * @returns {Promise<{ priceDay: string, rates: {gold,silver,platinum,palladium}, capturedAt: Date }>}
 */
export async function getDailyMetalSnapshot(dbInstance, priceDay = currentPriceDay()) {
  const col = dbInstance.collection('metalPriceSnapshots');
  const existing = await col.findOne({ priceDay });
  if (existing) return { priceDay, rates: toRates(existing), capturedAt: existing.capturedAt };

  const live = await dbInstance.collection('metalPrices').findOne({});
  const rates = toRates(live);
  const capturedAt = new Date();
  // $setOnInsert so a concurrent first-request race doesn't overwrite an already-frozen day.
  await col.updateOne(
    { priceDay },
    { $setOnInsert: { priceDay, ...rates, capturedAt, source: 'metalPrices' } },
    { upsert: true },
  );
  const saved = await col.findOne({ priceDay });
  return { priceDay, rates: toRates(saved || { ...rates }), capturedAt: saved?.capturedAt || capturedAt };
}
