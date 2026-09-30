/**
 * The server's side of the pricing engine: load what a price is calculated from, and describe a task's
 * price for a response. Every task that leaves the API is priced here, by services/pricing/engine.js.
 *
 * NOTHING IS READ FROM A STORED PRICE, AND NOTHING WRITES ONE (owner, 2026-09-30: "There should never be
 * old saved prices … It should always be calculated. If it can't be calculated, it doesn't show"). Task
 * documents used to carry `pricing`, `universalPricing`, `basePrice` and friends — snapshots written by
 * an "Update Prices" button, a settings save, and every task edit (the editor sent the loaded prices back
 * and the store path kept them). Reads fell back to those snapshots whenever the live number failed, so a
 * broken price showed a stale one instead of an error. Now:
 *   - COMPUTED_PRICE_FIELDS are stripped from every task before it is stored AND before it is returned
 *   - a task's price is computed from the catalog on every read
 *   - one that can't be computed carries `pricingStatus` and a message, and no price
 */
import { resolvePricingSettings, priceTask, variantKey, cannotPriceMessage, laborHoursFor, laborCostFor } from './engine';

/** Fields on a task document that are CALCULATED prices — never stored, never trusted. */
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

/** Pure: every metal the catalog stocks, in display order. */
const METAL_ORDER = [
  'sterling_silver_925',
  'yellow_gold_10k', 'white_gold_10k', 'rose_gold_10k',
  'yellow_gold_14k', 'white_gold_14k', 'rose_gold_14k',
  'yellow_gold_18k', 'white_gold_18k', 'rose_gold_18k',
  'platinum_950',
];
export function stockedMetals(materials = []) {
  const seen = new Set();
  for (const m of materials) {
    if (!m?.isMetalDependent || !Array.isArray(m.stullerProducts)) continue;
    for (const p of m.stullerProducts) {
      const key = variantKey(p);
      if (key) seen.add(key);
    }
  }
  return [...METAL_ORDER.filter((k) => seen.has(k)), ...[...seen].filter((k) => !METAL_ORDER.includes(k)).sort()];
}

/** Pure: the metals a task may be priced in — all stocked metals, or the ones it's restricted to. */
export function metalsForTask(task, metals) {
  const restricted = Array.isArray(task?.metals) && task.metals.length > 0;
  if (!restricted) return metals;
  return metals.filter((key) => task.metals.some((m) => key.startsWith(String(m).toLowerCase())));
}

/**
 * Load everything a price is calculated from. THROWS if the pricing settings are missing or invalid —
 * there is no "price it anyway" path (PricingError 'SETTINGS_INCOMPLETE').
 */
export async function loadPricingContext() {
  const { db } = await import('@/lib/database');
  const dbi = await db.connect();
  const [adminSettings, materials, tools] = await Promise.all([
    dbi.collection('adminSettings').findOne({ _id: 'repair_task_admin_settings' }),
    dbi.collection('materials').find({ isActive: { $ne: false } }).toArray(),
    dbi.collection('tools').find({}).toArray(),
  ]);
  const settings = resolvePricingSettings(adminSettings);
  return { adminSettings, settings, materials, tools, metals: stockedMetals(materials) };
}

/**
 * Pure: the price fields a task carries in a response.
 *
 *   pricing        the price with no metal chosen — present only for tasks that don't depend on metal
 *   universalPricing  { [metalKey]: { retailPrice, wholesalePrice } } for every metal it CAN be priced in
 *   pricingStatus  'priced', or why it can't be priced without a metal / at all
 *   basePrice      the no-metal retail price, or null — never a stored number
 */
export function pricedTaskFields(task, ctx) {
  const { settings, materials, tools, metals } = ctx;
  const flat = priceTask({ task, settings, materials, tools, metal: null });
  const universalPricing = {};
  for (const key of metalsForTask(task, metals)) {
    const r = priceTask({ task, settings, materials, tools, metal: key });
    if (r.ok) universalPricing[key] = { retailPrice: r.retail.listUnit, wholesalePrice: r.wholesale.listUnit };
  }
  const anyMetal = Object.keys(universalPricing).length > 0;
  return {
    pricing: flat.ok ? {
      retailPrice: flat.retail.listUnit,
      wholesalePrice: flat.wholesale.listUnit,
      laborCost: flat.laborCost,
      baseCost: flat.baseCost,
      baseMaterialsCost: flat.materialsCost,
      toolDepreciationCost: flat.toolCost,
      totalLaborHours: flat.laborHours,
    } : null,
    universalPricing: anyMetal ? universalPricing : null,
    pricingStatus: flat.ok ? 'priced' : flat.reason,
    pricingMessage: flat.ok ? '' : (anyMetal && flat.reason === 'METAL_REQUIRED' ? 'Priced by metal.' : cannotPriceMessage(flat)),
    basePrice: flat.ok ? flat.retail.listUnit : null,
    price: flat.ok ? flat.retail.listUnit : null, // the same number, under the name older screens read
    // Labor never depends on metal, so these are always present — the engine's own numbers.
    laborHours: Math.round(laborHoursFor(task) * 100) / 100,
    laborCost: laborCostFor(task, settings),
  };
}
