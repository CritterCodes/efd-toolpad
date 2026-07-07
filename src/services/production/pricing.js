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

export function priceSelection({
  resolvedMeshMap = [],
  stlVolumeCm3 = 0,
  metalPrices = {},
  resolveMetalKey = () => null,
  gemUnitPrice = () => 0,
  findingsCost = 0,
  laborCost = 0,
  markup = 1,
  currency = 'USD',
} = {}) {
  const slots = Array.isArray(resolvedMeshMap) ? resolvedMeshMap : [];
  const breakdown = { metal: 0, gems: 0, findings: round(findingsCost), labor: round(laborCost) };
  const gemLines = [];

  for (const slot of slots) {
    if (slot?.type === 'metal' && slot.finish) {
      const metalKey = resolveMetalKey(slot.finish);
      if (metalKey) {
        const { metalCost } = estimateMetalCost({ volumeCm3: stlVolumeCm3, metalKey, metalPrices });
        breakdown.metal = round(breakdown.metal + metalCost);
      }
    } else if (slot?.type === 'gem' && slot.gemPreset) {
      const unit = Number(gemUnitPrice(slot.gemPreset)) || 0;
      const qty = Math.max(Number(slot.qty) || 1, 1);
      breakdown.gems = round(breakdown.gems + unit * qty);
      gemLines.push({ gemPreset: slot.gemPreset, qty, unit: round(unit) });
    }
  }

  const costBasis = round(breakdown.metal + breakdown.gems + breakdown.findings + breakdown.labor);
  const price = round(costBasis * (Number(markup) || 1));
  return { price, currency, costBasis, breakdown: { ...breakdown, gemLines } };
}
