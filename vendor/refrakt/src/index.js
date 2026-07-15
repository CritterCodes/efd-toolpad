/**
 * REFRAKT — Engine barrel export.
 *
 * Public entry point for consumers embedding the engine in their own app:
 *
 *   import { JewelryViewer } from '@/lib/refrakt'
 *
 * JewelryViewer is a client-only WebGL component — always load it via
 * `dynamic(() => import('...'), { ssr: false })` (see app/components/JewelryViewerClient.js).
 */

export { default as JewelryViewer } from './JewelryViewer';
export { default as Studio } from './studio/Studio';
export { default as Customizer } from './customizer/Customizer';
export { default as ConfiguratorSetup } from './customizer/ConfiguratorSetup';
export { GEM_CONFIGS, GOLD_MAT, SATIN_MAT, SILVER_MAT } from './core/materials';
export { VERT, buildFrag } from './core/shaders';
export { makeMat, syncBVH } from './core/helpers';
export { Lights, GlowLight } from './core/lights';
export { METAL_DEFAULTS, METAL_MATS, makeMetalMat, resolveGemCfg, gemDefaults, gemEff, metalEff } from './core/finishes';
// Material vocabulary — the single source apps import instead of hardcoding their
// own finish/preset lists (the "vocab contract").
export { METALS, GEMS, MATERIAL_LIBRARY, METAL_LABEL, GEM_LABEL, METAL_FINISH_WORD, GEM_FINISH_WORD, VALID_FINISHES, VALID_GEM_PRESETS, isFinish, isGemPreset, validateMeshMap } from './core/library';
// Material registry — curated baseline + tenant materials injected via the `materials`
// prop. `createRegistry`/`validateMaterial` for non-component use (e.g. server validation).
export { createRegistry, defaultRegistry, validateMaterial } from './core/registry';
export { BASELINE } from './core/baseline';
// Render scene vocabulary (client-safe data) — the settings a generated render can be
// placed in. The viewer's scene picker reads these; the server helper (@crittercodes/
// refrakt/server) turns the chosen id into prompt text. Pure data, no secrets.
export { RENDER_SCENES, DEFAULT_SCENE, sceneFragment } from './core/renderScenes';
// Customizer surface — data layer (config-in readers + selection-out builder). Implements the
// team seam contract decisions/0002; additive per decisions/0001. The <Customizer> component
// (added with the owner's design) is a thin UI over these pure helpers.
export { readCustomizableSlots, applyChoicesToMeshMap, buildRefraktSelection, buildSelectionFromCustomize, meshMatchesSlot, optionId } from './customizer/selection';
export { validateCustomizable } from './customizer/validate';
