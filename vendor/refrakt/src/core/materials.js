/**
 * REFRAKT — Metal materials + gem config table.
 *
 * These are now VIEWS over the single source of truth (`baseline.js`): `GEM_CONFIGS`
 * and the named metal mats are derived from the baseline descriptors so there's one
 * place to edit a material. Exports kept for backward compatibility (1.x consumers).
 *
 *   import { GOLD_MAT, SATIN_MAT, SILVER_MAT } from '../core/materials'
 *   child.material = GOLD_MAT.clone()  // clone for per-mesh independence
 */

import * as THREE from 'three';
import { BASELINE } from './baseline';

const byId = Object.fromEntries(BASELINE.map((d) => [d.id, d]));
const metalMat = (p) => new THREE.MeshPhysicalMaterial({ color: new THREE.Color(p.color[0], p.color[1], p.color[2]), metalness: p.metalness ?? 1, roughness: p.roughness ?? 0.1, envMapIntensity: p.envMapIntensity ?? 1.6 });

// High-polish yellow gold / satin gold / white-gold-platinum-silver — derived from baseline.
export const GOLD_MAT = metalMat(byId.gold.params);
export const SATIN_MAT = metalMat(byId.satin.params);
export const SILVER_MAT = metalMat(byId.whiteGold.params); // shared by white gold / platinum / silver

/**
 * GEM_CONFIGS — BVH shader parameters for each gem, keyed by id. Derived from the
 * baseline descriptors (long-name `params` → the short-name shape makeMat() expects:
 * aber/fb/cm/off). Pass an entry's fields to makeMat() in helpers.js.
 */
export const GEM_CONFIGS = Object.fromEntries(
  BASELINE.filter((d) => d.kind === 'gem').map((d) => {
    const p = d.params;
    return [d.id, { ior: p.ior, color: new THREE.Color(p.color[0], p.color[1], p.color[2]), aber: p.aberration, fresnel: p.fresnel, fb: p.facetBlend, cm: p.colorMode, off: p.bvhOffset, density: p.density ?? 0, velvet: p.velvet ?? 0, opacity: p.opacity ?? 0 }];
  })
);
