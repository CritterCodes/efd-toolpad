/**
 * REFRAKT — Baseline material descriptors (the single source of truth)
 *
 * One descriptor per curated material — the recipe (shader/BRDF params) and the menu
 * (id/label/offered) collapsed into one object. `materials.js` (GEM_CONFIGS + metal mats),
 * `finishes.js` (resolvers/defaults), and `library.js` (picker lists/validators) all DERIVE
 * from this array, so adding a material is a single entry here.
 *
 * Descriptor shape (see docs/MATERIAL_REGISTRY_SPEC.md):
 *   { id, kind:'gem'|'metal', label, params:{…}, offered?, finishWord?, swatch? }
 *   gem params:   { ior, color:[r,g,b], aberration, fresnel, facetBlend, colorMode, density, velvet, opacity, bvhOffset }
 *   metal params: { color:[r,g,b], roughness, metalness, envMapIntensity }
 *
 * Pure data — NO three.js import (keeps it a portable descriptor; THREE objects are
 * built downstream). Colours are linear RGB 0..1, same encoding as a meshMap `color`.
 *
 * `offered:false` = renderable + valid but hidden from pickers (e.g. `marquise`, a cut).
 */

const gem = (id, label, params, offered = true) => ({ id, kind: 'gem', label, finishWord: 'Brilliant cut', offered, params: { density: 0, velvet: 0, opacity: 0, bvhOffset: 0.001, ...params } });
const metal = (id, label, params, finishWord = 'Polished') => ({ id, kind: 'metal', label, finishWord, offered: true, params: { metalness: 1, envMapIntensity: 1.6, ...params } });

export const BASELINE = [
  // ── Metals (picker order) ───────────────────────────────────────────────────
  metal('gold', 'Yellow Gold', { color: [0.85, 0.62, 0.20], roughness: 0.07, metalness: 1.0, envMapIntensity: 2.5 }),
  metal('satin', 'Satin Gold', { color: [0.78, 0.56, 0.16], roughness: 0.72, metalness: 0.95, envMapIntensity: 0.9 }, 'Brushed'),
  metal('whiteGold', 'White Gold', { color: [0.76, 0.78, 0.82], roughness: 0.14, metalness: 1.0, envMapIntensity: 1.6 }),
  metal('roseGold', 'Rose Gold', { color: [0.85, 0.58, 0.52], roughness: 0.07, metalness: 1.0, envMapIntensity: 2.0 }),
  metal('platinum', 'Platinum', { color: [0.80, 0.82, 0.85], roughness: 0.09, metalness: 1.0, envMapIntensity: 1.8 }),
  metal('silver', 'Silver', { color: [0.76, 0.78, 0.82], roughness: 0.14, metalness: 1.0, envMapIntensity: 1.6 }),

  // ── Gems (picker order) ─────────────────────────────────────────────────────
  gem('diamond', 'Diamond', { ior: 2.42, color: [1, 1, 1], aberration: 0.025, fresnel: 0.25, facetBlend: 0.0, colorMode: 0, bvhOffset: 0.01 }),
  gem('moissanite', 'Moissanite', { ior: 2.65, color: [0.98, 0.98, 1.0], aberration: 0.032, fresnel: 0.28, facetBlend: 0.0, colorMode: 0, bvhOffset: 0.01 }),
  gem('amethyst', 'Amethyst', { ior: 1.54, color: [0.60, 0.22, 0.90], aberration: 0.02, fresnel: 0.0, facetBlend: 0.0, colorMode: 1, density: 1.4, velvet: 0.2, opacity: 0.12, bvhOffset: 0.00005 }),
  gem('ruby', 'Ruby', { ior: 1.77, color: [0.88, 0.08, 0.15], aberration: 0.015, fresnel: 0.15, facetBlend: 0.0, colorMode: 1, density: 2.2, velvet: 0.3, opacity: 0.22, bvhOffset: 0.0001 }),
  gem('sapphire', 'Sapphire', { ior: 1.77, color: [0.10, 0.20, 0.85], aberration: 0.015, fresnel: 0.15, facetBlend: 0.0, colorMode: 1, density: 2.2, velvet: 0.32, opacity: 0.25, bvhOffset: 0.0001 }),
  gem('emerald', 'Emerald', { ior: 1.57, color: [0.05, 0.60, 0.15], aberration: 0.012, fresnel: 0.10, facetBlend: 0.0, colorMode: 1, density: 3.0, velvet: 0.5, opacity: 0.32, bvhOffset: 0.0001 }),
  // Additional common colored stones — parameter-only (no special optics like play-of-colour,
  // asterism, or colour-change, which the shader doesn't simulate).
  gem('aquamarine', 'Aquamarine', { ior: 1.58, color: [0.45, 0.78, 0.85], aberration: 0.013, fresnel: 0.12, facetBlend: 0.0, colorMode: 1, density: 1.2, velvet: 0.12, opacity: 0.10, bvhOffset: 0.0001 }),
  gem('blueTopaz', 'Blue Topaz', { ior: 1.62, color: [0.30, 0.62, 0.85], aberration: 0.014, fresnel: 0.12, facetBlend: 0.0, colorMode: 1, density: 1.6, velvet: 0.12, opacity: 0.12, bvhOffset: 0.0001 }),
  gem('citrine', 'Citrine', { ior: 1.55, color: [0.95, 0.62, 0.12], aberration: 0.013, fresnel: 0.10, facetBlend: 0.0, colorMode: 1, density: 1.6, velvet: 0.12, opacity: 0.12, bvhOffset: 0.0001 }),
  gem('peridot', 'Peridot', { ior: 1.65, color: [0.55, 0.75, 0.12], aberration: 0.016, fresnel: 0.12, facetBlend: 0.0, colorMode: 1, density: 1.8, velvet: 0.15, opacity: 0.14, bvhOffset: 0.0001 }),
  gem('garnet', 'Garnet', { ior: 1.79, color: [0.62, 0.06, 0.07], aberration: 0.016, fresnel: 0.15, facetBlend: 0.0, colorMode: 1, density: 3.0, velvet: 0.25, opacity: 0.20, bvhOffset: 0.0001 }),
  gem('tanzanite', 'Tanzanite', { ior: 1.69, color: [0.35, 0.25, 0.78], aberration: 0.014, fresnel: 0.13, facetBlend: 0.0, colorMode: 1, density: 2.2, velvet: 0.20, opacity: 0.18, bvhOffset: 0.0001 }),
  gem('morganite', 'Morganite', { ior: 1.585, color: [0.95, 0.72, 0.70], aberration: 0.012, fresnel: 0.10, facetBlend: 0.0, colorMode: 1, density: 1.0, velvet: 0.12, opacity: 0.10, bvhOffset: 0.0001 }),
  gem('pinkTourmaline', 'Pink Tourmaline', { ior: 1.62, color: [0.90, 0.22, 0.45], aberration: 0.014, fresnel: 0.13, facetBlend: 0.0, colorMode: 1, density: 2.0, velvet: 0.18, opacity: 0.16, bvhOffset: 0.0001 }),
  // Marquise is a CUT, not a material — renderable + valid, but not offered as a pick.
  gem('marquise', 'Marquise', { ior: 2.42, color: [1, 1, 1], aberration: 0.008, fresnel: 0.25, facetBlend: 1.0, colorMode: 0, bvhOffset: 0.01 }, false),
];
