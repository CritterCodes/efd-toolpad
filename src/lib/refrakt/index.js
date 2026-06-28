/**
 * REFRAKT — Engine barrel export.
 *
 * PORTED (v2) from the canonical refrakt repo (EngelFineDesign/refrakt) — engine files
 * here are kept byte-identical to that repo so the planned shared `packages/refrakt`
 * migration is a clean swap. Do not hand-edit the engine in admin; change it in the
 * refrakt repo and re-copy. See memory: refrakt-viewer-architecture.
 *
 * Public entry point for consumers embedding the engine in their own app:
 *
 *   import { JewelryViewer } from '@/lib/refrakt'
 *
 * JewelryViewer is a client-only WebGL component — always load it via
 * `dynamic(() => import('...'), { ssr: false })` (see app/components/JewelryViewerClient.js).
 */

export { default as JewelryViewer } from './JewelryViewer';
export { GEM_CONFIGS, GOLD_MAT, SATIN_MAT, SILVER_MAT } from './core/materials';
export { VERT, buildFrag } from './core/shaders';
export { makeMat, syncBVH } from './core/helpers';
export { Lights, GlowLight } from './core/lights';
