/**
 * REFRAKT — Material vocabulary (derived from the baseline registry)
 *
 * The metals/gems an app may offer/store. Now a VIEW over `defaultRegistry` (which is
 * built from `baseline.js`) — apps still import these instead of hardcoding their own
 * lists. A tenant's own materials are merged at runtime by passing a `materials` prop to
 * `<Studio>` / `<JewelryViewer>` (see docs/MATERIAL_REGISTRY_SPEC.md); these module-level
 * exports reflect the baseline only.
 *
 * Offered vs valid: `METALS`/`GEMS` are the curated *offered* picker lists; the validators
 * (`isFinish`/`isGemPreset`/`validateMeshMap`/`VALID_*`) accept the full *valid* engine vocab
 * (a superset that still includes e.g. `marquise`), so a legacy/valid config never fails.
 */

import { defaultRegistry } from './registry';

// Curated picker lists: { id, label, kind, finishWord, swatch, offered, params }
export const METALS = defaultRegistry.metals;
export const GEMS = defaultRegistry.gems;
export const MATERIAL_LIBRARY = { metals: METALS, gems: GEMS };

// Label / finish-word lookups cover ALL descriptors (incl. non-offered like marquise),
// so anything a config references still resolves to a display label.
export const METAL_LABEL = Object.fromEntries(defaultRegistry.all.filter((d) => d.kind === 'metal').map((d) => [d.id, d.label]));
export const GEM_LABEL = Object.fromEntries(defaultRegistry.all.filter((d) => d.kind === 'gem').map((d) => [d.id, d.label]));
export const METAL_FINISH_WORD = Object.fromEntries(defaultRegistry.all.filter((d) => d.kind === 'metal').map((d) => [d.id, d.finishWord || 'Polished']));
export const GEM_FINISH_WORD = 'Brilliant cut';

// Valid engine vocab (superset of the offered picker).
export const VALID_FINISHES = defaultRegistry.all.filter((d) => d.kind === 'metal').map((d) => d.id);
export const VALID_GEM_PRESETS = defaultRegistry.all.filter((d) => d.kind === 'gem').map((d) => d.id);
export const isFinish = (id) => VALID_FINISHES.includes(id);
export const isGemPreset = (id) => VALID_GEM_PRESETS.includes(id);

/** Validate a config's meshMap against the baseline engine vocab. */
export function validateMeshMap(meshMap) { return defaultRegistry.validateMeshMap(meshMap); }
