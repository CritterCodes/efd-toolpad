/**
 * Pricing a Stuller part added to a REPAIR (intake form, stepped intake, My Bench "needs parts").
 *
 * One rule, in one place, on both sides of the wire:
 *
 *   retail    = Stuller cost × business multiplier   (1 + admin + business + consumables fees)
 *   wholesale = Stuller cost × wholesale markup      (settings.pricing.wholesaleMarkup)
 *
 * `materialMarkup` is deprecated for repair materials and is NOT applied — it double-marked parts
 * on top of the business multiplier. Which of the two a ticket pays is decided by the repair's
 * billing mode, never by which screen the part was typed into.
 *
 * Why this exists (2026-09-21): every add path priced Stuller parts with the retail formula no
 * matter who the ticket was for. In prod the fees sum to a 2.0× business multiplier while the
 * wholesale markup is 1.2×, so a store was quoted 2× Stuller cost on parts ("a 2x markup instead
 * of a wholesale markup"). My Bench stacked the deprecated material markup on top for 3×. The
 * server trusted whatever price the browser sent, so this module also gives the routes an
 * authoritative re-price.
 */
import { pricePart, PricingError } from './engine';
import { resolveBillingMode, BILLING_MODE } from '@/services/billing/modes';

const toNumber = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

/**
 * Both prices for a Stuller cost, plus the one this ticket pays — THE engine's pricePart. `settings`
 * must come from resolvePricingSettings: there is no default markup. Throws on a part with no cost
 * (PricingError NO_COST) rather than pricing it at $0.
 */
export function stullerMaterialPrices({ basePrice = 0, isWholesale = false, settings } = {}) {
  const r = pricePart({ cost: basePrice, settings });
  if (!r.ok) throw new PricingError('NO_COST', 'This Stuller part has no cost to price from.');
  return {
    basePrice: r.unitCost,
    retail: r.retail.unit,
    wholesale: r.wholesale.unit,
    price: isWholesale ? r.wholesale.unit : r.retail.unit,
    businessMultiplier: settings.retailMultiplier,
    wholesaleMarkup: settings.wholesaleMarkup,
  };
}

/** Does this repair pay trade prices? Billing mode first, legacy flag second. */
export function repairIsWholesale(repair = {}) {
  return resolveBillingMode(repair) === BILLING_MODE.WHOLESALE || repair?.isWholesale === true;
}

/**
 * Build the material line for a Stuller item (the shape every intake surface used to build by
 * hand). `item` is the normalized payload from /api/stuller/item (`data`).
 */
export function buildStullerRepairMaterial({
  item = {},
  sku = '',
  isWholesale = false,
  settings,
  id = Date.now(),
  category = 'stuller_material',
} = {}) {
  const data = item?.data || item || {};
  const basePrice = toNumber(data.price ?? data.showcasePrice, 0);
  const prices = stullerMaterialPrices({ basePrice, isWholesale, settings });
  const name = data.description || `Stuller ${sku}`;
  return {
    id,
    name,
    displayName: name,
    description: `${data.longDescription || data.description || name} (Stuller: ${sku})`,
    quantity: 1,
    price: prices.price,
    retailPrice: prices.retail,
    unitCost: basePrice,
    stullerPrice: basePrice,
    baseCostPerPortion: basePrice,
    category,
    supplier: 'Stuller',
    stuller_item_number: sku,
    isStullerItem: true,
    stullerData: {
      originalPrice: basePrice,
      itemNumber: sku,
      businessMultiplier: prices.businessMultiplier,
      wholesaleMarkup: prices.wholesaleMarkup,
      pricedAs: isWholesale ? 'wholesale' : 'retail',
      weight: data.weight,
      dimensions: data.dimensions,
      metal: data.metal,
    },
  };
}

/**
 * Server-side: re-price a Stuller material for the repair it is being added to. The browser's
 * number is a preview; this is the one that gets stored. Non-Stuller materials (manual parts with
 * a typed price) pass through untouched. A Stuller part with no cost is REFUSED (PricingError NO_COST) —
 * it used to keep whatever price the browser sent.
 */
export function repriceStullerMaterialForRepair(material = {}, { repair = {}, settings } = {}) {
  if (!material?.isStullerItem) return material;
  const basePrice = toNumber(material.stullerPrice ?? material.unitCost ?? material.stullerData?.originalPrice, 0);
  const isWholesale = repairIsWholesale(repair);
  const prices = stullerMaterialPrices({ basePrice, isWholesale, settings });
  return {
    ...material,
    price: prices.price,
    retailPrice: prices.retail,
    stullerData: {
      ...(material.stullerData || {}),
      businessMultiplier: prices.businessMultiplier,
      wholesaleMarkup: prices.wholesaleMarkup,
      pricedAs: isWholesale ? 'wholesale' : 'retail',
    },
  };
}
