/**
 * REFRAKT — Material finish resolution (backward-compat surface over the registry)
 *
 * `resolveGemCfg` / `makeMetalMat` now delegate to the baseline `defaultRegistry`
 * (single source of truth); `METAL_DEFAULTS` / `gemDefaults` / `gemEff` / `metalEff`
 * are derived from the baseline descriptors. Every viewer still resolves materials
 * through here (or through a registry built from a `materials` prop), so staged == shop.
 * Exports unchanged for 1.x consumers — see docs/MATERIAL_REGISTRY_SPEC.md.
 */

import { BASELINE } from './baseline';
import { defaultRegistry } from './registry';

const metals = BASELINE.filter((d) => d.kind === 'metal');
const gems = BASELINE.filter((d) => d.kind === 'gem');

// Per-finish base color + roughness — derived from the baseline metal descriptors.
export const METAL_DEFAULTS = Object.fromEntries(metals.map((d) => [d.id, { color: d.params.color.slice(), roughness: d.params.roughness }]));

// Factory map (back-compat): each finish → a freshly-built MeshPhysicalMaterial.
export const METAL_MATS = Object.fromEntries(metals.map((d) => [d.id, () => defaultRegistry.makeMetal({ finish: d.id })]));

/** Build a metal material from a slot/assignment (delegates to the baseline registry). */
export function makeMetalMat(m) { return defaultRegistry.makeMetal(m); }

/** Resolve a gem slot/assignment into makeMat() uniforms (delegates to the baseline registry). */
export function resolveGemCfg(m) { return defaultRegistry.resolveGem(m); }

// ── Editor helpers (short-name internal shape) ──────────────────────────────────
const GEM_DEFAULTS = Object.fromEntries(gems.map((d) => {
  const p = d.params;
  return [d.id, { ior: p.ior, color: p.color.slice(), aber: p.aberration, fresnel: p.fresnel, fb: p.facetBlend, cm: p.colorMode, density: p.density ?? 0, velvet: p.velvet ?? 0, opacity: p.opacity ?? 0 }];
}));

/** Preset gem defaults as plain values, for seeding the Studio's sliders. */
export function gemDefaults(preset) { return { ...(GEM_DEFAULTS[preset] || GEM_DEFAULTS.diamond) }; }

/** Effective gem params = preset defaults overridden by `over`. */
export function gemEff(over, preset) {
  const a = over || {}, d = gemDefaults(preset);
  return { ior: a.ior ?? d.ior, color: a.color ?? d.color, aber: a.aber ?? d.aber, fresnel: a.fresnel ?? d.fresnel, fb: a.fb ?? d.fb, cm: a.cm ?? d.cm, density: a.density ?? d.density, velvet: a.velvet ?? d.velvet, opacity: a.opacity ?? d.opacity };
}

/** Effective metal params = finish defaults overridden by `over`. */
export function metalEff(over, finish) {
  const a = over || {}, d = METAL_DEFAULTS[finish] || METAL_DEFAULTS.gold;
  return { color: a.color ?? d.color, roughness: a.roughness ?? d.roughness };
}
