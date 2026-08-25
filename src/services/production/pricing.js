/**
 * Live configuration pricing (M3-T3 / decision 0002 v2). **Admin is the SOLE pricing
 * brain** — refrakt renders no price, shop never computes one; both call this.
 *
 * Prices the **resolved** meshMap (every slot concrete — customizable slots → the
 * customer's choice, fixed slots → as-built; per @refrakt #123) so fixed parts are
 * never missed. Composes: metal (STL weight × chosen metal, via `designCost`) + gems
 * (chosen gemPresets × unit price) + findings + labor, then applies the retail markup.
 *
 * Metal-key resolution and gem unit pricing are INJECTED so this math is deterministic
 * and unit-testable; the route supplies the real policies (see route + open questions):
 *   - resolveMetalKey(finish) → a METAL_TYPES key, or null to skip the slot
 *   - gemUnitPrice(gemPreset) → number (0 when unpriced)
 * `costBasis`/breakdown are admin-internal — the route decides what crosses to shop.
 */
import { estimateMetalCost } from '@/services/production/designCost';

const round = (v) => Math.round((Number(v) || 0) * 100) / 100;

/**
 * Build a per-slot metal-volume resolver (fixes the multi-metal double-count, #187). Each metal slot
 * is priced off ITS OWN authored `volumeCm3` (from the design meshMap, joined by `nameContains`).
 * Whole-model `stlVolumeCm3` is used ONLY as a single-metal-slot fallback — with ≥2 metal slots, a
 * slot lacking an authored volume returns 0 (never the whole model), so nothing double-counts.
 * @returns {(slot:object) => number}
 */
export function resolveMetalVolumes({ resolvedMeshMap = [], designMeshMap = [], stlVolumeCm3 = 0 } = {}) {
  const volByName = new Map();
  for (const s of (Array.isArray(designMeshMap) ? designMeshMap : [])) {
    if (s && typeof s.volumeCm3 === 'number' && s.nameContains) volByName.set(s.nameContains, s.volumeCm3);
  }
  const metalSlotCount = (Array.isArray(resolvedMeshMap) ? resolvedMeshMap : [])
    .filter((s) => s?.type === 'metal' && s.finish).length;
  const single = metalSlotCount === 1;
  return (slot) => {
    const v = volByName.get(slot?.nameContains);
    if (typeof v === 'number') return v;
    return single ? (Number(stlVolumeCm3) || 0) : 0; // whole-model only when there's exactly one metal slot
  };
}

export function priceSelection({
  resolvedMeshMap = [],
  stlVolumeCm3 = 0,
  metalPrices = {},
  resolveMetalKey = () => null,
  resolveSlotVolumeCm3 = () => null,
  gemUnitPrice = () => 0,
  findingsCost = 0,
  laborCost = 0,
  markup = 1,
  currency = 'USD',
} = {}) {
  const slots = Array.isArray(resolvedMeshMap) ? resolvedMeshMap : [];
  const breakdown = { metal: 0, gems: 0, findings: round(findingsCost), labor: round(laborCost) };
  const gemLines = [];
  // The casting house's print/sprue fee is charged PER PIECE, not per metal slot: a
  // two-tone ring is still one print. estimateMetalCost folds it into `metalCost`
  // (correct for the customs path, which prices one mounting), so here we take each
  // slot's METAL-ONLY figure and add the fee exactly once below — otherwise a band +
  // prongs design pays it twice.
  let printSetupFee = 0;

  for (const slot of slots) {
    if (slot?.type === 'metal' && slot.finish) {
      const metalKey = resolveMetalKey(slot.finish);
      if (metalKey) {
        // Per-slot volume (#187). null/undefined → whole-model stlVolumeCm3 (legacy single-slot behavior).
        const raw = resolveSlotVolumeCm3(slot);
        const volumeCm3 = (raw === null || raw === undefined) ? stlVolumeCm3 : (Number(raw) || 0);
        const priced = estimateMetalCost({ volumeCm3, metalKey, metalPrices });
        breakdown.metal = round(breakdown.metal + priced.metalOnlyCost);
        // Highest slot fee wins (they're identical today); zero when metal is unpriced.
        printSetupFee = Math.max(printSetupFee, Number(priced.printSetupFee) || 0);
      }
    } else if (slot?.type === 'gem' && slot.gemPreset) {
      const unit = Number(gemUnitPrice(slot.gemPreset)) || 0;
      const qty = Math.max(Number(slot.qty) || 1, 1);
      breakdown.gems = round(breakdown.gems + unit * qty);
      gemLines.push({ gemPreset: slot.gemPreset, qty, unit: round(unit) });
    }
  }

  // One piece, one print/sprue charge — added after the slot loop, never inside it.
  breakdown.printSetup = round(printSetupFee);
  const costBasis = round(breakdown.metal + breakdown.printSetup + breakdown.gems + breakdown.findings + breakdown.labor);
  const price = round(costBasis * (Number(markup) || 1));
  return { price, currency, costBasis, breakdown: { ...breakdown, gemLines } };
}
