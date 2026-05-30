/**
 * Custom Design Quote — Pricing Formula v2
 *
 * Pricing policy (locked 2026-05-30, see docs/custom-design-flow-redesign.md §9):
 *   - Markup applies to COMBINED COG (labor + materials) at `cogMarkup`
 *     (default 2.5, overridable per-quote via formData.cogMarkup).
 *   - Design fee = the assigned designer's own fee × `designFeeMarkup`
 *     (default 1.5); the shop keeps the spread, the designer is paid their fee.
 *   - Rush marks up the COG portion only.
 *   - Quotes are PRE-TAX; sales tax is computed by Stripe Tax at payment.
 *
 * Pure function — no React, no DB. Designed to lift into @efd/custom-design-core.
 * Accepts the existing quote-builder formData shape so the form is unchanged.
 */

export const CUSTOM_QUOTE_FORMULA_VERSION = '2.0';

const DEFAULTS = {
  cogMarkup: 2.5,
  designFeeMarkup: 1.5,
  rushMultiplier: 1.5,
  commissionPercentage: 0.1, // analytics payout only; set 0 to disable
  targetMarginFloor: 0.45,   // warn below this gross margin
  defaultDesignerFee: 0,     // used when includeCustomDesign but no designer fee resolved
};

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};
const sumLines = (lines, costKey = 'cost', qtyKey = 'quantity') =>
  (Array.isArray(lines) ? lines : []).reduce(
    (sum, line) => sum + num(line?.[costKey]) * (line?.[qtyKey] != null ? num(line[qtyKey]) || 1 : 1),
    0
  );

/**
 * @param {object} formData  Quote builder form data (existing shape):
 *   centerstone:{cost}, accentStones:[{cost,quantity}], mounting:{cost},
 *   additionalMaterials:[{cost,quantity}], laborTasks:[{cost,quantity}],
 *   shippingCosts:[{cost}], isRush:boolean, includeCustomDesign:boolean,
 *   cogMarkup?:number (per-quote override), designerFee?:number (resolved from assigned designer)
 * @param {object} settings  adminSettings.financial: { cogMarkup, designFeeMarkup,
 *   rushMultiplier, commissionPercentage, targetMarginFloor, defaultDesignerFee }
 */
export function calculateCustomQuote(formData = {}, settings = {}) {
  const cfg = { ...DEFAULTS, ...(settings || {}) };

  // --- COG (cost) ---
  const materialsCost = round2(
    num(formData.centerstone?.cost) +
      sumLines(formData.accentStones) +
      num(formData.mounting?.cost) +
      sumLines(formData.additionalMaterials)
  );
  // laborTasks carry BENCH COST (hand-entered or pulled from the task catalog, computed on read)
  const laborCost = round2(sumLines(formData.laborTasks));
  const cog = round2(materialsCost + laborCost);

  // --- COG markup (per-quote override wins over settings default) ---
  const cogMarkup = num(formData.cogMarkup) > 0 ? num(formData.cogMarkup) : num(cfg.cogMarkup) || DEFAULTS.cogMarkup;
  const cogPrice = round2(cog * cogMarkup);

  // --- Design fee: designer's own fee × markup ---
  const designFeeMarkup = num(cfg.designFeeMarkup) > 0 ? num(cfg.designFeeMarkup) : DEFAULTS.designFeeMarkup;
  const designerFee = formData.includeCustomDesign
    ? (num(formData.designerFee) > 0 ? num(formData.designerFee) : num(cfg.defaultDesignerFee))
    : 0;
  const designPrice = round2(designerFee * designFeeMarkup);
  const designPayout = round2(designerFee);

  // --- Shipping (pass-through) ---
  const shippingPrice = round2(sumLines(formData.shippingCosts));

  // --- Rush (marks up COG portion only) ---
  const rushMultiplier = num(cfg.rushMultiplier) >= 1 ? num(cfg.rushMultiplier) : DEFAULTS.rushMultiplier;
  const rushUpcharge = formData.isRush ? round2(cogPrice * (rushMultiplier - 1)) : 0;

  // --- Totals (PRE-TAX; Stripe Tax adds tax at payment) ---
  const subtotal = round2(cogPrice + designPrice + shippingPrice + rushUpcharge);
  const total = round2(subtotal);

  // --- Analytics ---
  const totalCost = round2(cog + designPayout + shippingPrice);
  const grossProfit = round2(subtotal - totalCost);
  const grossMargin = subtotal > 0 ? grossProfit / subtotal : 0;
  const commissionPercentage = num(cfg.commissionPercentage);
  const commissionPayout = round2(grossProfit * commissionPercentage);
  const netProfit = round2(grossProfit - commissionPayout);
  const targetMarginFloor = num(cfg.targetMarginFloor);
  const belowMarginFloor = subtotal > 0 && grossMargin < targetMarginFloor;

  return {
    formulaVersion: CUSTOM_QUOTE_FORMULA_VERSION,

    // costs
    materialsCost,
    laborCost,
    cog,

    // pricing
    cogMarkup,
    cogPrice,
    designerFee,
    designFeeMarkup,
    designPrice,
    designPayout,
    shippingPrice,
    rushMultiplier: formData.isRush ? rushMultiplier : 1,
    rushUpcharge,
    subtotal,
    total,            // pre-tax grand total
    taxNote: 'Sales tax calculated at payment via Stripe Tax',

    // analytics
    totalCost,
    grossProfit,
    grossMargin: round2(grossMargin * 100), // percent
    commissionPercentage,
    commissionPayout,
    netProfit,
    targetMarginFloor: round2(targetMarginFloor * 100), // percent
    belowMarginFloor,
  };
}

export default calculateCustomQuote;
