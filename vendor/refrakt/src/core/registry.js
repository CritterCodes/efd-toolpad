/**
 * REFRAKT — Material Registry
 *
 * Merges the curated BASELINE with tenant-supplied descriptors (the app fetches those
 * from its own DB and passes them in via the `materials` prop) and exposes everything the
 * viewers/Studio need: offered picker lists, gem/metal resolution, and validation.
 *
 * The package stays DB-agnostic — it consumes descriptors, never fetches. See
 * docs/MATERIAL_REGISTRY_SPEC.md.
 */

import * as THREE from 'three';
import { BASELINE } from './baseline';

const NUM = (v) => typeof v === 'number' && Number.isFinite(v);
const isRGB = (c) => Array.isArray(c) && c.length === 3 && c.every(NUM);

/** Validate one descriptor. @returns {{ valid:boolean, errors:string[] }} */
export function validateMaterial(d) {
  const errors = [];
  if (!d || typeof d !== 'object') return { valid: false, errors: ['descriptor must be an object'] };
  if (!d.id || typeof d.id !== 'string') errors.push('id (non-empty string) required');
  if (d.kind !== 'gem' && d.kind !== 'metal') errors.push(`kind must be 'gem' | 'metal' (got ${JSON.stringify(d.kind)})`);
  if (!d.label || typeof d.label !== 'string') errors.push('label (non-empty string) required');
  const p = d.params;
  if (!p || typeof p !== 'object') errors.push('params object required');
  else if (d.kind === 'gem') {
    if (!isRGB(p.color)) errors.push('gem params.color must be [r,g,b]');
    for (const k of ['ior', 'aberration', 'fresnel', 'facetBlend', 'density', 'velvet', 'opacity']) if (p[k] != null && !NUM(p[k])) errors.push(`gem params.${k} must be a number`);
  } else if (d.kind === 'metal') {
    if (!isRGB(p.color)) errors.push('metal params.color must be [r,g,b]');
    if (p.roughness != null && !NUM(p.roughness)) errors.push('metal params.roughness must be a number');
  }
  return { valid: errors.length === 0, errors };
}

const toHex = (rgb) => '#' + [0, 1, 2].map((i) => Math.round(Math.max(0, Math.min(1, rgb[i])) * 255).toString(16).padStart(2, '0')).join('');
// Public-facing card metadata for a descriptor (swatch derived from colour if absent).
const card = (d) => ({ id: d.id, kind: d.kind, label: d.label, finishWord: d.finishWord || (d.kind === 'gem' ? 'Brilliant cut' : 'Polished'), swatch: d.swatch || toHex(d.params.color || [0.8, 0.8, 0.8]), offered: d.offered !== false, params: d.params });

/**
 * Build a registry from optional tenant materials merged over the baseline.
 * @param {Array} [tenantMaterials] descriptors (app-sourced from its DB)
 * @param {{ onInvalid?: (d:any, errors:string[]) => void }} [opts]
 */
export function createRegistry(tenantMaterials, opts = {}) {
  const map = new Map();
  for (const d of BASELINE) map.set(d.id, d);
  for (const d of tenantMaterials || []) {
    const { valid, errors } = validateMaterial(d);
    if (!valid) { (opts.onInvalid || ((dd, e) => console.warn(`[REFRAKT] ignoring invalid material ${JSON.stringify(dd && dd.id)}:`, e.join('; '))))(d, errors); continue; }
    map.set(d.id, d); // new id adds; existing id overrides (last-wins)
  }
  const all = [...map.values()];
  const offered = (kind) => all.filter((d) => d.kind === kind && d.offered !== false).map(card);

  const get = (id) => map.get(id);
  const has = (id) => map.has(id);

  // Gem slot → makeMat() uniforms. Slot inline overrides (long OR short names) win over the
  // descriptor's params, which win over a diamond fallback.
  function resolveGem(slot = {}) {
    const p = (get(slot.gemPreset) || get('diamond') || { params: {} }).params;
    const colorArr = Array.isArray(slot.color) ? slot.color : p.color || [1, 1, 1];
    const color = new THREE.Color(colorArr[0], colorArr[1], colorArr[2]);
    const density = slot.density ?? p.density ?? 0;
    return {
      ior: slot.ior ?? p.ior ?? 2.42,
      color,
      aber: slot.aber ?? slot.aberration ?? p.aberration ?? 0.02,
      fresnel: slot.fresnel ?? p.fresnel ?? 0,
      fb: slot.fb ?? slot.facetBlend ?? p.facetBlend ?? 0,
      cm: slot.cm ?? slot.colorMode ?? p.colorMode ?? 0,
      off: slot.bvhOffset ?? slot.off ?? p.bvhOffset ?? 0.001,
      absorption: new THREE.Vector3((1 - color.r) * density, (1 - color.g) * density, (1 - color.b) * density),
      velvet: slot.velvet ?? p.velvet ?? 0,
      opacity: slot.opacity ?? p.opacity ?? 0,
    };
  }

  // Metal slot → MeshPhysicalMaterial (built from descriptor params; slot overrides color/roughness).
  function makeMetal(slot = {}) {
    const p = (get(slot.finish) || get('gold') || { params: {} }).params;
    const colorArr = Array.isArray(slot.color) ? slot.color : p.color || [0.85, 0.62, 0.2];
    return new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(colorArr[0], colorArr[1], colorArr[2]),
      metalness: p.metalness ?? 1,
      roughness: slot.roughness ?? p.roughness ?? 0.1,
      envMapIntensity: p.envMapIntensity ?? 1.6,
    });
  }

  function validateMeshMap(meshMap) {
    if (!Array.isArray(meshMap)) return { valid: false, errors: ['meshMap must be an array'] };
    const errors = [];
    meshMap.forEach((s, i) => {
      if (!s || !['metal', 'gem', 'ignore'].includes(s.type)) { errors.push(`slot ${i}: invalid type ${JSON.stringify(s && s.type)}`); return; }
      if (s.type === 'metal' && s.finish != null && !has(s.finish)) errors.push(`slot ${i}: unknown metal finish "${s.finish}"`);
      if (s.type === 'gem' && s.gemPreset != null && !has(s.gemPreset)) errors.push(`slot ${i}: unknown gemPreset "${s.gemPreset}"`);
    });
    return { valid: errors.length === 0, errors };
  }

  return {
    get, has,
    get all() { return all; },
    get metals() { return offered('metal'); },
    get gems() { return offered('gem'); },
    resolveGem, makeMetal, validateMeshMap,
    isValid: has,
  };
}

/** Baseline-only registry — backs the module-level convenience exports (no tenant materials). */
export const defaultRegistry = createRegistry();
