/**
 * REFRAKT — geometry helpers (pure, engine-agnostic).
 *
 * Currently: signed mesh-volume extraction, used by <ConfiguratorSetup> to emit a per-slot
 * `volumeCm3` (decisions/0005 §6 — admin's live-pricing endpoint prices per-part metal from
 * volume × SG × live $/g). refrakt already loads the GLB, so volume belongs here rather than a
 * second GLB parse admin-side. Never prices — it only measures geometry.
 *
 * UNITS (the one real unknown — see thread #133/#137): signed volume comes out in the GLB's own
 * model units³. The caller states the unit; refrakt never guesses. Pass either:
 *   - `modelUnit: 'mm' | 'cm' | 'm'`  (convenience; default 'cm' — matches admin's STL pipeline,
 *      which treats model coords as cm with no scale factor, so an omitted unit stays consistent
 *      with the whole-piece fallback. Confirm per asset vs a known-mass reference — thread #137), or
 *   - `unitScale: <centimeters per model unit>` (explicit; overrides modelUnit).
 * volumeCm3 = rawModelVolume × unitScale³.
 */

import * as THREE from 'three';

import { meshMatchesSlot } from '../customizer/selection';

// Centimeters per one model unit, by declared GLB unit.
export const UNIT_CM = { mm: 0.1, cm: 1, m: 100 };

function resolveUnitScale({ unitScale, modelUnit = 'cm' } = {}) {
  if (typeof unitScale === 'number' && unitScale > 0) return unitScale;
  return UNIT_CM[modelUnit] ?? UNIT_CM.cm;
}

/**
 * Signed volume of a single mesh in MODEL units³ (world-space; captures GLB node scale).
 * Sum of signed tetrahedra from the origin over every triangle: Σ (v0 · (v1 × v2)) / 6.
 * Absolute value returned (winding-independent). Assumes a closed/watertight surface — an
 * open mesh yields an approximate figure. Robust to indexed + non-indexed geometry.
 */
export function signedVolumeOfMesh(mesh) {
  const geom = mesh && mesh.geometry;
  const pos = geom && geom.attributes && geom.attributes.position;
  if (!pos) return 0;
  const m = mesh.matrixWorld || new THREE.Matrix4();
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const bc = new THREE.Vector3();
  let vol = 0;
  const tri = (i0, i1, i2) => {
    a.fromBufferAttribute(pos, i0).applyMatrix4(m);
    b.fromBufferAttribute(pos, i1).applyMatrix4(m);
    c.fromBufferAttribute(pos, i2).applyMatrix4(m);
    bc.copy(b).cross(c);
    vol += a.dot(bc) / 6;
  };
  const index = geom.index;
  if (index) {
    for (let i = 0; i < index.count; i += 3) tri(index.getX(i), index.getX(i + 1), index.getX(i + 2));
  } else {
    for (let i = 0; i < pos.count; i += 3) tri(i, i + 1, i + 2);
  }
  return Math.abs(vol);
}

/**
 * Walk a loaded GLB scene/object and return volume in cm³ per meshMap slot, summed across all
 * meshes matched to that slot (a slot may map to several meshes). Only slots that match at least
 * one mesh appear in the result.
 *
 * @param {THREE.Object3D} root         a loaded GLB scene (e.g. drei useGLTF's `scene`)
 * @param {Array}          meshMap      the config meshMap (slots have `nameContains` / `match`)
 * @param {Object}         [opts]       { modelUnit?: 'mm'|'cm'|'m', unitScale?: number }
 * @returns {Object<string, number>}    { [slot.nameContains]: volumeCm3 }
 */
export function computeSlotVolumes(root, meshMap = [], opts = {}) {
  if (!root || !Array.isArray(meshMap)) return {};
  const scale = resolveUnitScale(opts);
  const factor = scale * scale * scale; // model-unit³ → cm³
  if (typeof root.updateMatrixWorld === 'function') root.updateMatrixWorld(true);

  const meshes = [];
  root.traverse((o) => { if (o.isMesh && o.geometry && !o.userData?.__outline) meshes.push(o); });

  const out = {};
  for (const slot of meshMap) {
    if (!slot || !slot.nameContains) continue;
    let raw = 0;
    for (const mesh of meshes) if (meshMatchesSlot(mesh.name, slot)) raw += signedVolumeOfMesh(mesh);
    if (raw > 0) out[slot.nameContains] = raw * factor;
  }
  return out;
}
