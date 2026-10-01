/**
 * A catalog task's prices, by THE engine — pure, so the task list (server) and the task builder's
 * preview (browser) produce the same numbers from the same function. No database here: the server
 * loads the context with catalog.js loadPricingContext, the browser with GET /api/pricing/context.
 */
import { priceTask, variantKey, cannotPriceMessage, laborHoursFor, laborCostFor } from './engine';

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

/**
 * Pure: a catalog PROCESS's cost and price, by THE engine — priced as a task whose only step is the
 * process, so a process costs exactly what it adds to a task. Labor is its hours × the wage (there are
 * no skill rates). Per metal when its materials depend on metal; a metal its stock doesn't cover is left
 * out. Returns the `pricing` block the process screens read, or null with a message when nothing prices.
 *
 *   { laborHours, laborCost, isMetalDependent,
 *     materialsCost, totalCost, retailPrice, wholesalePrice }   ← numbers, or { [metalKey]: number }
 */
export function processPricing(process, ctx) {
  const { settings, materials, tools, metals } = ctx;
  const task = { processes: [{ process: { laborHours: process?.laborHours, materials: process?.materials || [] }, quantity: 1 }] };
  const flat = priceTask({ task, settings, materials, tools, metal: null });
  if (flat.ok) {
    return {
      pricing: {
        isMetalDependent: false,
        laborHours: flat.laborHours,
        laborCost: flat.laborCost,
        materialsCost: flat.materialsCost,
        totalCost: flat.baseCost,
        retailPrice: flat.retail.listUnit,
        wholesalePrice: flat.wholesale.listUnit,
      },
      pricingMessage: '',
    };
  }
  const byMetal = { materialsCost: {}, totalCost: {}, retailPrice: {}, wholesalePrice: {} };
  for (const key of metals || []) {
    const r = priceTask({ task, settings, materials, tools, metal: key });
    if (!r.ok) continue;
    byMetal.materialsCost[key] = r.materialsCost;
    byMetal.totalCost[key] = r.baseCost;
    byMetal.retailPrice[key] = r.retail.listUnit;
    byMetal.wholesalePrice[key] = r.wholesale.listUnit;
  }
  if (Object.keys(byMetal.totalCost).length === 0) return { pricing: null, pricingMessage: cannotPriceMessage(flat) };
  return {
    pricing: {
      isMetalDependent: true,
      laborHours: Math.round(laborHoursFor(task) * 100) / 100,
      laborCost: laborCostFor(task, settings),
      ...byMetal,
    },
    pricingMessage: '',
  };
}
