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
import { getNormalizedSettings, getBusinessMultiplierValue } from './config.pricing.js';
import { resolveBillingMode, BILLING_MODE } from '@/services/billing/modes';

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const toNumber = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

/** Accepts the settings document ({ pricing: {...} }) or a bare pricing block. */
function asSettingsDoc(adminSettings = {}) {
  if (adminSettings && typeof adminSettings === 'object' && adminSettings.pricing && typeof adminSettings.pricing === 'object') {
    return adminSettings;
  }
  return { pricing: adminSettings || {} };
}

/** Both prices for a Stuller cost, plus the one this ticket pays. Pure. */
export function stullerMaterialPrices({ basePrice = 0, isWholesale = false, adminSettings = {} } = {}) {
  const settings = asSettingsDoc(adminSettings);
  const cost = Math.max(toNumber(basePrice), 0);
  const businessMultiplier = getBusinessMultiplierValue(settings);
  const { wholesaleMarkup } = getNormalizedSettings(settings);
  const retail = round2(cost * businessMultiplier);
  const wholesale = round2(cost * wholesaleMarkup);
  return {
    basePrice: cost,
    retail,
    wholesale,
    price: isWholesale ? wholesale : retail,
    businessMultiplier,
    wholesaleMarkup,
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
  adminSettings = {},
  id = Date.now(),
  category = 'stuller_material',
} = {}) {
  const data = item?.data || item || {};
  const basePrice = toNumber(data.price ?? data.showcasePrice, 0);
  const prices = stullerMaterialPrices({ basePrice, isWholesale, adminSettings });
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
 * a typed price) pass through untouched.
 */
export function repriceStullerMaterialForRepair(material = {}, { repair = {}, adminSettings = {} } = {}) {
  if (!material?.isStullerItem) return material;
  const basePrice = toNumber(material.stullerPrice ?? material.unitCost ?? material.stullerData?.originalPrice, 0);
  if (basePrice <= 0) return material;
  const isWholesale = repairIsWholesale(repair);
  const prices = stullerMaterialPrices({ basePrice, isWholesale, adminSettings });
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
