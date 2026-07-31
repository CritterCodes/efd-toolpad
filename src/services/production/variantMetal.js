/**
 * Bridge between REFRAKT's metal model (FINISH/color only — gold/whiteGold/roseGold/
 * platinum/silver/satin) and the pricing model (metalKey with KARAT, e.g. GOLD_14K_YELLOW).
 * REFRAKT does not know karat; a variant carries finish (from the REFRAKT config) + karat
 * (a separate spec) and we compose the pricing metalKey from both.
 */

export const FINISH_OPTIONS = [
  { value: 'gold', label: 'Yellow Gold' },
  { value: 'whiteGold', label: 'White Gold' },
  { value: 'roseGold', label: 'Rose Gold' },
  { value: 'platinum', label: 'Platinum' },
  { value: 'silver', label: 'Silver' },
];
export const KARAT_OPTIONS = ['10', '14', '18'];

/** Which finishes actually use a karat (gold family); platinum/silver don't. */
export function finishUsesKarat(finish) {
  return finish === 'gold' || finish === 'whiteGold' || finish === 'roseGold' || finish === 'satin';
}

export function finishLabel(finish) {
  return FINISH_OPTIONS.find((f) => f.value === finish)?.label || (finish ? String(finish) : '—');
}

/** REFRAKT finish + karat → pricing metalKey (matches src/constants/metalTypes.js keys). */
export function composeMetalKey(finish, karat) {
  const k = KARAT_OPTIONS.includes(String(karat)) ? String(karat) : '14';
  switch (finish) {
    case 'platinum': return 'PLATINUM_IRIDIUM';
    case 'silver': return 'SILVER_STERLING';
    case 'whiteGold': return `GOLD_${k}K_WHITE`;
    case 'roseGold': return `GOLD_${k}K_RED`;
    case 'gold':
    case 'satin':
    default: return `GOLD_${k}K_YELLOW`;
  }
}

/** Derive the variant's primary finish from a REFRAKT viewer config (first metal slot). */
export function deriveFinish(viewerConfig) {
  const slots = viewerConfig?.meshMap || [];
  const metal = slots.find((s) => s.type === 'metal' && s.finish);
  return metal?.finish || 'gold';
}

/** Distinct metal finishes across a config's meshMap slots, in first-seen order. PURE. */
export function metalFinishes(viewerConfig) {
  const slots = viewerConfig?.meshMap || [];
  const found = slots.filter((s) => s?.type === 'metal' && s?.finish).map((s) => s.finish);
  return [...new Set(found)];
}

/**
 * Is this config TWO-TONE — more than one distinct metal finish across its meshes? PURE.
 *
 * WHY THIS GUARD EXISTS. `deriveFinish` above takes the FIRST metal slot and the pricing path
 * (designCost.estimateMetalCost) applies that single metal to the design's ENTIRE stl volume. That is
 * correct for a design offered in several metal OPTIONS — each variant is wholly one metal, and the
 * Pricing tab prices the full volume once per distinct `variant.metalKey`. It is wrong for a single
 * piece made of two metals: a yellow band with a white head is priced as 100% of whichever finish
 * happens to be listed first, silently under- or over-charging depending on which is cheaper.
 *
 * Pricing two-tone properly needs volume attributed PER MESH, which we don't capture — only a total
 * `stlVolumeCm3`. So this deliberately does NOT try to price it; it exists so the case cannot pass
 * unnoticed. Two slots sharing one finish is still single-metal and prices fine, which is why this
 * counts DISTINCT finishes rather than slots.
 *
 * As of 2026-07-31 no design in production has a meshMap at all, so this is a latent case, not a
 * live mispricing.
 */
export function isTwoTone(viewerConfig) {
  return metalFinishes(viewerConfig).length > 1;
}
