/**
 * Gem price-at-carat — the one pricing brain behind the shop's species/color/carat picker and
 * the listing "from $X" floor (GEMSTONE_DESIGNS_AND_INVENTORY.md §2/§2b). One recipe everywhere,
 * the same math the design editor's GemVariantPriceCard shows:
 *
 *   retail = ( estimateGemstoneCost(carat, tierRate, yield, cutLabor) + sharedCosts ) × markup
 *
 * The rejection codes are load-bearing: the shop routes 'special-request' to the customs intake
 * and 'unavailable' to a plain sold-out/not-offered message.
 */
import { estimateGemstoneCost, gemTierRate } from './designCost';
import { sharedCostsFor } from './variantPricing';
import { speciesSG } from '@/constants/gemSpecies';

const round = (v) => Math.round((Number(v) || 0) * 100) / 100;

export const GEM_CARAT_STEP = 0.25;

/** Snap to the pick step (0.25ct) — the shopper's control snaps the same way (FR §1). */
export function snapCarat(carat, step = GEM_CARAT_STEP) {
  const c = Number(carat) || 0;
  return round(Math.round(c / step) * step);
}

/** Per-variant markup override, else the design's markup, else the settings default. */
export function gemMarkupFor(design = {}, variant = {}, defaultMarkup = 2.5) {
  if (Number(variant?.markupOverride) > 0) return Number(variant.markupOverride);
  if (Number(design?.pricing?.markup) > 0) return Number(design.pricing.markup);
  return Number(defaultMarkup) > 0 ? Number(defaultMarkup) : 2.5;
}

/**
 * Price one shopper configuration. Validation and pricing are one decision — anything that
 * can't be bought now comes back `{ ok:false, code, reason }`:
 *   'unavailable'      — no such variant / inactive / unknown color (nothing to request)
 *   'special-request'  — offered, but through the customs pipeline (special_request variant,
 *                        carat out of range, or past the color's last rate tier)
 * The returned breakdown includes the cutter's cost internals — CALLERS DECIDE what crosses to
 * the shop (the price route exposes retail only).
 */
export function priceGemAtCarat({ design = {}, variantId, colorLabel, carat, defaultMarkup = 2.5, sharedCosts = 0 }) {
  const variant = (design.variants || []).find((v) => v?.variantId === variantId);
  if (!variant || variant.active === false || !variant.gemstone) {
    return { ok: false, code: 'unavailable', reason: 'This stone is not offered.' };
  }
  const g = variant.gemstone;
  if (g.availability === 'special_request') {
    return { ok: false, code: 'special-request', reason: 'This species is quoted by request.' };
  }

  const ct = snapCarat(carat);
  const min = Number(g.caratMin) || 0;
  const max = Number(g.caratMax) || 0;
  if (!(ct > 0) || (min > 0 && ct < min) || (max > 0 && ct > max)) {
    return { ok: false, code: 'special-request', reason: 'That size is outside the offered range.' };
  }

  const color = (g.colors || []).find((c) => c?.label === colorLabel);
  if (!color) {
    return { ok: false, code: 'unavailable', reason: 'Unknown color for this stone.' };
  }
  const rate = gemTierRate(color.rates, ct);
  if (rate == null) {
    return { ok: false, code: 'special-request', reason: 'That size is quoted by request.' };
  }

  const est = estimateGemstoneCost({ carat: ct, roughRatePerCarat: rate, yield: g.yield, cutLaborCost: g.cutLaborCost });
  const markup = gemMarkupFor(design, variant, defaultMarkup);
  const retail = round((est.estCost + (Number(sharedCosts) || 0)) * markup);
  if (!(retail > 0)) {
    return { ok: false, code: 'unavailable', reason: 'This configuration has no price.' };
  }
  return { ok: true, carat: ct, variantId, colorLabel, retail, markup, sharedCosts: round(sharedCosts), cost: est };
}

/**
 * REFRAKT `config.sizing` for one gem variant — the host obligations from
 * FR-gem-size-customizer §3: `baseCarat = stlVolumeCm3 × SG × 5` (1 ct = 0.2 g) off the
 * design's server-measured watertight STL volume (NEVER the open display mesh), SG from the
 * per-variant override else the species table. No STL or unknown species → null: the listing
 * still sells, the shopper picks carat numerically, and the mm display stays off (doc rule).
 */
export function gemSizingFor(design = {}, variant = {}) {
  const g = variant?.gemstone || {};
  const sg = Number(g.sg) > 0 ? Number(g.sg) : speciesSG(g.species);
  const vol = Number(design?.stlVolumeCm3) || 0;
  if (!(sg > 0) || !(vol > 0)) return null;
  return {
    enabled: true,
    baseCarat: round(vol * sg * 5),
    sg,
    ...(Number(g.caratMin) > 0 ? { caratMin: Number(g.caratMin) } : {}),
    ...(Number(g.caratMax) > 0 ? { caratMax: Number(g.caratMax) } : {}),
    stepCt: GEM_CARAT_STEP,
    stepMm: 0.25,
  };
}

/**
 * The DB-derived pricing inputs every gem price shares: the settings default markup and the
 * design's shared costs (labor tasks + shipping + the design fee, falling back to the primary
 * artisan's custom design fee) — the same resolution dailyReprice uses.
 */
export async function loadGemPricingInputs(dbi, design = {}) {
  const artisanId = design?.primaryArtisanId || null;
  const [settings, artisan] = await Promise.all([
    dbi.collection('adminSettings').findOne({}, { projection: { financial: 1 } }),
    artisanId
      ? dbi.collection('users').findOne(
          { $or: [{ userID: artisanId }, { email: artisanId }] },
          { projection: { userID: 1, name: 1, artisanApplication: 1 } },
        )
      : null,
  ]);
  const defaultMarkup = Number(settings?.financial?.cogMarkup) > 0 ? Number(settings.financial.cogMarkup) : 2.5;
  const artisanFee = Number(artisan?.artisanApplication?.customDesignFee) || 0;
  const sharedCosts = sharedCostsFor(design?.pricing || {}, {
    artisanFee,
    editionType: design?.edition?.type ?? design?.editionType ?? null,
    editionLimit: design?.edition?.limit ?? design?.editionLimit ?? null,
  });
  return { defaultMarkup, sharedCosts, artisanProfile: artisan };
}
