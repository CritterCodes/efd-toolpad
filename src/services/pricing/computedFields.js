/**
 * The fields on a task document that are CALCULATED prices — never stored, never trusted, never read as
 * a price. Pure, so the browser can strip them too (a catalog task copied onto a repair line must not
 * carry the list's computed numbers along with it).
 */
export const COMPUTED_PRICE_FIELDS = Object.freeze([
  'pricing', 'universalPricing', 'basePrice', 'price', 'retailPrice', 'wholesalePrice',
  'totalCosts', 'wholesaleCosts', 'calculatedAt',
]);

/** Pure: a copy of `task` with every calculated price removed. Inputs (minimums, override) are kept. */
export function stripComputedPrices(task = {}) {
  if (!task || typeof task !== 'object') return task;
  const out = { ...task };
  for (const field of COMPUTED_PRICE_FIELDS) delete out[field];
  return out;
}

/** Fields a priced task carries in a response only (catalog.js pricedTaskFields) — never stored either. */
export const RESPONSE_ONLY_TASK_FIELDS = Object.freeze(['pricingStatus', 'pricingMessage', 'laborCost']);

/**
 * Pure: what of `task` may be written to the tasks collection — no calculated price, no response-only field.
 * TasksModel applies it on every write (the sink), so a new caller can't store a price by forgetting to strip.
 */
export function storableTask(task = {}) {
  const out = stripComputedPrices(task);
  if (!out || typeof out !== 'object') return out;
  for (const field of RESPONSE_ONLY_TASK_FIELDS) delete out[field];
  return out;
}
