/**
 * REFRAKT — geometry helpers (pure, engine-agnostic).
 *
 * Two measurements, both read off the (already-loaded) GLB so a host never re-parses it:
 *
 *   1. Signed mesh VOLUME (metal parts) → `computeSlotVolumes`, used by <ConfiguratorSetup> to
 *      emit a per-slot `volumeCm3` (decisions/0005 §6 — admin's live-pricing endpoint prices
 *      per-part metal from volume × SG × live $/g).
 *
 *   2. Gem SIZE + CUT (stone parts) → `measureGems` / `measureMesh`, which surface the girdle
 *      FOOTPRINT (`lengthMm`/`widthMm`, `depthMm` when it looks real), a diamond-equivalent
 *      `carat` derived from it, and a `cut` class (round | square | fancy). Melee/stones are
 *      ordered by mm, so mm is the primary spec; carat feeds coarse setting-labor bands.
 *
 * Never prices — it only measures geometry.
 *
 * UNITS. Volume (1) states its unit — signed volume comes out in the GLB's own model units³ and
 * the caller passes `modelUnit`/`unitScale` (see thread #133/#137). Gem sizing (2) AUTO-DETECTS
 * the unit from the overall model size instead (glTF's standard unit is meters and our CAD exports
 * come through that way): a whole-piece bbox `<1 → m`, `<5 → cm`, else `mm` (see detectUnitScaleMm).
 * The caller may still override via `modelUnit`/`unitScaleMm`.
 */

import * as THREE from 'three';

import { meshMatchesSlot } from '../customizer/selection';

// Centimeters per one model unit, by declared GLB unit (for signed VOLUME → cm³).
export const UNIT_CM = { mm: 0.1, cm: 1, m: 100 };
// Millimeters per one model unit, by declared GLB unit (for gem SIZE → mm).
export const UNIT_MM = { mm: 1, cm: 10, m: 1000 };

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

// ── Gem SIZE + CUT ──────────────────────────────────────────────────────────────────

// Trade increment stones are ordered on; snap footprint dims to it so near-identical stones
// bucket together and the reported size reads like a real spec ("1.5 mm", "5.0 × 3.0 mm").
const SNAP_MM = 0.25;
const snapMm = (mm) => Math.round(mm / SNAP_MM) * SNAP_MM;

// Diamond-equivalent carat, calibrated so a 6.5 mm round ≈ 1.00 ct. With depth taken as ~0.62 ×
// width, carat = 0.00364 × L × W²; for a round (L=W=d) this reduces to the standard (d / 6.5)³.
const CARAT_K = 0.00364;

/**
 * The cut shapes REFRAKT can store — the common brilliant + fancy trade shapes, offered in the
 * Studio cut selector. The geometry auto-GUESS only lands in the right neighborhood (a few shapes
 * that outline aspect + fill can separate); a human picks the exact shape and that's what's stored.
 * Order = display order in the picker (round first, then square family, then elongated/pointed).
 */
export const CUTS = ['round', 'oval', 'princess', 'cushion', 'radiant', 'emerald', 'asscher', 'baguette', 'pear', 'marquise', 'heart', 'trillion'];
export const isCut = (c) => CUTS.includes(c);

/**
 * Best-guess cut from the girdle outline (convex hull, oriented x = length / y = width), the
 * footprint aspect (L/W ≥ 1) and fill (hull area ÷ bounding rectangle). Analyzes the hull's shape:
 *   - CORNER CONCENTRATION — angular step cuts (princess/emerald/asscher/radiant/baguette) hold
 *     most of the outline's turning in a few sharp corners; brilliant/curved cuts spread it evenly.
 *   - TIPS — sharp points near the length extremes: two → marquise, one → pear/heart, three → trillion.
 *   - ASPECT — separates square (round/princess/asscher/cushion) from elongated (oval/emerald/baguette),
 *     and heart (~square, one tip) from pear (elongated, one tip).
 * It's still a GUESS — the Studio cut selector lets a human set the exact shape, which is what's stored.
 */
function classifyCut(hull, aspect, fill) {
  const n = hull.length;
  if (n < 3) return aspect >= 1.15 ? 'oval' : 'round';
  // Center the hull (x already = length axis, y = width axis).
  let cx = 0, cy = 0; for (const p of hull) { cx += p[0]; cy += p[1]; } cx /= n; cy /= n;
  const H = hull.map((p) => [p[0] - cx, p[1] - cy]);
  // Turn (exterior) angle at each vertex — a sharp corner concentrates turning; a smooth arc spreads it.
  const turn = new Array(n);
  for (let i = 0; i < n; i++) {
    const a = H[(i - 1 + n) % n], b = H[i], c = H[(i + 1) % n];
    const v1x = b[0] - a[0], v1y = b[1] - a[1], v2x = c[0] - b[0], v2y = c[1] - b[1];
    turn[i] = Math.abs(Math.atan2(v1x * v2y - v1y * v2x, v1x * v2x + v1y * v2y));
  }
  const total = turn.reduce((s, a) => s + a, 0) || (2 * Math.PI);
  const desc = [...turn].sort((a, b) => b - a);
  const frac = (k) => desc.slice(0, Math.min(k, n)).reduce((s, a) => s + a, 0) / total;
  const t3 = frac(3), t4 = frac(4), t8 = frac(8);

  // Angular (step/faceted-rectangle) outline: nearly all turning sits in ≤8 sharp corners.
  if (t8 > 0.85 && t4 > 0.48) {
    if (t3 > 0.80) return 'trillion';                // three dominant corners = triangle
    const fourSharp = t4 > 0.80;                     // 4 corners hold it (sharp) vs 8 (cut corners)
    if (aspect >= 1.35) return fourSharp ? 'baguette' : 'emerald';
    if (aspect >= 1.14) return 'radiant';            // gently elongated, cornered
    return fourSharp ? 'princess' : 'asscher';       // square: sharp vs cut corners
  }

  // Curved outline: look for sharp tips near the length extremes (close to the y centerline).
  const xs = H.map((p) => p[0]), ys = H.map((p) => p[1]);
  const maxX = Math.max(...xs), minX = Math.min(...xs);
  const halfW = (Math.max(...ys) - Math.min(...ys)) / 2 || 1;
  const tipAt = (sign) => {
    let sharp = 0;
    for (let i = 0; i < n; i++) {
      const nearEnd = sign > 0 ? H[i][0] > 0.72 * maxX : H[i][0] < 0.72 * minX;
      if (nearEnd && Math.abs(H[i][1]) < 0.4 * halfW && turn[i] > sharp) sharp = turn[i];
    }
    return sharp > 1.15; // ~66°+ turn at the end = a genuine point, not a smooth arc
  };
  const tipHi = tipAt(1), tipLo = tipAt(-1);
  if (tipHi && tipLo) return 'marquise';             // pointed both ends
  if (tipHi || tipLo) return aspect < 1.15 ? 'heart' : 'pear'; // one point: heart (square) vs pear (long)
  if (aspect >= 1.15) return 'oval';                 // smooth, elongated
  return fill > 0.80 ? 'cushion' : 'round';          // smooth, square: round fills ~0.785, cushion higher
}

const round2 = (n) => Math.round(n * 100) / 100;
const roundCarat = (c) => (c < 1 ? Math.round(c * 1000) / 1000 : Math.round(c * 100) / 100);
const comp = (attr, i, axis) => (axis === 0 ? attr.getX(i) : axis === 1 ? attr.getY(i) : attr.getZ(i));

// Convex hull of 2D points (Andrew's monotone chain), returned CCW. Approximates a stone's
// projected silhouette (round/oval/emerald/princess/marquise outlines are all convex); the crown
// and pavilion vertices fall inside the girdle outline, so the hull ≈ the girdle silhouette.
function convexHull2D(pts) {
  const n = pts.length;
  if (n < 3) return pts.slice();
  const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [];
  for (const pt of p) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], pt) <= 0) lower.pop(); lower.push(pt); }
  const upper = [];
  for (let i = p.length - 1; i >= 0; i--) { const pt = p[i]; while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], pt) <= 0) upper.pop(); upper.push(pt); }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}
// Shoelace area of a polygon.
function polyArea(poly) {
  let a = 0;
  for (let i = 0; i < poly.length; i++) { const p = poly[i], q = poly[(i + 1) % poly.length]; a += p[0] * q[1] - q[0] * p[1]; }
  return Math.abs(a) / 2;
}

/**
 * mm per one model unit, auto-detected from the overall model size. glTF's standard unit is
 * meters and our CAD exports come through that way (a ring's overall bbox ≈ 0.028 model units =
 * 28 mm): `<1 → m` (1000), `<5 → cm` (10), else `mm` (1). This is the units-auto refrakt does
 * for gems (volume still states its unit — see the module header / thread #133/#137).
 *
 * @param {THREE.Object3D} root  a loaded GLB scene
 * @returns {number}             mm per model unit (1000 | 10 | 1)
 */
export function detectUnitScaleMm(root) {
  if (!root) return 1;
  if (typeof root.updateMatrixWorld === 'function') root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  if (box.isEmpty()) return 1;
  const size = box.getSize(new THREE.Vector3());
  const overall = Math.max(size.x, size.y, size.z);
  if (!(overall > 0)) return 1;
  if (overall < 1) return UNIT_MM.m;   // meters
  if (overall < 5) return UNIT_MM.cm;  // centimeters
  return UNIT_MM.mm;                    // millimeters
}

const _mp = new THREE.Vector3();
const _mq = new THREE.Quaternion();
const _ms = new THREE.Vector3();

/**
 * Measure ONE gem mesh's footprint → `{ lengthMm, widthMm, depthMm?, carat, cut, footprintArea }`
 * (or `null` if it has no usable geometry).
 *
 * Uses the girdle FOOTPRINT (local bbox × world scale), never signed volume — cut stones aren't
 * watertight, so volume over-reports (on a real asset a 1.3 mm melee "measured" bigger than its
 * own bbox). Measured in the mesh's OWN local frame (node rotation ignored, only world scale
 * applied) so a tilted pavé-set stone isn't inflated by an axis-aligned world bbox. Every stone
 * is treated as a diamond (diamond-equivalent carat), matching how the bench eyeballs colored
 * stones. `footprintArea` (raw L×W, mm²) is exposed only so callers can pick the largest mesh
 * when several match one slot; it's not part of the stored spec.
 *
 * @param {THREE.Mesh} mesh
 * @param {number} unitScaleMm  mm per model unit (see detectUnitScaleMm)
 */
export function measureMesh(mesh, unitScaleMm = 1) {
  const geom = mesh && mesh.geometry;
  const pos = geom && geom.attributes && geom.attributes.position;
  if (!pos || pos.count < 3) return null;
  if (!geom.boundingBox) geom.computeBoundingBox();
  const bb = geom.boundingBox;
  // World scale only (ignore rotation/translation) so the stone keeps its own axes.
  (mesh.matrixWorld || new THREE.Matrix4()).decompose(_mp, _mq, _ms);
  const U = unitScaleMm > 0 ? unitScaleMm : 1;
  const sc = [(Math.abs(_ms.x) || 1) * U, (Math.abs(_ms.y) || 1) * U, (Math.abs(_ms.z) || 1) * U];
  const ext = [(bb.max.x - bb.min.x) * sc[0], (bb.max.y - bb.min.y) * sc[1], (bb.max.z - bb.min.z) * sc[2]];
  // Axes largest→smallest: the two largest are the footprint (L, W); the smallest is depth.
  const [aL, aW, aD] = [0, 1, 2].sort((a, b) => ext[b] - ext[a]);
  const Lraw = ext[aL], Wraw = ext[aW], Draw = ext[aD];
  if (!(Lraw > 0) || !(Wraw > 0)) return null;

  // Project onto the footprint plane (x = length axis, y = width axis) → convex hull → outline.
  const pts = new Array(pos.count);
  for (let i = 0; i < pos.count; i++) pts[i] = [comp(pos, i, aL) * sc[aL], comp(pos, i, aW) * sc[aW]];
  const hull = convexHull2D(pts);
  const hullArea = polyArea(hull);
  const fill = hullArea > 0 ? hullArea / (Lraw * Wraw) : 0; // fill = outline area ÷ bounding rectangle

  // Snap the footprint to the trade increment, then derive carat from the snapped size.
  const L = snapMm(Lraw), W = snapMm(Wraw);
  const carat = CARAT_K * L * W * W;
  const aspect = W > 0 ? L / W : 1;
  const cut = classifyCut(hull, aspect, fill);

  const out = { lengthMm: round2(L), widthMm: round2(W), carat: roundCarat(carat), cut, footprintArea: Lraw * Wraw };
  // Depth from raw mesh z is unreliable (bezel seats, tilt); report only when it looks like a real
  // full-stone depth (a sane fraction of the width), else omit — the host estimates it from width.
  if (Draw >= 0.35 * Wraw && Draw <= 1.6 * Wraw) out.depthMm = Math.round(Draw * 10) / 10;
  return out;
}

/**
 * Walk a loaded GLB and return the measured spec per GEM meshMap slot:
 * `{ [slot.nameContains]: { lengthMm, widthMm, depthMm?, carat, cut } }`. Only gem slots that
 * match ≥1 mesh appear. When several meshes match one slot (a `contains` rule catching a row of
 * identical melee), the largest-footprint mesh is reported (representative; exact per-mesh slots
 * match one mesh anyway). Units auto-detect (override with `modelUnit`/`unitScaleMm`).
 *
 * @param {THREE.Object3D} root    a loaded GLB scene (e.g. drei useGLTF's `scene`)
 * @param {Array}          meshMap the config meshMap
 * @param {Object}         [opts]  { modelUnit?: 'mm'|'cm'|'m', unitScaleMm?: number }
 * @returns {Object<string, {lengthMm:number,widthMm:number,depthMm?:number,carat:number,cut:string}>}
 */
export function measureGems(root, meshMap = [], opts = {}) {
  if (!root || !Array.isArray(meshMap)) return {};
  if (typeof root.updateMatrixWorld === 'function') root.updateMatrixWorld(true);
  const U = (typeof opts.unitScaleMm === 'number' && opts.unitScaleMm > 0)
    ? opts.unitScaleMm
    : (opts.modelUnit ? (UNIT_MM[opts.modelUnit] || detectUnitScaleMm(root)) : detectUnitScaleMm(root));
  const meshes = [];
  root.traverse((o) => { if (o.isMesh && o.geometry && !o.userData?.__outline) meshes.push(o); });

  const out = {};
  for (const slot of meshMap) {
    if (!slot || !slot.nameContains || slot.type !== 'gem') continue;
    let best = null;
    for (const mesh of meshes) {
      if (!meshMatchesSlot(mesh.name, slot)) continue;
      const m = measureMesh(mesh, U);
      if (m && (!best || m.footprintArea > best.footprintArea)) best = m;
    }
    if (best) { const { footprintArea, ...pub } = best; out[slot.nameContains] = pub; } // eslint-disable-line no-unused-vars
  }
  return out;
}
