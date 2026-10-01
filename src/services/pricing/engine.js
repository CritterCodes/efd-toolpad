/**
 * THE pricing engine. One function prices a task; every surface in both apps calls it.
 *
 * Owner, 2026-09-30: "Prices should always be calculated the same. There should never be old saved
 * prices … It should always be calculated. If it can't be calculated, it doesn't show. The whole issue
 * with them being calculated like this needs to be foolproof. There should not be a single place in the
 * app that does not use the same thing. No exceptions." And: "Intake should never load without our
 * settings, and there should never be a fallback."
 *
 * WHAT A PRICE IS
 *   labor     = Σ process hours × process quantity × the shop wage ($50/hr — a setting, never a default)
 *   materials = Σ each material's cost for the job's metal × quantity
 *   tools     = Σ cost-per-use × quantity
 *   base      = materials + labor (or the task's minimum labor, if higher) + tools
 *   retail    = base × (1 + administrative + business + consumables fees), or the task's minimum, or its
 *               override — then the volume tier for the quantity
 *   wholesale = base × wholesale markup, or the task's wholesale minimum — then the volume tier
 * Money is rounded to the cent and nowhere else. There is no $5 rounding (owner, 2026-09-30).
 *
 * WHAT CHANGED FROM THE OLD ENGINE (services/pricing/*.pricing.js)
 *   - NO DEFAULTS. The old engine read `wage || 50`, fees `|| .10/.15/.05`, a wholesale markup that
 *     fell back to 1.5, and turned a real 0 into the default. Here every setting is required; a missing
 *     or invalid one throws PricingError('SETTINGS_INCOMPLETE') naming it.
 *   - NO SKILL FACTORS. Labor is the wage, full stop (owner: "The labor on any repair is always $50 an
 *     hour"). What a PERSON is paid is their pay rate on the labor log — not pricing.
 *   - NO HIDDEN 2.0 FLOOR. The old engine silently raised the fee multiplier to 2.0. The fees ARE the
 *     multiplier now; production's fees total 1.0, so retail is ×2.0 exactly as before.
 *   - NO MATERIAL MARKUP. It was already inert in the old engine; it is gone.
 *   - "CAN'T PRICE" IS AN ANSWER. A metal-dependent material with no metal chosen, or no variant for
 *     the metal, used to price at $0 and carry on. Now the result is { ok: false, reason }, and callers
 *     show nothing rather than a wrong number.
 *   - ONE METAL KEY, one variant lookup, one material cost rule, one quantity rule (every material ×
 *     its quantity — EFD-DEFECTS P7, P8, P13).
 *
 * Pure: no database, no fetch, no Date. Safe in the browser and on the server.
 */
import { tiersFromSettings, applyQuantityTier } from './quantityTiers';

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

export class PricingError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'PricingError';
    this.code = code;
    this.details = details;
  }
}

/** Why a task could not be priced. Callers show nothing, and may show this. */
export const CANNOT_PRICE = Object.freeze({
  BAD_TASK: 'BAD_TASK',
  METAL_REQUIRED: 'METAL_REQUIRED',
  UNMATCHED_MATERIAL: 'UNMATCHED_MATERIAL',
  UNKNOWN_MATERIAL: 'UNKNOWN_MATERIAL',
  NO_COST: 'NO_COST',
  WRONG_METAL: 'WRONG_METAL',
});

// ─── Settings ──────────────────────────────────────────────────────────────────

const RULES = Object.freeze({
  wage: (n) => n > 0,
  administrativeFee: (n) => n >= 0,
  businessFee: (n) => n >= 0,
  consumablesFee: (n) => n >= 0,
  wholesaleMarkup: (n) => n > 0,
  rushMultiplier: (n) => n >= 1,
  deliveryFee: (n) => n >= 0,
  taxRate: (n) => n >= 0 && n < 1,
  minimumTaskRetailPrice: (n) => n >= 0,
  minimumTaskWholesalePrice: (n) => n >= 0,
});

// Settings objects that came out of resolvePricingSettings. priceTask accepts nothing else, so a raw
// settings document (or a hand-built object with a wage in it) can never be priced from by mistake.
const RESOLVED = new WeakSet();

/** The settings the engine requires, by their key under `adminSettings.pricing`. */
export const REQUIRED_PRICING_SETTINGS = Object.freeze(Object.keys(RULES));

/**
 * Validate the shop's pricing settings. Throws PricingError('SETTINGS_INCOMPLETE') listing every missing
 * or invalid field — never substitutes a value. Returns a frozen object the rest of the engine takes.
 */
export function resolvePricingSettings(adminSettings) {
  const pricing = adminSettings?.pricing;
  if (!pricing || typeof pricing !== 'object') {
    throw new PricingError('SETTINGS_INCOMPLETE', 'Pricing settings did not load.', { missing: [...REQUIRED_PRICING_SETTINGS] });
  }
  const values = {};
  const missing = [];
  for (const [key, valid] of Object.entries(RULES)) {
    const raw = pricing[key];
    const n = typeof raw === 'string' && raw.trim() === '' ? NaN : Number(raw);
    if (raw === undefined || raw === null || !Number.isFinite(n) || !valid(n)) missing.push(key);
    else values[key] = n;
  }
  if (missing.length) {
    throw new PricingError('SETTINGS_INCOMPLETE', `Pricing settings are missing or invalid: ${missing.join(', ')}.`, { missing });
  }
  const resolved = Object.freeze({
    wage: values.wage,
    retailMultiplier: 1 + values.administrativeFee + values.businessFee + values.consumablesFee,
    wholesaleMarkup: values.wholesaleMarkup,
    rushMultiplier: values.rushMultiplier,
    deliveryFee: values.deliveryFee,
    taxRate: values.taxRate,
    minimumRetail: values.minimumTaskRetailPrice,
    minimumWholesale: values.minimumTaskWholesalePrice,
    quantityTiers: Object.freeze(tiersFromSettings(adminSettings)),
  });
  RESOLVED.add(resolved);
  return resolved;
}

// ─── Metal ─────────────────────────────────────────────────────────────────────

const normKey = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '_');

/**
 * How the counter's metal names map to the names the Stuller stock is filed under. Intake offers
 * "Silver 925" and "Platinum 950"; the stock says `sterling_silver` and `platinum` + `950`. Building the
 * key from intake's raw values gave `silver_925`, which matches nothing — so every silver job at the
 * counter was priced with its solder and sizing stock at $0 and its wire at a whole spool's cost
 * (EFD-SILVER-PRICING, 2026-09-30). Fine silver and 999 platinum have no stock: their keys exist, match
 * nothing, and so refuse to price rather than borrow sterling's or 950's cost.
 */
const METAL_NAMES = Object.freeze({
  silver: { '925': 'sterling_silver_925', '999': 'fine_silver_999' },
  sterling_silver: { '925': 'sterling_silver_925' },
  platinum: { '950': 'platinum_950', '999': 'platinum_999' },
});

/**
 * THE metal key — the one place a metal becomes the name its stock is filed under:
 * `'yellow_gold_14k'`, `'white_gold_18k'`, `'sterling_silver_925'`, `'platinum_950'`.
 * Accepts a key string, or { metalType, karat, goldColor } as intake sends it. Null when there isn't
 * enough to know (gold with no color, a metal with no karat) — which is a METAL_REQUIRED, not a guess.
 * `'costume'` is a real answer: it has no metal stock, so metal-dependent tasks refuse to price in it.
 */
export function metalKey(metal) {
  if (!metal) return null;
  if (typeof metal === 'string') return normKey(metal) || null;
  const type = normKey(metal.metalType || '');
  if (!type) return null;
  if (type === 'costume') return 'costume';
  let karat = String(metal.karat ?? '').trim().toLowerCase();
  if (!karat || karat === 'null' || karat === 'undefined') return null;
  if (type === 'gold') {
    if (/^\d+$/.test(karat)) karat = `${karat}k`; // "14" → "14k"
    const color = normKey(metal.goldColor || '');
    return color ? normKey(`${color}_gold_${karat}`) : null;
  }
  const named = METAL_NAMES[type]?.[karat.replace(/k$/, '')];
  return named || normKey(`${type}_${karat}`);
}

/** The key a Stuller variant is stored under — built the same way, so the two always agree. */
export function variantKey(product) {
  if (!product?.metalType || !product?.karat) return null;
  return normKey(`${product.metalType}_${product.karat}`);
}

// When the exact karat isn't stocked, use the nearest HIGHER karat of the same color (10k → 14k → 18k).
const KARAT_LADDER = ['10k', '14k', '18k'];

function findVariant(products, key) {
  if (!Array.isArray(products) || !key) return null;
  const exact = products.find((p) => variantKey(p) === key);
  if (exact) return { product: exact, usedKey: key, substituted: false };
  const m = /^(.*)_(\d+k)$/.exec(key);
  const idx = m ? KARAT_LADDER.indexOf(m[2]) : -1;
  if (idx === -1) return null;
  for (let j = idx + 1; j < KARAT_LADDER.length; j++) {
    const candidate = `${m[1]}_${KARAT_LADDER[j]}`;
    const found = products.find((p) => variantKey(p) === candidate);
    if (found) return { product: found, usedKey: candidate, substituted: true };
  }
  return null;
}

// ─── Materials ─────────────────────────────────────────────────────────────────

const positive = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/**
 * One material's cost per unit used, for the job's metal. The ONE rule (EFD-DEFECTS P7):
 *   metal-dependent → the variant for the metal: its price ÷ its portions (the variant's portions, else
 *                     the material's) — never the material's top-level price, which is one whole unit
 *   universal       → its per-use `estimatedCost`, else its price ÷ its portions
 * Returns { cost } or { error } — never a silent $0.
 */
function materialUnitCost(material, key) {
  const label = material.displayName || material.name || 'a material';
  if (material.isMetalDependent) {
    if (!key) return { error: CANNOT_PRICE.METAL_REQUIRED, material: label };
    const hit = findVariant(material.stullerProducts, key);
    if (!hit) return { error: CANNOT_PRICE.UNMATCHED_MATERIAL, material: label };
    const price = positive(hit.product.stullerPrice) || positive(hit.product.unitCost);
    const portions = positive(hit.product.portionsPerUnit) || positive(material.portionsPerUnit) || 1;
    return {
      cost: price / portions,
      substitution: hit.substituted ? { material: label, requested: key, used: hit.usedKey } : null,
    };
  }
  const perUse = positive(material.estimatedCost);
  if (perUse) return { cost: perUse };
  const price = positive(material.stullerPrice) || positive(material.unitCost);
  const portions = positive(material.portionsPerUnit) || 1;
  return { cost: price / portions };
}

function resolveMaterial(selection, catalog) {
  if (selection?.material && typeof selection.material === 'object') return selection.material;
  if (selection?.materialId) {
    const found = catalog.find((m) => String(m?._id) === String(selection.materialId));
    return found || null;
  }
  // An inline material (e.g. a process's embedded materials).
  if (selection && (selection.stullerProducts || selection.unitCost != null || selection.estimatedCost != null)) return selection;
  return null;
}

// ─── The task ──────────────────────────────────────────────────────────────────

/** Pure: a task's labor hours — Σ process hours × process quantity. Not a price; needs no metal. */
export function laborHoursFor(task = {}) {
  let hours = 0;
  for (const selection of Array.isArray(task?.processes) ? task.processes : []) {
    const process = selection?.process && typeof selection.process === 'object' ? selection.process : selection;
    const n = Number(selection?.quantity);
    hours += positive(process?.laborHours) * (Number.isFinite(n) && n > 0 ? n : 1);
  }
  return hours;
}

/**
 * The labor cost of a task: hours × the wage, or the task's minimum labor price if higher. Labor never
 * depends on metal, so this answers even when the full price can't (e.g. no metal chosen yet). The
 * custom-quote builder and the task list read it; priceTask uses the same function.
 */
export function laborCostFor(task, settings) {
  if (!settings || !RESOLVED.has(settings)) {
    throw new PricingError('SETTINGS_INCOMPLETE', 'laborCostFor needs settings from resolvePricingSettings.', { missing: ['settings'] });
  }
  return round2(Math.max(round2(laborHoursFor(task) * settings.wage), positive(task?.minimumLaborPrice)));
}

/**
 * Price one task.
 *
 * @param {object}   args.task       a catalog task (processes, materials, tools, minimums)
 * @param {object}   args.settings   the output of resolvePricingSettings — required
 * @param {object[]} args.materials  the materials catalog, to resolve `materialId` references
 * @param {object[]} args.tools      the tools catalog (optional; a selection's own costPerUse is used otherwise)
 * @param {*}        args.metal      a metal key or { metalType, karat, goldColor }; null when not chosen
 * @param {number}   args.quantity   how many — decides the volume tier
 * @returns {{ ok: true, ... } | { ok: false, reason, detail }}
 */
export function priceTask({ task, settings, materials = [], tools = [], metal = null, quantity = 1 } = {}) {
  if (!settings || !RESOLVED.has(settings)) {
    throw new PricingError('SETTINGS_INCOMPLETE', 'priceTask needs settings from resolvePricingSettings.', { missing: ['settings'] });
  }
  if (!task || typeof task !== 'object') return { ok: false, reason: CANNOT_PRICE.BAD_TASK, detail: 'No task.' };

  const key = metalKey(metal);
  // A task restricted to certain metals ("Size Down — Platinum (laser welded)") is priced only in those
  // metals: its recipe is wrong for anything else. The live shop estimate offered it for a silver ring.
  const allowed = Array.isArray(task.metals) ? task.metals.filter(Boolean).map(normKey) : [];
  if (allowed.length) {
    const only = allowed.join(' or ');
    if (!key) return { ok: false, reason: CANNOT_PRICE.METAL_REQUIRED, detail: `this task (it is for ${only})` };
    if (!allowed.some((m) => key.startsWith(m))) return { ok: false, reason: CANNOT_PRICE.WRONG_METAL, detail: only };
  }
  const catalog = Array.isArray(materials) ? materials : [];
  const toolCatalog = Array.isArray(tools) ? tools : [];
  const qty = Math.max(Math.floor(Number(quantity) || 1), 1);
  const substitutions = [];
  let materialsCost = 0;
  let toolCost = 0;

  const addMaterial = (selection, multiplier) => {
    const material = resolveMaterial(selection, catalog);
    if (!material) return { ok: false, reason: CANNOT_PRICE.UNKNOWN_MATERIAL, detail: selection?.displayName || selection?.materialName || selection?.materialId || 'a material' };
    const unit = materialUnitCost(material, key);
    if (unit.error) return { ok: false, reason: unit.error, detail: unit.material };
    if (unit.substitution) substitutions.push(unit.substitution);
    const n = Number(selection?.quantity);
    // The per-unit cost is rounded to the cent BEFORE multiplying by quantity — the order the shop's
    // prices have always been computed in. Keeping full precision instead moved sizing-stock tasks by
    // up to 10¢; the swap to this engine is meant to change no price at all.
    materialsCost += round2(unit.cost) * (Number.isFinite(n) && n > 0 ? n : 1) * multiplier;
    return null;
  };

  for (const selection of Array.isArray(task.processes) ? task.processes : []) {
    const process = selection?.process && typeof selection.process === 'object' ? selection.process : selection;
    const n = Number(selection?.quantity);
    const processQty = Number.isFinite(n) && n > 0 ? n : 1;
    for (const inner of Array.isArray(process?.materials) ? process.materials : []) {
      const failed = addMaterial(inner, processQty);
      if (failed) return failed;
    }
  }

  for (const selection of Array.isArray(task.materials) ? task.materials : []) {
    const failed = addMaterial(selection, 1);
    if (failed) return failed;
  }

  for (const selection of Array.isArray(task.tools) ? task.tools : []) {
    const catalogTool = selection?.toolId ? toolCatalog.find((t) => String(t?._id) === String(selection.toolId)) : null;
    const n = Number(selection?.quantity);
    toolCost += positive(catalogTool?.costPerUse ?? selection?.costPerUse) * (Number.isFinite(n) && n > 0 ? n : 1);
  }

  const laborHours = laborHoursFor(task);
  const laborCost = laborCostFor(task, settings);
  const roundedTools = round2(toolCost);
  const baseCost = materialsCost + laborCost + roundedTools;

  const minimumRetail = Math.max(settings.minimumRetail, positive(task.minimumPrice));
  const minimumWholesale = Math.max(settings.minimumWholesale, positive(task.minimumWholesalePrice));
  if (!(baseCost > 0) && !(minimumRetail > 0) && !(positive(task.priceOverride) > 0)) {
    return { ok: false, reason: CANNOT_PRICE.NO_COST, detail: 'This task has no labor, materials or tools, and no minimum.' };
  }

  const variantMultiplier = positive(task.variantPricingAdjustments?.[key || 'universal']?.retailMultiplier) || 1;
  const calculatedRetail = round2(round2(baseCost * settings.retailMultiplier) * variantMultiplier);
  const retailList = round2(positive(task.priceOverride) || Math.max(calculatedRetail, minimumRetail));
  const wholesaleList = round2(Math.max(round2(baseCost * settings.wholesaleMarkup), minimumWholesale));

  // The tier sees the cent-rounded base, as it always has — an unrounded one moves prices by a penny.
  const tierInput = { baseCost: round2(baseCost), toolDepreciationCost: roundedTools };
  const retailTier = applyQuantityTier({ price: retailList, pricing: tierInput, quantity: qty, tiers: settings.quantityTiers });
  const wholesaleTier = applyQuantityTier({ price: wholesaleList, pricing: tierInput, quantity: qty, tiers: settings.quantityTiers });

  const tierOf = (t) => (t.applied ? { label: t.label, minQty: t.tier.minQty, discountPerUnit: t.discountPerUnit } : null);

  return {
    ok: true,
    metal: key,
    quantity: qty,
    laborHours: round2(laborHours),
    laborCost: round2(laborCost),
    materialsCost: round2(materialsCost),
    toolCost: roundedTools,
    baseCost: round2(baseCost),
    retail: { listUnit: retailList, unit: retailTier.unitPrice, tier: tierOf(retailTier) },
    wholesale: { listUnit: wholesaleList, unit: wholesaleTier.unitPrice, tier: tierOf(wholesaleTier) },
    substitutions,
  };
}

/** The unit price for an audience — `'retail'` or `'wholesale'`. */
export function unitPriceFor(result, audience = 'retail') {
  if (!result?.ok) return null;
  return audience === 'wholesale' ? result.wholesale.unit : result.retail.unit;
}

/** Plain-language reason a task can't be priced, for the screen. */
export function cannotPriceMessage(result) {
  switch (result?.reason) {
    case CANNOT_PRICE.METAL_REQUIRED: return `Choose a metal to price this — ${result.detail} depends on it.`;
    case CANNOT_PRICE.UNMATCHED_MATERIAL: return `Can't price this in that metal — ${result.detail} isn't stocked in it.`;
    case CANNOT_PRICE.UNKNOWN_MATERIAL: return `Can't price this — ${result.detail} is missing from the materials catalog.`;
    case CANNOT_PRICE.WRONG_METAL: return `This task is only for ${result.detail}.`;
    case CANNOT_PRICE.NO_COST: return "Can't price this — the task has no labor, materials, tools or minimum.";
    default: return "Can't price this task.";
  }
}

// ─── The other lines on a repair ───────────────────────────────────────────────
//
// A repair carries more than catalog tasks: materials picked from the catalog, Stuller parts looked up by
// SKU, custom labor (hours with no catalog task), and custom charges. Every one that is CALCULATED is
// calculated here, by the same settings and the same rules. A custom charge is not calculated — its price
// is what the person typed — so it has no function here.

const requireResolved = (settings, fn) => {
  if (!settings || !RESOLVED.has(settings)) {
    throw new PricingError('SETTINGS_INCOMPLETE', `${fn} needs settings from resolvePricingSettings.`, { missing: ['settings'] });
  }
};

/**
 * One catalog material added to a repair on its own (not inside a task). Its cost per unit used is the
 * same rule a task's materials follow (materialUnitCost), so a portion of solder costs the same on its
 * own as it does inside "Size Down". Then retail = cost × the fee multiplier, wholesale = cost × the
 * wholesale markup — no volume tier (tiers share out machine time, and a material has none).
 */
export function priceMaterial({ material, settings, metal = null } = {}) {
  requireResolved(settings, 'priceMaterial');
  if (!material || typeof material !== 'object') return { ok: false, reason: CANNOT_PRICE.UNKNOWN_MATERIAL, detail: 'a material' };
  const unit = materialUnitCost(material, metalKey(metal));
  if (unit.error) return { ok: false, reason: unit.error, detail: unit.material };
  const cost = round2(unit.cost);
  if (!(cost > 0)) return { ok: false, reason: CANNOT_PRICE.NO_COST, detail: material.displayName || material.name || 'a material' };
  return {
    ok: true,
    unitCost: cost,
    retail: { unit: round2(cost * settings.retailMultiplier) },
    wholesale: { unit: round2(cost * settings.wholesaleMarkup) },
    substitution: unit.substitution || null,
  };
}

/**
 * A part bought for this job (a Stuller SKU): its cost × the fee multiplier, or × the wholesale markup.
 * The deprecated material markup is not applied (it double-marked parts — see stullerMaterial.js).
 */
export function pricePart({ cost, settings } = {}) {
  requireResolved(settings, 'pricePart');
  const c = round2(positive(cost));
  if (!(c > 0)) return { ok: false, reason: CANNOT_PRICE.NO_COST, detail: 'This part has no cost.' };
  return {
    ok: true,
    unitCost: c,
    retail: { unit: round2(c * settings.retailMultiplier) },
    wholesale: { unit: round2(c * settings.wholesaleMarkup) },
  };
}

/**
 * Custom labor — hours with no catalog task. Priced as a task whose only process is those hours, so it
 * is exactly what a catalog task with the same hours would cost.
 */
export function priceCustomLabor({ laborHours, settings, quantity = 1 } = {}) {
  requireResolved(settings, 'priceCustomLabor');
  const hours = positive(laborHours);
  return priceTask({
    task: { processes: [{ name: 'Custom Labor', laborHours: hours, quantity: 1 }], materials: [] },
    settings,
    quantity,
  });
}

/**
 * The store's resale price on its OWN receipts — what a wholesale account charges its customer. This is
 * the store's setting (its retail markup), not ours: it never changes what EFD charges the store.
 * `multiplier` is the store's number, already loaded; null means it didn't load, and so there is none.
 */
export function storeResalePrice(paidUnit, multiplier) {
  const m = Number(multiplier);
  if (!Number.isFinite(m) || m <= 0 || paidUnit == null) return null;
  return round2(Number(paidUnit) * m);
}

/**
 * A repair's totals from its line subtotal. The one rule:
 *   rush     = subtotal × (rush multiplier − 1)                    — retail tickets
 *   delivery = the delivery fee, when the ticket includes delivery — retail tickets
 *   tax      = (subtotal + rush + delivery) × the tax rate, when the ticket is taxed — retail tickets
 *   total    = subtotal + rush + delivery + tax
 * A store's ticket is its lines and nothing else: stores were never charged rush, delivery (shipping is
 * billed at cost on the invoice) or sales tax (they resell). A comped ticket is $0 throughout.
 */
export function priceRepairTotals({ subtotal, settings, isWholesale = false, isRush = false, includeDelivery = false, includeTax = false, comped = false } = {}) {
  requireResolved(settings, 'priceRepairTotals');
  if (comped) return { subtotal: 0, rushFee: 0, deliveryFee: 0, taxRate: 0, taxAmount: 0, total: 0 };
  const sub = round2(subtotal);
  const retail = !isWholesale;
  const rushFee = retail && isRush ? round2(sub * (settings.rushMultiplier - 1)) : 0;
  const deliveryFee = retail && includeDelivery ? round2(settings.deliveryFee) : 0;
  const taxRate = retail && includeTax ? settings.taxRate : 0;
  const taxAmount = round2((sub + rushFee + deliveryFee) * taxRate);
  return { subtotal: sub, rushFee, deliveryFee, taxRate, taxAmount, total: round2(sub + rushFee + deliveryFee + taxAmount) };
}

/**
 * A material's COST per unit used, for a metal (no price — needs no settings). The same rule every
 * price uses (materialUnitCost), for screens that show cost: the materials catalog, the process editor.
 */
export function materialCost({ material, metal = null } = {}) {
  if (!material || typeof material !== 'object') return { ok: false, reason: CANNOT_PRICE.UNKNOWN_MATERIAL };
  const unit = materialUnitCost(material, metalKey(metal));
  if (unit.error) return { ok: false, reason: unit.error };
  return { ok: true, unitCost: round2(unit.cost) };
}
