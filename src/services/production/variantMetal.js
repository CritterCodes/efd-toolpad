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
