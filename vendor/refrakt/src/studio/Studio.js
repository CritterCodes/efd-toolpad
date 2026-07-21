'use client';

/**
 * REFRAKT Studio — three-pane material editor (toolbar · parts tree · viewer · inspector).
 *
 * Layout/visual design ported from the Claude Design mockup (design/REFRAKT-Studio.dc.html).
 * The center stage is the real R3F StudioViewer; the left parts tree is the source of
 * truth and we DERIVE the engine's per-mesh `assign` map + selection from it each render.
 */

import { Component, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGLTF } from '@react-three/drei';

import StudioViewer from './StudioViewer';
import MaterialOrb from './MaterialOrb';
import { GemBaker, GEM_SNAP, gemSnapKey } from './MaterialPreview';
import { createRegistry } from '../core/registry';
import { detectUnitScaleMm, measureMesh, CUTS } from '../core/geometry';
import { buildSelectionFromCustomize } from '../customizer/selection';
// Baseline label maps — only the module-level tree-seed fallback uses these; the
// component derives everything else (pickers, labels, eff params) from the registry
// it builds from the `materials` prop, so injected tenant materials show up too.
import { GEM_LABEL, METAL_LABEL } from '../core/library';

// ── Option tables ───────────────────────────────────────────────────────────
const ENVS = ['city', 'studio', 'sunset', 'dawn', 'night', 'warehouse', 'forest', 'park', 'lobby', 'apartment'];

const ACCENTS = { amber: ['#fbbf24', '251,191,36'], champagne: ['#e8c98a', '232,201,138'], rose: ['#fb7185', '251,113,133'], violet: ['#a78bfa', '167,139,250'], ice: ['#7fd1e6', '127,209,230'], emerald: ['#34d399', '52,211,153'] };

const GEM_GRAD = {
  diamond: 'radial-gradient(circle at 38% 30%, #ffffff, #cfe6ff 46%, #94aec6 100%)',
  moissanite: 'radial-gradient(circle at 38% 30%, #ffffff, #e0f2ff 46%, #b6c6d6 100%)',
  marquise: 'radial-gradient(circle at 38% 30%, #ffffff, #d8ecff 46%, #9fb6cc 100%)',
  amethyst: 'radial-gradient(circle at 38% 30%, #f0d9ff, #a855f7 46%, #5b1d8f 100%)',
  ruby: 'radial-gradient(circle at 38% 30%, #ffd0d0, #ef4444 46%, #8f1d1d 100%)',
  sapphire: 'radial-gradient(circle at 38% 30%, #cfe0ff, #3b82f6 46%, #1e3a8a 100%)',
  emerald: 'radial-gradient(circle at 38% 30%, #d6ffe9, #10b981 46%, #065f46 100%)',
};
const METAL_GRAD = {
  gold: 'radial-gradient(circle at 35% 28%, #fff4d2, #e7c054 42%, #a9781a 100%)',
  satin: 'radial-gradient(circle at 35% 28%, #f3e3b8, #c9a23e 50%, #8a6a1e 100%)',
  whiteGold: 'radial-gradient(circle at 35% 28%, #ffffff, #d6d8dc 50%, #9aa0a8 100%)',
  roseGold: 'radial-gradient(circle at 35% 28%, #ffe2da, #e0998c 50%, #b06a5e 100%)',
  platinum: 'radial-gradient(circle at 35% 28%, #ffffff, #d2d6dc 50%, #a4abb4 100%)',
  silver: 'radial-gradient(circle at 35% 28%, #ffffff, #cfd3d8 50%, #9ca3ab 100%)',
};

// Mirror of the viewer's metal mats (color + roughness) for custom-finish editing.
const clamp01 = (v) => Math.max(0, Math.min(1, v));
function rgbToHex(rgb) {
  const h = (x) => Math.round(clamp01(x) * 255).toString(16).padStart(2, '0');
  return '#' + h(rgb[0]) + h(rgb[1]) + h(rgb[2]);
}
function hexToRgb(hex) {
  const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex);
  return m ? [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255] : [1, 1, 1];
}

// ── Classification (seed material per mesh from name/material) ──────────────────
const GEM_KEYWORDS = { diamond: 'diamond', moissanite: 'moissanite', marquise: 'diamond', amethyst: 'amethyst', ruby: 'ruby', sapphire: 'sapphire', emerald: 'emerald', topaz: 'amethyst', gem: 'diamond', stone: 'diamond' };
const METAL_KEYWORDS = /gold|silver|platin|metal|band|shank|prong|mount|setting|head|bezel|claw|gallery|ring|halo/;
const SAMPLE_ORI_DEG = [(Math.PI / 2 - 0.765) * (180 / Math.PI), 0, 0];

function metalFinish(c) {
  if (!c) return 'gold';
  const { r, g, b } = c;
  if (Math.abs(r - g) < 0.08 && Math.abs(g - b) < 0.1 && r > 0.55) return 'whiteGold';
  if (r > b && g > b) return g - b > 0.18 ? 'gold' : 'roseGold';
  return 'gold';
}
function classify(info) {
  const m = info.mat;
  const hay = `${m.name} ${info.name}`.toLowerCase();
  for (const kw in GEM_KEYWORDS) if (hay.includes(kw)) return { role: 'gem', gemPreset: GEM_KEYWORDS[kw], finish: 'gold' };
  if (m.transmission > 0.1 || m.opacity < 0.95) return { role: 'gem', gemPreset: 'diamond', finish: 'gold' };
  if (m.metalness > 0.5) return { role: 'metal', gemPreset: 'diamond', finish: metalFinish(m.color) };
  if (METAL_KEYWORDS.test(hay)) return { role: 'metal', gemPreset: 'diamond', finish: metalFinish(m.color) };
  return { role: 'metal', gemPreset: 'diamond', finish: 'gold' };
}

// ── Seed: a mesh's starting material, either from a saved config or auto-detect ──
// Seed shape (matches a tree part): { kind, preset, finish, over, hidden }.
function autoToSeed(a) { return { kind: a.role === 'gem' ? 'gem' : 'metal', preset: a.gemPreset, finish: a.finish, over: {}, hidden: false }; }
function findSlot(name, meshMap) {
  const nl = (name || '').toLowerCase();
  for (const s of meshMap || []) { const key = (s.nameContains ?? '').toLowerCase(); if (!key) continue; if (s.match === 'exact' ? nl === key : nl.includes(key)) return s; }
  return null;
}
// A JewelryViewer meshMap slot (long-name schema) → seed for the tree.
function slotToSeed(slot) {
  if (slot.type === 'ignore') return { kind: 'metal', preset: 'diamond', finish: 'gold', over: {}, hidden: true };
  if (slot.type === 'metal') { const over = {}; if (slot.color) over.color = slot.color; if (slot.roughness != null) over.roughness = slot.roughness; return { kind: 'metal', preset: 'diamond', finish: slot.finish || 'gold', over, hidden: false }; }
  const over = {};
  if (slot.ior != null) over.ior = slot.ior;
  if (slot.color) over.color = slot.color;
  if (slot.aberration != null) over.aber = slot.aberration;
  if (slot.fresnel != null) over.fresnel = slot.fresnel;
  if (slot.facetBlend != null) over.fb = slot.facetBlend;
  if (slot.colorMode != null) over.cm = slot.colorMode;
  if (slot.density != null) over.density = slot.density;
  if (slot.velvet != null) over.velvet = slot.velvet;
  if (slot.opacity != null) over.opacity = slot.opacity;
  const preset = slot.gemPreset === 'marquise' ? 'diamond' : slot.gemPreset || 'diamond';
  return { kind: 'gem', preset, finish: 'gold', over, hidden: false };
}

// ── Tree helpers (ported from the design's DCLogic) ─────────────────────────────
let _uid = 100;
const uid = () => 'f' + ++_uid;
function walkFind(nodes, id) { for (const n of nodes) { if (n.id === id) return n; if (n.children) { const r = walkFind(n.children, id); if (r) return r; } } return null; }
function collectParts(node, acc) { if (node.type === 'part') acc.push(node); else if (node.children) node.children.forEach((c) => collectParts(c, acc)); return acc; }
function prune(nodes, idset, removed) { const out = []; for (const n of nodes) { if (idset.has(n.id)) { removed.push(n); continue; } if (n.children) out.push({ ...n, children: prune(n.children, idset, removed) }); else out.push(n); } return out; }
function insertRel(nodes, targetId, pos, payload) {
  const out = [];
  for (const n of nodes) {
    if (n.id === targetId) {
      if (pos === 'before') { out.push(...payload, n); }
      else if (pos === 'after') { out.push(n, ...payload); }
      else { const kids = n.children ? n.children.slice() : []; out.push({ ...n, type: 'folder', children: [...kids, ...payload] }); }
    } else if (n.children) out.push({ ...n, children: insertRel(n.children, targetId, pos, payload) });
    else out.push(n);
  }
  return out;
}
function isDescendant(node, id) { if (node.id === id) return true; return node.children ? node.children.some((c) => isDescendant(c, id)) : false; }

// Flatten the tree into render rows, honoring expand state.
function flattenRows(nodes, expanded, depth = 0, hiddenAncestor = false, out = []) {
  for (const n of nodes) {
    const hiddenEff = hiddenAncestor || n.hidden;
    out.push({ node: n, depth, hiddenEff });
    if (n.type === 'folder' && expanded[n.id] && n.children) flattenRows(n.children, expanded, depth + 1, hiddenEff, out);
  }
  return out;
}

// Build the initial tree from probed meshes (each carries a `seed` material):
// auto-group meshes with identical material into folders.
function buildTreeFromMeshes(meshes) {
  const groups = new Map();
  for (const m of meshes) {
    const s = m.seed;
    const key = `${m.tris}|${s.kind}|${s.kind === 'gem' ? s.preset : s.finish}|${JSON.stringify(s.over)}|${s.hidden}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(m);
  }
  const nodes = [];
  for (const arr of groups.values()) {
    const s = arr[0].seed;
    const word = (s.kind === 'gem' ? GEM_LABEL[s.preset] : METAL_LABEL[s.finish]) || 'Part';
    const mkPart = (m, i, n) => ({ id: m.name, type: 'part', label: n > 1 ? `${word} ${i + 1}` : (m.name && m.name !== '(unnamed)' ? m.name : word), kind: s.kind, preset: s.preset, finish: s.finish, over: { ...s.over }, hidden: s.hidden, tris: m.tris, meshName: m.name });
    if (arr.length > 1) nodes.push({ id: uid(), type: 'folder', label: word + (word.endsWith('s') ? '' : 's'), hidden: false, children: arr.map((m, i) => mkPart(m, i, arr.length)) });
    else nodes.push(mkPart(arr[0], 0, 1));
  }
  return nodes;
}

// Derive engine assign (meshName → {role, gemPreset|finish, ...over}) from the tree.
function deriveAssign(nodes, hiddenAncestor, out) {
  for (const n of nodes) {
    const hidden = hiddenAncestor || n.hidden;
    if (n.type === 'folder') deriveAssign(n.children || [], hidden, out);
    else if (hidden) out[n.meshName] = { role: 'ignore' };
    else if (n.kind === 'gem') out[n.meshName] = { role: 'gem', gemPreset: n.preset, ...n.over };
    else out[n.meshName] = { role: 'metal', finish: n.finish, ...n.over };
  }
  return out;
}

const r4 = (n) => +Number(n).toFixed(4);
function fmtTris(n) { return n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'k' : String(n); }

// Tree (via derived per-mesh assign) → JewelryViewer config. This is the artifact
// the Studio produces: save it, feed it to <JewelryViewer config={...} />.
// Gem slots also carry geometry-derived size (`lengthMm`/`widthMm`/`depthMm?`/`carat`, from the
// per-mesh `geo` MeshProbe measured) + a `cut` (the human override in `cutByMesh`, else the guess).
function buildConfig(meshes, assign, env, bg, oriDeg, glbUrl, cutByMesh = {}) {
  const orientation = oriDeg.map((d) => (d * Math.PI) / 180);
  const meshMap = meshes.map((m) => {
    const a = assign[m.name] || { role: 'metal', finish: 'gold' };
    if (a.role === 'ignore') return { nameContains: m.name, match: 'exact', type: 'ignore' };
    if (a.role === 'metal') {
      const s = { nameContains: m.name, match: 'exact', type: 'metal', finish: a.finish };
      if (a.color) s.color = a.color.map(r4);
      if (a.roughness != null) s.roughness = r4(a.roughness);
      return s;
    }
    const s = { nameContains: m.name, match: 'exact', type: 'gem', gemPreset: a.gemPreset };
    if (a.ior != null) s.ior = r4(a.ior);
    if (a.color) s.color = a.color.map(r4);
    if (a.aber != null) s.aberration = r4(a.aber);
    if (a.fresnel != null) s.fresnel = r4(a.fresnel);
    if (a.fb != null) s.facetBlend = r4(a.fb);
    if (a.cm != null) s.colorMode = a.cm;
    if (a.density != null) s.density = r4(a.density);
    if (a.velvet != null) s.velvet = r4(a.velvet);
    if (a.opacity != null) s.opacity = r4(a.opacity);
    const geo = m.geo;
    if (geo) {
      if (geo.lengthMm != null) s.lengthMm = geo.lengthMm;
      if (geo.widthMm != null) s.widthMm = geo.widthMm;
      if (geo.depthMm != null) s.depthMm = geo.depthMm;
      if (geo.carat != null) s.carat = geo.carat;
    }
    const cut = cutByMesh[m.name] ?? geo?.cut;
    if (cut) s.cut = cut;
    return s;
  });
  const cfg = { environment: env, background: bg, orientation, meshMap };
  if (glbUrl) cfg.glbUrl = glbUrl;
  return cfg;
}

// ── Load-error boundary ─────────────────────────────────────────────────────────
class LoadBoundary extends Component {
  constructor(props) { super(props); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError?.(); }
  render() { return this.state.failed ? this.props.fallback ?? null : this.props.children; }
}

function readMat(mesh) {
  const m = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
  if (!m) return { name: '', metalness: 0, transmission: 0, opacity: 1, roughness: 1, color: null };
  return { name: m.name || '', metalness: m.metalness ?? 0, transmission: m.transmission ?? 0, opacity: m.opacity ?? 1, roughness: m.roughness ?? 1, color: m.color ? { r: m.color.r, g: m.color.g, b: m.color.b } : null };
}
function MeshProbe({ url, onMeshes }) {
  const { scene } = useGLTF(url);
  useEffect(() => {
    scene.updateMatrixWorld(true);
    // Unit auto-detected once from the whole model, then reused per mesh for gem sizing.
    const unitScaleMm = detectUnitScaleMm(scene);
    const byName = new Map();
    scene.traverse((o) => {
      if (!o.isMesh) return;
      const nm = o.name || '(unnamed)';
      const geo = o.geometry;
      const tris = Math.round((geo?.index ? geo.index.count : geo?.attributes?.position?.count ?? 0) / 3);
      if (!byName.has(nm)) byName.set(nm, { name: nm, tris: 0, mat: readMat(o), geo: null });
      const rec = byName.get(nm);
      rec.tris += tris;
      // Measure every mesh's footprint (size + cut guess); buildConfig uses it for gem slots only.
      // When a name repeats across objects, keep the largest footprint (representative stone).
      const m = measureMesh(o, unitScaleMm);
      if (m && (!rec.geo || m.footprintArea > rec.geo.footprintArea)) rec.geo = m;
    });
    onMeshes([...byName.values()]);
  }, [scene, url, onMeshes]);
  return null;
}

// ── Small UI atoms ──────────────────────────────────────────────────────────────
const mono = { fontFamily: "'Geist Mono', ui-monospace, monospace" };
function Ico({ d, s = 15, w = 1.7 }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round">{(Array.isArray(d) ? d : [d]).map((p, i) => <path key={i} d={p} />)}</svg>;
}
function ShaderSlider({ label, value, min, max, step, onChange, acc }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontSize: 12, color: 'var(--fg2)' }}>{label}</span>
        <span style={{ ...mono, fontSize: 11, color: acc }}>{Number(value).toFixed(step < 0.01 ? 3 : 2)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} style={{ width: '100%', accentColor: acc }} />
    </div>
  );
}

const THEME_CSS = `
.rfk-studio [data-theme=dark], .rfk-studio[data-theme=dark]{ --bg:#08080a; --panel:#0b0b0d; --panel2:#0c0c0e; --input:#141416; --menu:#141417; --line:#1b1b1f; --line2:#26262b; --line3:#3a3a40; --fg:#f4f4f5; --fg2:#c9c9cf; --muted:#8a8a90; --sel-bg:#17171b; }
.rfk-studio[data-theme=light]{ --bg:#f4f2ee; --panel:#ffffff; --panel2:#fbfaf7; --input:#f1efe9; --menu:#ffffff; --line:#ece8e0; --line2:#ded8cd; --line3:#cdc6b8; --fg:#221f1a; --fg2:#4a463e; --muted:#8b8780; --sel-bg:#f1ede5; }
.rfk-studio input[type=range]{ -webkit-appearance:none; appearance:none; background:transparent; cursor:pointer; height:16px; min-width:0; }
.rfk-studio input[type=range]::-webkit-slider-runnable-track{ height:4px; border-radius:3px; background:var(--line2); }
.rfk-studio input[type=range]::-webkit-slider-thumb{ -webkit-appearance:none; width:14px; height:14px; margin-top:-5px; border-radius:50%; background:#fff; box-shadow:0 1px 3px rgba(0,0,0,.5); }
.rfk-studio input[type=color]{ -webkit-appearance:none; appearance:none; border:none; padding:0; background:transparent; cursor:pointer; }
.rfk-studio input[type=color]::-webkit-color-swatch-wrapper{ padding:0; }
.rfk-studio input[type=color]::-webkit-color-swatch{ border:1px solid var(--line2); border-radius:7px; }
.rfk-row:hover{ background:rgba(127,127,127,0.10) !important; }
.rfk-soft:hover{ border-color:var(--line3) !important; color:var(--fg2) !important; }
`;

// Guided-tour steps: each highlights a region of the Studio and explains it in order.
const TOUR = [
  { target: 'parts', title: 'The parts list', body: 'Every mesh in your model, auto-detected as a gem or metal from its name. Identical parts group into a folder — click a row to select that part.' },
  { target: 'stage', title: 'Select in 3D', body: 'Or click a part right in the model. Click more to select several at once; click empty space to clear. Drag to orbit, scroll to zoom.' },
  { target: 'inspector', title: 'Assign a material', body: 'With parts selected, hit Change to pick a gemstone or metal finish — it applies to everything selected. Advanced ▸ fine-tunes and saves custom looks.' },
  { target: 'scene', title: 'Scene & lighting', body: 'Set the environment, background, and rotate the model upright here. Toggle Preview (top) to see it without the editor.' },
  { target: 'save', title: 'Save your work', body: 'When it looks right, Save exports the configuration. Replay this tour anytime with the ? button.' },
];

export default function Studio({ glbUrl = null, initialConfig = null, materials = null, onChange, onSave, onSaveMaterial, onClose, saveLabel = 'Save', sampleUrl = '/models/efd_ring.glb', guideUrl = null, customize = false, onConfigure, onAddToCart, renderContext } = {}) { // eslint-disable-line no-unused-vars
  // `customize` = client "Studio-lite" mode (the <Customizer> surface): same 3-pane shell, but the
  // inspector offers only admin-allowed presets and all authoring chrome is hidden (decisions/0002 v2).
  // Curated baseline merged with any tenant materials the app passed in. Drives the
  // picker, labels, slider defaults, and (threaded down) the viewer + previews.
  const registry = useMemo(() => createRegistry(materials), [materials]);
  const matLabelOf = (kind, preset, finish) => registry.get(kind === 'gem' ? preset : finish)?.label || (kind === 'gem' ? preset : finish) || 'Part';
  const finishWordOf = (kind, finish) => (kind === 'gem' ? 'Brilliant cut' : registry.get(finish)?.finishWord || 'Polished');
  const gemEff = (over, preset) => { const p = registry.get(preset)?.params || {}; const a = over || {}; return { ior: a.ior ?? p.ior ?? 2.42, color: a.color ?? p.color ?? [1, 1, 1], aber: a.aber ?? p.aberration ?? 0.02, fresnel: a.fresnel ?? p.fresnel ?? 0, fb: a.fb ?? p.facetBlend ?? 0, cm: a.cm ?? p.colorMode ?? 0, density: a.density ?? p.density ?? 0, velvet: a.velvet ?? p.velvet ?? 0, opacity: a.opacity ?? p.opacity ?? 0 }; };
  const metalEff = (over, finish) => { const p = registry.get(finish)?.params || {}; const a = over || {}; return { color: a.color ?? p.color ?? [0.85, 0.62, 0.2], roughness: a.roughness ?? p.roughness ?? 0.1 }; };
  // Tree-row / chip swatch: the hand-tuned gradient for the original presets, else a flat
  // chip from the descriptor's swatch (so new baseline + tenant materials show their colour).
  const swatchBg = (kind, preset, finish) => { const id = kind === 'gem' ? preset : finish; const grad = kind === 'gem' ? GEM_GRAD[id] : METAL_GRAD[id]; return grad || `radial-gradient(circle at 38% 30%, ${registry.get(id)?.swatch || '#888'}, #0a0a0c 120%)`; };
  // model
  const [sourceBlob, setSourceBlob] = useState(null);
  const [sourceName, setSourceName] = useState('');
  const [modelUrl, setModelUrl] = useState(null);
  const [meshes, setMeshes] = useState([]);
  // tree state
  const [tree, setTree] = useState([]);
  // Per-gem-mesh cut OVERRIDE ({ [meshName]: 'round'|'square'|'fancy' }). Effective cut =
  // override ?? the MeshProbe geometry guess; persisted onto the gem slot's `cut` in buildConfig.
  const [cutByMesh, setCutByMesh] = useState({});
  const [sel, setSel] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [renaming, setRenaming] = useState(null);
  const [renameVal, setRenameVal] = useState('');
  const [ctx, setCtx] = useState(null); // {x,y}
  const [drag, setDrag] = useState(null); // dragged id
  const [dropTarget, setDropTarget] = useState(null); // {id,pos}
  const [search, setSearch] = useState('');
  // chrome
  const [mode, setMode] = useState('edit');
  const [theme, setTheme] = useState('dark');
  const [accentKey] = useState('violet'); // redesign accent (was 'amber')
  const [inspPage, setInspPage] = useState('props'); // props | advanced | library
  const [scenePop, setScenePop] = useState(false);
  const [arcball, setArcball] = useState(false); // free-rotate (tumble + roll) vs turntable orbit
  const [gemCatOpen, setGemCatOpen] = useState(true);
  const [metalCatOpen, setMetalCatOpen] = useState(true);
  // scene
  const [env, setEnv] = useState('city');
  const [bg, setBg] = useState('#080808');
  const [oriDeg, setOriDeg] = useState([0, 0, 0]);
  const [autoRotate, setAutoRotate] = useState(false);
  const [viewKey, setViewKey] = useState(0);
  const [error, setError] = useState(null);
  const [dragOverFile, setDragOverFile] = useState(false);
  const [copied, setCopied] = useState(false);
  const [bakeTick, setBakeTick] = useState(0); // bumps as gem snapshots finish baking
  const [tourStep, setTourStep] = useState(null); // null = off; 0..N = active guided-tour step
  const tourStartedRef = useRef(false);

  const acc = ACCENTS[accentKey][0];
  const accRgb = ACCENTS[accentKey][1];
  const nextOriRef = useRef([0, 0, 0]);
  const fileInputRef = useRef(null);
  // The saved config to hydrate from when the model's meshes are probed. Held in
  // a ref so the (stable) handleMeshes callback always reads the latest.
  const initialConfigRef = useRef(initialConfig);
  useEffect(() => { initialConfigRef.current = initialConfig; }, [initialConfig]);

  useEffect(() => {
    if (!sourceBlob) return setModelUrl(null);
    const u = URL.createObjectURL(sourceBlob);
    setModelUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [sourceBlob]);

  // Host-driven model: fetch a hosted GLB and load it (efd-admin passes glbUrl +
  // initialConfig to re-open a saved piece for editing).
  useEffect(() => {
    if (!glbUrl) return;
    let alive = true;
    (async () => {
      try { const blob = await (await fetch(glbUrl)).blob(); if (alive) ingestBlob(blob, glbUrl.split('/').pop() || 'model.glb', null); }
      catch { if (alive) setError('Could not load the model.'); }
    })();
    return () => { alive = false; };
  }, [glbUrl]);

  const handleMeshes = useCallback((list) => {
    const cfg = initialConfigRef.current;
    const cuts = {};
    const withSeed = list.map((info) => {
      const slot = cfg && cfg.meshMap ? findSlot(info.name, cfg.meshMap) : null;
      // Re-opening a saved piece: restore its authoritative (possibly human-overridden) cut.
      if (slot && slot.type === 'gem' && slot.cut) cuts[info.name] = slot.cut;
      return { ...info, seed: slot ? slotToSeed(slot) : autoToSeed(classify(info)) };
    });
    setMeshes(withSeed);
    setTree(buildTreeFromMeshes(withSeed));
    setCutByMesh(cuts);
    setSel([]);
    setExpanded({});
    if (cfg) {
      if (cfg.environment) setEnv(cfg.environment);
      if (cfg.background) setBg(cfg.background);
      setOriDeg(Array.isArray(cfg.orientation) ? cfg.orientation.map((r) => (r * 180) / Math.PI) : [0, 0, 0]);
    } else setOriDeg(nextOriRef.current);
    setError(null);
  }, []);

  function ingestBlob(blob, name, ori) { nextOriRef.current = ori ?? [0, 0, 0]; setMeshes([]); setTree([]); setSel([]); setSourceName(name); setSourceBlob(blob); }
  function handleFiles(fileList) {
    const f = [...fileList].find((x) => /\.(glb|gltf)$/i.test(x.name));
    if (!f) return setError('Please choose a .glb or .gltf file.');
    initialConfigRef.current = null; // a freshly-uploaded model auto-classifies
    ingestBlob(f, f.name, [0, 0, 0]);
  }
  async function loadSample() {
    try { initialConfigRef.current = null; ingestBlob(await (await fetch(sampleUrl)).blob(), sampleUrl.split('/').pop() || 'sample.glb', SAMPLE_ORI_DEG); }
    catch { setError('Could not load the sample model.'); }
  }

  // ── derived ──
  const hasModel = !!sourceBlob;
  // Guided tour: auto-start once (per browser) the first time a model loads, so it walks
  // the actual populated panels rather than the empty drop-zone. Replayable via the ? button.
  useEffect(() => {
    if (customize || !hasModel || tourStartedRef.current) return;
    tourStartedRef.current = true;
    let seen = false;
    try { seen = window.localStorage.getItem('refrakt.studioTourSeen') === '1'; } catch { /* no storage */ }
    if (!seen) setTourStep(0);
  }, [hasModel]);
  const endTour = () => { setTourStep(null); try { window.localStorage.setItem('refrakt.studioTourSeen', '1'); } catch { /* no storage */ } };
  const tourTarget = tourStep != null ? TOUR[tourStep].target : null;
  const ring = (t) => (tourTarget === t ? { boxShadow: `0 0 0 2px ${acc}, 0 0 18px 3px rgba(${accRgb},0.5)`, position: 'relative', zIndex: 40 } : null);
  const partCount = useMemo(() => { const acc2 = []; tree.forEach((n) => collectParts(n, acc2)); return acc2.length; }, [tree]);
  const assign = useMemo(() => deriveAssign(tree, false, {}), [tree]);
  const selPartNodes = useMemo(() => { const acc2 = []; for (const id of sel) { const n = walkFind(tree, id); if (n) collectParts(n, acc2); } const seen = new Set(); return acc2.filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true))); }, [sel, tree]);
  const selectedNames = useMemo(() => selPartNodes.map((p) => p.meshName), [selPartNodes]);
  // A representative diamond mesh to pluck from the GLB for the gem-card snapshots.
  const diamondMeshName = useMemo(() => {
    const parts = []; tree.forEach((n) => collectParts(n, parts));
    const pick = parts.find((p) => p.kind === 'gem' && p.preset === 'diamond') || parts.find((p) => p.kind === 'gem') || parts[0];
    return pick ? pick.meshName : null;
  }, [tree]);
  // Cached gem-card snapshot images, keyed by preset (re-reads as the baker finishes each).
  const gemSnaps = useMemo(() => {
    const out = {};
    if (modelUrl && diamondMeshName) for (const g of registry.gems) out[g.id] = GEM_SNAP.get(gemSnapKey(modelUrl, diamondMeshName, g.id));
    return out;
  }, [bakeTick, modelUrl, diamondMeshName, registry]); // eslint-disable-line react-hooks/exhaustive-deps
  const orientationRad = useMemo(() => oriDeg.map((d) => (d * Math.PI) / 180), [oriDeg]);

  // The Studio's output: the JewelryViewer config. Emitted live via onChange so a
  // host (efd-admin) can persist/preview it; saved explicitly via the toolbar.
  const config = useMemo(() => (meshes.length ? buildConfig(meshes, assign, env, bg, oriDeg, glbUrl, cutByMesh) : null), [meshes, assign, env, bg, oriDeg, glbUrl, cutByMesh]);
  useEffect(() => { if (config) onChange?.(config); }, [config]); // eslint-disable-line react-hooks/exhaustive-deps
  // Measured gem size/cut-guess by mesh name (from MeshProbe) — drives the inspector's Cut & size panel.
  const geoByMesh = useMemo(() => { const o = {}; for (const m of meshes) if (m.geo) o[m.name] = m.geo; return o; }, [meshes]);

  // ── customize mode: emit the LIVE RefraktSelection (decisions/0002 v2) ──
  // Fires on EVERY selection change so the host (efd-shop) can re-price against admin's
  // pricing engine. Reduces the live per-mesh `assign` back onto the admin config-in
  // (initialConfig.meshMap w/ `customizable` slots). This surface NEVER prices — it only
  // emits selection. TODO(pricing): efd-shop wires the emitted RefraktSelection to admin's
  // pricing-engine endpoint (gated on that endpoint's design; see decisions/0002 §C).
  useEffect(() => {
    if (!customize || !onConfigure || !initialConfig?.meshMap || !meshes.length) return;
    onConfigure(buildSelectionFromCustomize({ baseConfig: initialConfig, resolved: assign, glbUrl: glbUrl || initialConfig.glbUrl }));
  }, [customize, assign, meshes.length, glbUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  // customize mode: commit the current selection (host adds to cart / opens a custom request).
  const commitSelection = () => {
    if (!onAddToCart || !initialConfig?.meshMap) return;
    onAddToCart(buildSelectionFromCustomize({ baseConfig: initialConfig, resolved: assign, glbUrl: glbUrl || initialConfig.glbUrl }));
  };
  const doSave = () => {
    if (!config) return;
    if (onSave) onSave(config);
    else navigator.clipboard?.writeText(JSON.stringify(config, null, 2)).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  };

  const selNodes = sel.map((id) => walkFind(tree, id)).filter(Boolean);
  const firstPart = selPartNodes[0] || null;

  // ── customize mode: constrain the inspector to the selected part's admin-allowed presets ──
  // The allowed set is the config-in `customizable` block on the matching meshMap slot (0002 v2).
  const custSlot = customize && firstPart && initialConfig?.meshMap ? findSlot(firstPart.meshName, initialConfig.meshMap) : null;
  const custOpts = custSlot && custSlot.customizable ? custSlot.customizable.options : null;
  const allowGems = custOpts ? new Set(custOpts.map((o) => o.gemPreset).filter(Boolean)) : null;
  const allowMetals = custOpts ? new Set(custOpts.map((o) => o.finish).filter(Boolean)) : null;
  const custFixed = customize && !!firstPart && !custOpts; // selected a non-customizable part
  const custGems = customize && allowGems ? registry.gems.filter((g) => allowGems.has(g.id)) : registry.gems;
  const custMetals = customize && allowMetals ? registry.metals.filter((m) => allowMetals.has(m.id)) : registry.metals;
  // In customize, a customizable part goes straight to its preset grid; a fixed part stays on props.
  useEffect(() => { if (customize) setInspPage(firstPart && custOpts ? 'library' : 'props'); }, [customize, firstPart?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const hasSel = sel.length > 0;
  const single = selNodes.length === 1 ? selNodes[0] : null;
  const selTitle = single ? single.label : hasSel ? `${selPartNodes.length} parts` : '';
  const selSub = firstPart ? `${selPartNodes.length} part${selPartNodes.length === 1 ? '' : 's'} · ${matLabelOf(firstPart.kind, firstPart.preset, firstPart.finish)}` : '';

  // ── tree mutations ──
  const mutate = (fn) => setTree((t) => fn(t));
  const mapParts = (ids, fn) => { const idset = new Set(ids); const upd = (nodes) => nodes.map((n) => (n.type === 'part' ? (idset.has(n.id) ? fn(n) : n) : n.children ? { ...n, children: upd(n.children) } : n)); mutate(upd); };
  const updateNode = (id, fn) => { const upd = (nodes) => nodes.map((n) => (n.id === id ? fn(n) : n.children ? { ...n, children: upd(n.children) } : n)); mutate(upd); };

  const selectNode = (id, e) => {
    const add = e && (e.metaKey || e.ctrlKey || e.shiftKey);
    setSel((s) => (add ? (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]) : [id]));
    setInspPage('props'); setRenaming(null); setCtx(null);
  };
  const clearSel = useCallback(() => { setSel([]); setCtx(null); setScenePop(false); setRenaming(null); }, []);
  // Viewer click toggles the part in/out of the selection so you can build up a
  // multi-selection by clicking several stones (click empty space to clear all).
  const pick3D = useCallback((meshName) => { setSel((s) => (s.includes(meshName) ? s.filter((x) => x !== meshName) : [...s, meshName])); setInspPage('props'); }, []);
  const toggleExpand = (id, e) => { if (e) e.stopPropagation(); setExpanded((x) => ({ ...x, [id]: !x[id] })); };

  // Assign from the library — stay on the library page so the live hero preview
  // updates and you can try several materials before going Back.
  const assignGem = (preset) => mapParts(selPartNodes.map((p) => p.id), (p) => ({ ...p, kind: 'gem', preset, over: {} }));
  const assignMetal = (finish) => mapParts(selPartNodes.map((p) => p.id), (p) => ({ ...p, kind: 'metal', finish, over: {} }));
  const setOver = (k, v) => mapParts(selPartNodes.map((p) => p.id), (p) => ({ ...p, over: { ...p.over, [k]: v } }));
  const resetShader = () => mapParts(selPartNodes.map((p) => p.id), (p) => ({ ...p, over: {} }));
  // Override the cut for every selected GEM part (persists into each slot's `cut`; see buildConfig).
  const setCut = (cut) => setCutByMesh((prev) => { const next = { ...prev }; for (const p of selPartNodes) if (p.kind === 'gem') next[p.meshName] = cut; return next; });

  // Save the selected part's current (tuned) look as a reusable material descriptor.
  // The package only EMITS it via onSaveMaterial — the host app persists it to its DB and
  // passes it back in via the `materials` prop, where it rejoins the picker.
  const saveAsMaterial = () => {
    if (!firstPart || !onSaveMaterial) return;
    const label = (typeof window !== 'undefined' && window.prompt('Name this material', matLabelOf(firstPart.kind, firstPart.preset, firstPart.finish) + ' (custom)')) || '';
    if (!label.trim()) return;
    const id = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'material-' + registry.all.length;
    let descriptor;
    if (firstPart.kind === 'gem') {
      const g = gemEff(firstPart.over, firstPart.preset);
      const base = registry.get(firstPart.preset)?.params || {};
      descriptor = { id, kind: 'gem', label: label.trim(), params: { ior: g.ior, color: g.color, aberration: g.aber, fresnel: g.fresnel, facetBlend: g.fb, colorMode: g.cm, density: g.density, velvet: g.velvet, opacity: g.opacity, bvhOffset: base.bvhOffset ?? 0.001 } };
    } else {
      const m = metalEff(firstPart.over, firstPart.finish);
      const base = registry.get(firstPart.finish)?.params || {};
      descriptor = { id, kind: 'metal', label: label.trim(), params: { color: m.color, roughness: m.roughness, metalness: base.metalness ?? 1, envMapIntensity: base.envMapIntensity ?? 1.6 } };
    }
    onSaveMaterial(descriptor);
  };

  const onHideSel = () => { const ids = sel; const allHidden = ids.length > 0 && ids.every((id) => walkFind(tree, id)?.hidden); const set = new Set(ids); const upd = (nodes) => nodes.map((n) => (set.has(n.id) ? { ...n, hidden: !allHidden } : n.children ? { ...n, children: upd(n.children) } : n)); mutate(upd); };
  const toggleHideNode = (id, e) => { if (e) e.stopPropagation(); updateNode(id, (n) => ({ ...n, hidden: !n.hidden })); };

  const groupSelection = () => {
    const ids = sel.slice(); if (!ids.length) return;
    setTree((t) => { const removed = []; const pruned = prune(t, new Set(ids), removed); const by = {}; removed.forEach((n) => (by[n.id] = n)); const payload = ids.map((id) => by[id]).filter(Boolean); if (!payload.length) return t; const fid = uid(); setSel([fid]); setExpanded((x) => ({ ...x, [fid]: true })); setRenaming(fid); setRenameVal('New Group'); return [{ id: fid, type: 'folder', label: 'New Group', hidden: false, children: payload }, ...pruned]; });
    setCtx(null);
  };
  const newFolder = () => { const fid = uid(); setTree((t) => [{ id: fid, type: 'folder', label: 'New Group', hidden: false, children: [] }, ...t]); setSel([fid]); setExpanded((x) => ({ ...x, [fid]: true })); setRenaming(fid); setRenameVal('New Group'); setCtx(null); };
  const ungroup = (fid) => setTree((t) => { const f = walkFind(t, fid); if (!f || f.type !== 'folder') return t; const removed = []; const pruned = prune(t, new Set([fid]), removed); return [...(f.children || []), ...pruned]; });

  const startRename = (id) => { const n = walkFind(tree, id); if (!n) return; setRenaming(id); setRenameVal(n.label); setCtx(null); };
  const commitRename = () => { if (renaming) updateNode(renaming, (n) => ({ ...n, label: renameVal || n.label })); setRenaming(null); };

  // ── drag & drop ──
  const onRowDragStart = (id, e) => { e.stopPropagation(); setDrag(id); };
  const onRowDragOver = (id, e) => {
    e.preventDefault(); e.stopPropagation();
    if (!drag || drag === id) return;
    const dragged = walkFind(tree, drag);
    if (dragged && isDescendant(dragged, id)) return; // can't drop into own subtree
    const node = walkFind(tree, id);
    const r = e.currentTarget.getBoundingClientRect();
    const rel = (e.clientY - r.top) / r.height;
    let pos = 'before';
    if (node?.type === 'folder') pos = rel < 0.28 ? 'before' : rel > 0.72 ? 'after' : 'inside';
    else pos = rel < 0.5 ? 'before' : 'after';
    setDropTarget({ id, pos });
  };
  const onRowDrop = (id, e) => {
    e.preventDefault(); e.stopPropagation();
    const dt = dropTarget; setDropTarget(null);
    if (!drag || !dt) { setDrag(null); return; }
    const moveIds = sel.includes(drag) ? sel.slice() : [drag];
    setTree((t) => { const removed = []; const pruned = prune(t, new Set(moveIds), removed); const by = {}; removed.forEach((n) => (by[n.id] = n)); const payload = moveIds.map((mid) => by[mid]).filter(Boolean); if (!payload.length) return t; if (walkFind(pruned, dt.id) == null && dt.pos !== 'inside') return [...pruned, ...payload]; return insertRel(pruned, dt.id, dt.pos, payload); });
    setDrag(null);
  };
  const onRootDrop = (e) => { e.preventDefault(); if (!drag) return; const dt = dropTarget; setDropTarget(null); if (dt) return; const moveIds = sel.includes(drag) ? sel.slice() : [drag]; setTree((t) => { const removed = []; const pruned = prune(t, new Set(moveIds), removed); const by = {}; removed.forEach((n) => (by[n.id] = n)); const payload = moveIds.map((mid) => by[mid]).filter(Boolean); return [...pruned, ...payload]; }); setDrag(null); };

  const rows = useMemo(() => {
    if (!search.trim()) return flattenRows(tree, expanded);
    const q = search.toLowerCase();
    const allOpen = {};
    const mark = (ns) => ns.forEach((n) => { if (n.type === 'folder') { allOpen[n.id] = true; mark(n.children || []); } });
    mark(tree);
    return flattenRows(tree, allOpen).filter((r) => r.node.label.toLowerCase().includes(q));
  }, [tree, expanded, search]);

  // advanced shader effective values
  const advGem = firstPart && firstPart.kind === 'gem' ? gemEff(firstPart.over, firstPart.preset) : null;
  const advMetal = firstPart && firstPart.kind === 'metal' ? metalEff(firstPart.over, firstPart.finish) : null;
  // Gem size/cut for the inspector panel: measured spec + effective cut (override ?? guess).
  const firstGeo = firstPart && firstPart.kind === 'gem' ? geoByMesh[firstPart.meshName] : null;
  const effCut = firstPart && firstPart.kind === 'gem' ? (cutByMesh[firstPart.meshName] ?? firstGeo?.cut ?? null) : null;

  const themeDark = theme === 'dark';

  // ── No model: drop zone (customize mode never uploads — show an inline loading state) ──
  if (!hasModel) {
    if (customize) {
      return (
        <div className="rfk-studio" data-theme={theme} style={{ position: 'relative', width: '100%', height: '100%', minHeight: 560, borderRadius: 16, '--accent': acc, background: 'var(--bg)', color: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Geist', system-ui, sans-serif" }}>
          <style dangerouslySetInnerHTML={{ __html: THEME_CSS }} />
          <span style={{ ...mono, fontSize: 13, color: error ? '#f87171' : 'var(--muted)' }}>{error || 'Loading…'}</span>
        </div>
      );
    }
    return (
      <div className="rfk-studio" data-theme={theme} style={{ position: 'fixed', inset: 0, zIndex: 1300, '--accent': acc, background: 'var(--bg)', color: 'var(--fg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Geist', system-ui, sans-serif" }}>
        <style dangerouslySetInnerHTML={{ __html: THEME_CSS }} />
        <div onDragOver={(e) => { e.preventDefault(); setDragOverFile(true); }} onDragLeave={() => setDragOverFile(false)} onDrop={(e) => { e.preventDefault(); setDragOverFile(false); handleFiles(e.dataTransfer.files); }} onClick={() => fileInputRef.current?.click()}
          style={{ width: 'min(92%,460px)', textAlign: 'center', padding: '64px 28px', borderRadius: 16, border: '1px dashed ' + (dragOverFile ? acc : 'var(--line2)'), background: dragOverFile ? `rgba(${accRgb},0.05)` : 'var(--panel)', cursor: 'pointer' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>💎</div>
          <p style={{ fontSize: 17, margin: '0 0 6px' }}>Drop a .glb / .gltf file here</p>
          <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>or click to browse</p>
          <div style={{ marginTop: 24 }}>
            <button onClick={(e) => { e.stopPropagation(); loadSample(); }} style={{ padding: '10px 20px', background: acc, color: '#0a0a0c', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Try the sample ring →</button>
          </div>
          {error && <p style={{ color: '#f87171', fontSize: 13, marginTop: 18 }}>{error}</p>}
          {guideUrl && (
            <div style={{ marginTop: 20 }}>
              <a href={guideUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ fontSize: 13, color: 'var(--muted)', borderBottom: '1px solid var(--line2)', paddingBottom: 2, cursor: 'pointer' }}>New here? Read the guide — how to prep a model →</a>
            </div>
          )}
          <input ref={fileInputRef} type="file" accept=".glb,.gltf" style={{ display: 'none' }} onChange={(e) => handleFiles(e.target.files)} />
        </div>
      </div>
    );
  }

  const viewer = modelUrl && meshes.length > 0 ? (
    <LoadBoundary key={modelUrl + '|' + viewKey} fallback={<div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f87171', fontSize: 13 }}>Failed to render this model.</div>} onError={() => setError('Could not read that GLB.')}>
      <StudioViewer glbUrl={modelUrl} assign={assign} selectedNames={selectedNames} onPick={pick3D} onClear={clearSel} orientation={orientationRad} environment={env} background={bg} autoRotate={autoRotate} arcball={arcball} registry={registry} />
    </LoadBoundary>
  ) : (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 13 }}>Reading model…</div>
  );

  const stageBg = 'radial-gradient(110% 95% at 50% 42%, #131318 0%, #08080a 72%)';

  return (
    <div className="rfk-studio" data-theme={theme} style={{ ...(customize ? { position: 'relative', width: '100%', height: '100%', minHeight: 560, borderRadius: 16 } : { position: 'fixed', inset: 0, zIndex: 1300 }), '--accent': acc, display: 'flex', flexDirection: 'column', background: 'var(--bg)', color: 'var(--fg)', fontFamily: "'Geist', system-ui, sans-serif", overflow: 'hidden' }}>
      <style dangerouslySetInnerHTML={{ __html: THEME_CSS }} />
      {!customize && <input ref={fileInputRef} type="file" accept=".glb,.gltf" style={{ display: 'none' }} onChange={(e) => handleFiles(e.target.files)} />}

      {/* Mesh probe — mounted once per model (NOT inside the swappable viewer), so
          toggling Edit/Preview never remounts it and wipes the tree's edits. */}
      {modelUrl && (
        <LoadBoundary key={'probe|' + modelUrl} onError={() => setError('Could not read that GLB — it may use DRACO/meshopt compression.')}>
          <Suspense fallback={null}><MeshProbe url={modelUrl} onMeshes={handleMeshes} /></Suspense>
        </LoadBoundary>
      )}

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 50, flexShrink: 0, padding: '0 14px', borderBottom: '1px solid var(--line)', background: 'var(--panel2)', zIndex: 30 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
          {onClose && (
            <button className="rfk-soft" onClick={onClose} title="Close" style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 7, border: '1px solid var(--line2)', background: 'transparent', color: 'var(--fg2)', cursor: 'pointer', flexShrink: 0 }}>
              <Ico s={16} w={1.8} d="M18 6 6 18M6 6l12 12" />
            </button>
          )}
          <span style={{ ...mono, fontSize: 10.5, letterSpacing: '.24em', background: 'linear-gradient(100deg,#b79bff,#66b8ff,#ffd27a)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>STUDIO</span>
          <span style={{ width: 1, height: 15, background: 'var(--line2)' }} />
          <span style={{ ...mono, fontSize: 12, color: 'var(--fg2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 220 }}>{sourceName}</span>
          <span style={{ ...mono, fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap' }}>· {partCount} parts</span>
          {!customize && <button className="rfk-soft" onClick={() => fileInputRef.current?.click()} style={{ fontSize: 12, color: 'var(--muted)', background: 'transparent', border: '1px solid var(--line2)', borderRadius: 7, padding: '5px 11px', cursor: 'pointer', whiteSpace: 'nowrap' }}>Replace</button>}
        </div>
        <div style={{ display: 'flex', background: 'var(--input)', border: '1px solid var(--line2)', borderRadius: 9, padding: 3 }}>
          {['edit', 'preview'].map((m) => (
            <button key={m} onClick={() => { setMode(m); setScenePop(false); }} style={{ fontSize: 12.5, border: 'none', borderRadius: 6, padding: '5px 16px', cursor: 'pointer', textTransform: 'capitalize', background: mode === m ? acc : 'transparent', color: mode === m ? '#1a1408' : 'var(--muted)' }}>{m}</button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {!customize && <button onClick={doSave} title="Save" style={{ fontSize: 12.5, fontWeight: 600, color: '#0a0a0c', background: acc, border: 'none', borderRadius: 7, padding: '6px 14px', cursor: 'pointer', whiteSpace: 'nowrap', ...ring('save') }}>{copied ? 'Copied!' : saveLabel}</button>}
          {!customize && <button className="rfk-soft" onClick={() => { setMode('edit'); setTourStep(0); }} title="Guided tour" style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 7, border: '1px solid var(--line2)', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontSize: 15, fontWeight: 700 }}>?</button>}
          <button className="rfk-soft" onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))} title="Toggle light / dark" style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 7, border: '1px solid var(--line2)', background: 'transparent', color: 'var(--muted)', cursor: 'pointer' }}>
            {themeDark ? <Ico d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" /> : <Ico d={['M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19']} />}
          </button>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399' }} />
          <span style={{ ...mono, fontSize: 11, color: 'var(--muted)' }}>live</span>
        </div>
      </div>

      {mode === 'preview' ? (
        <div style={{ flex: 1, position: 'relative', minWidth: 0, background: stageBg }}>
          {viewer}
          <div style={{ position: 'absolute', left: '50%', bottom: 16, transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 4, padding: 6, borderRadius: 12, background: 'rgba(12,12,15,.85)', backdropFilter: 'blur(10px)', border: '1px solid var(--line2)' }}>
            <button onClick={() => setAutoRotate((v) => !v)} style={{ display: 'flex', alignItems: 'center', gap: 7, border: 'none', background: autoRotate ? acc : 'transparent', borderRadius: 7, padding: '6px 11px', cursor: 'pointer', color: autoRotate ? '#1a1408' : 'var(--fg2)', fontSize: 12 }}><Ico s={14} d={['M21 12a9 9 0 1 1-3-6.7', 'M21 3v5h-5']} />Turntable</button>
              <button onClick={() => setArcball((v) => !v)} title="Free rotate — tumble & roll to any angle" style={{ display: 'flex', alignItems: 'center', gap: 7, border: 'none', background: arcball ? acc : 'transparent', borderRadius: 7, padding: '6px 11px', cursor: 'pointer', color: arcball ? '#1a1408' : 'var(--fg2)', fontSize: 12 }}><span style={{ fontSize: 14, lineHeight: 1 }}>⟲</span>Free rotate</button>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>
          {/* LEFT RAIL */}
          <div style={{ width: 264, flexShrink: 0, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--line)', background: 'var(--panel)', minHeight: 0, ...ring('parts') }}>
            <div style={{ padding: '14px 14px 10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--input)', border: '1px solid var(--line2)', borderRadius: 8, padding: '8px 10px' }}>
                <Ico s={14} w={1.8} d={['M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14', 'm20 20-3.5-3.5']} />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search parts…" style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none', fontSize: 12.5, color: 'var(--fg)', fontFamily: 'inherit' }} />
              </div>
            </div>
            <div style={{ padding: '0 14px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ ...mono, fontSize: 10, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--muted)' }}>Parts · {partCount}</span>
              {!customize && (
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="rfk-soft" onClick={groupSelection} title="Group selection into a folder" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10.5, color: sel.length > 1 ? 'var(--fg2)' : 'var(--muted)', background: 'transparent', border: '1px solid var(--line2)', borderRadius: 6, padding: '3px 8px', cursor: 'pointer' }}><Ico s={12} d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />Group</button>
                  <button className="rfk-soft" onClick={newFolder} title="New empty folder" style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', background: 'transparent', border: '1px solid var(--line2)', borderRadius: 6, cursor: 'pointer' }}><Ico s={13} d={['M12 5v14', 'M5 12h14']} /></button>
                </div>
              )}
            </div>
            <div onDragOver={(e) => e.preventDefault()} onDrop={onRootDrop} style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '0 10px 16px', display: 'flex', flexDirection: 'column', gap: 2 }}>
              {rows.map(({ node, depth, hiddenEff }) => {
                const selectedRow = sel.includes(node.id);
                const isDropT = dropTarget && dropTarget.id === node.id;
                return (
                  <div key={node.id} className="rfk-row" draggable onClick={(e) => selectNode(node.id, e)} onContextMenu={(e) => { e.preventDefault(); setSel((s) => (s.includes(node.id) ? s : [node.id])); setCtx({ x: e.clientX, y: e.clientY }); }}
                    onDragStart={(e) => onRowDragStart(node.id, e)} onDragOver={(e) => onRowDragOver(node.id, e)} onDrop={(e) => onRowDrop(node.id, e)} onDragEnd={() => { setDrag(null); setDropTarget(null); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px', marginLeft: depth * 16, borderRadius: 9, cursor: 'pointer', opacity: hiddenEff ? 0.45 : 1, background: selectedRow ? `rgba(${accRgb},0.14)` : 'transparent', boxShadow: selectedRow ? `inset 0 0 0 1px rgba(${accRgb},0.5)` : 'none', borderTop: '2px solid ' + (isDropT && dropTarget.pos === 'before' ? acc : 'transparent'), borderBottom: '2px solid ' + (isDropT && dropTarget.pos === 'after' ? acc : 'transparent'), outline: isDropT && dropTarget.pos === 'inside' ? `1px solid ${acc}` : 'none' }}>
                    {node.type === 'folder' ? (
                      <>
                        <span onClick={(e) => toggleExpand(node.id, e)} style={{ ...mono, width: 14, flexShrink: 0, textAlign: 'center', color: 'var(--muted)', fontSize: 10 }}>{expanded[node.id] ? '▾' : '▸'}</span>
                        <span style={{ width: 24, height: 24, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a78bfa' }}><Ico s={17} w={1.5} d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" /></span>
                      </>
                    ) : (
                      <>
                        <span style={{ width: 14, flexShrink: 0 }} />
                        <span style={{ width: 24, height: 24, borderRadius: 7, flexShrink: 0, background: swatchBg(node.kind, node.preset, node.finish), boxShadow: 'inset -2px -2px 4px rgba(0,0,0,.4),inset 1px 1px 2px rgba(255,255,255,.35)' }} />
                      </>
                    )}
                    <span style={{ flex: 1, minWidth: 0 }}>
                      {renaming === node.id ? (
                        <input autoFocus value={renameVal} onChange={(e) => setRenameVal(e.target.value)} onClick={(e) => e.stopPropagation()} onBlur={commitRename} onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setRenaming(null); }} style={{ width: '100%', background: 'var(--input)', border: '1px solid var(--line3)', borderRadius: 5, color: 'var(--fg)', fontSize: 12.5, padding: '2px 6px', outline: 'none', fontFamily: 'inherit' }} />
                      ) : (
                        <>
                          <span style={{ display: 'block', fontSize: 12.5, color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{node.label}</span>
                          <span style={{ ...mono, display: 'block', fontSize: 9, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{node.type === 'folder' ? `${(collectParts(node, [])).length} parts` : `${matLabelOf(node.kind, node.preset, node.finish)} · ${fmtTris(node.tris)} tris`}</span>
                        </>
                      )}
                    </span>
                    <span onClick={(e) => toggleHideNode(node.id, e)} title="Show / hide" style={{ width: 24, height: 24, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, color: node.hidden ? acc : 'var(--muted)' }}>
                      {node.hidden ? <Ico s={14} w={1.6} d="M9.9 4.5A9.6 9.6 0 0 1 12 4.3c5.5 0 9.5 5.4 9.5 7.7a11 11 0 0 1-2 3.2M6 6.4C3.4 8 1.5 10.6 1.5 12c0 2.3 4 7.7 10.5 7.7 1.4 0 2.7-.3 3.9-.7M2 2l20 20" /> : <Ico s={14} w={1.6} d={['M1.5 12S5.5 4.3 12 4.3 22.5 12 22.5 12 18.5 19.7 12 19.7 1.5 12 1.5 12Z', 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6']} />}
                    </span>
                  </div>
                );
              })}
              <div style={{ flex: 1, minHeight: 24 }} />
            </div>
          </div>

          {/* CENTER STAGE — clearing empty space is handled inside StudioViewer
              (onPointerMissed → onClear); a wrapper onClick here would fire on
              model clicks too and wipe the selection the viewer just made. */}
          <div style={{ flex: 1, position: 'relative', minWidth: 0, background: stageBg, ...ring('stage') }}>
            {viewer}
            {hasSel && firstPart && (
              <div style={{ position: 'absolute', left: 16, top: 14, display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderRadius: 30, background: 'rgba(12,12,15,.82)', backdropFilter: 'blur(8px)', border: `1px solid rgba(${accRgb},0.4)`, zIndex: 6 }}>
                <span style={{ width: 16, height: 16, borderRadius: '50%', background: swatchBg(firstPart.kind, firstPart.preset, firstPart.finish), boxShadow: 'inset -1px -1px 2px rgba(0,0,0,.4)' }} />
                <span style={{ fontSize: 12.5, color: 'var(--fg)' }}>{selTitle}</span>
                <span style={{ ...mono, fontSize: 10.5, color: 'var(--muted)' }}>{matLabelOf(firstPart.kind, firstPart.preset, firstPart.finish)}</span>
              </div>
            )}
            {/* bottom control bar */}
            <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', left: '50%', bottom: 16, transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 4, padding: 6, borderRadius: 12, background: 'rgba(12,12,15,.85)', backdropFilter: 'blur(10px)', border: '1px solid var(--line2)', zIndex: 6 }}>
              <button onClick={() => setViewKey((k) => k + 1)} title="Reset view" style={{ width: 30, height: 30, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}><Ico s={15} w={1.6} d={['M21 12a9 9 0 1 1-3-6.7', 'M21 3v5h-5']} /></button>
              <span style={{ width: 1, height: 18, background: 'var(--line2)', margin: '0 3px' }} />
              <button onClick={() => setAutoRotate((v) => !v)} style={{ display: 'flex', alignItems: 'center', gap: 7, border: 'none', background: autoRotate ? acc : 'transparent', borderRadius: 7, padding: '6px 11px', cursor: 'pointer', color: autoRotate ? '#1a1408' : 'var(--fg2)', fontSize: 12 }}><Ico s={14} d={['M21 12a9 9 0 1 1-3-6.7', 'M21 3v5h-5']} />Turntable</button>
              <button onClick={() => setArcball((v) => !v)} title="Free rotate — tumble & roll to any angle" style={{ display: 'flex', alignItems: 'center', gap: 7, border: 'none', background: arcball ? acc : 'transparent', borderRadius: 7, padding: '6px 11px', cursor: 'pointer', color: arcball ? '#1a1408' : 'var(--fg2)', fontSize: 12 }}><span style={{ fontSize: 14, lineHeight: 1 }}>⟲</span>Free rotate</button>
              <span style={{ width: 1, height: 18, background: 'var(--line2)', margin: '0 3px' }} />
              {!customize && <button onClick={() => setScenePop((v) => !v)} style={{ display: 'flex', alignItems: 'center', gap: 7, border: 'none', background: scenePop ? acc : 'transparent', borderRadius: 7, padding: '6px 11px', cursor: 'pointer', color: scenePop ? '#1a1408' : 'var(--fg2)', fontSize: 12, ...ring('scene') }}><Ico s={14} d={['M4 6h9M17 6h3M4 12h3M11 12h9M4 18h7M15 18h5']} />Scene</button>}
            </div>
            {scenePop && (
              <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', right: 16, bottom: 64, width: 256, padding: 15, borderRadius: 13, background: 'rgba(13,13,17,.94)', backdropFilter: 'blur(14px)', border: '1px solid var(--line2)', boxShadow: '0 18px 44px rgba(0,0,0,.55)', zIndex: 8 }}>
                <div style={{ ...mono, fontSize: 10, letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 13 }}>Scene &amp; lighting</div>
                <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                  <label style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ ...mono, fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Environment</span>
                    <select value={env} onChange={(e) => setEnv(e.target.value)} style={{ appearance: 'none', WebkitAppearance: 'none', width: '100%', background: 'var(--input)', color: 'var(--fg)', border: '1px solid var(--line2)', borderRadius: 8, padding: '8px 10px', fontSize: 12.5, fontFamily: 'inherit' }}>
                      {ENVS.map((e) => <option key={e} value={e}>{e}</option>)}
                    </select>
                  </label>
                  <label>
                    <span style={{ ...mono, fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--muted)', display: 'block', marginBottom: 6 }}>BG</span>
                    <input type="color" value={bg} onChange={(e) => setBg(e.target.value)} style={{ width: 40, height: 34 }} />
                  </label>
                </div>
                <span style={{ ...mono, fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--muted)', display: 'block', marginBottom: 8 }}>Orientation</span>
                {['X', 'Y', 'Z'].map((axis, ai) => (
                  <div key={axis} style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6 }}>
                    <span style={{ ...mono, fontSize: 11, color: 'var(--muted)', width: 12 }}>{axis}</span>
                    <input type="range" min={-180} max={180} step={1} value={Math.round(oriDeg[ai])} onChange={(e) => setOriDeg((p) => p.map((v, idx) => (idx === ai ? Number(e.target.value) : v)))} style={{ flex: 1, accentColor: acc }} />
                    <span style={{ ...mono, fontSize: 11, color: 'var(--fg2)', width: 38, textAlign: 'right' }}>{Math.round(oriDeg[ai])}°</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT INSPECTOR */}
          <div style={{ width: 320, flexShrink: 0, borderLeft: '1px solid var(--line)', background: 'var(--panel)', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', ...ring('inspector') }}>
            {!hasSel ? (
              <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden' }}>
                {customize ? (
                  <div style={{ padding: '20px 16px' }}>
                    <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 19, lineHeight: 1.1, color: 'var(--fg)' }}>Customize</div>
                    <div style={{ marginTop: 12, fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>Click a part on the model — or in the list — to see its options, then pick a stone or metal to change it. ⌘/Ctrl-click to select several at once.</div>
                    {onAddToCart && (
                      <button onClick={commitSelection} style={{ marginTop: 18, width: '100%', border: 'none', borderRadius: 9, padding: '11px 0', cursor: 'pointer', background: acc, color: '#0a0a0c', fontSize: 13.5, fontWeight: 600 }}>Add to configuration</button>
                    )}
                  </div>
                ) : (
                  <>
                    <div style={{ padding: '15px 16px 14px', borderBottom: '1px solid var(--line)' }}>
                      <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 19, lineHeight: 1.1, color: 'var(--fg)' }}>Orientation</div>
                      <div style={{ ...mono, fontSize: 10, color: 'var(--muted)', marginTop: 3 }}>whole model · no part selected</div>
                    </div>
                    <div style={{ padding: '18px 16px' }}>
                      {['X', 'Y', 'Z'].map((axis, ai) => (
                        <div key={axis} style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 11 }}>
                          <span style={{ width: 54, flexShrink: 0, fontSize: 12, color: 'var(--fg2)' }}>Rotate {axis}</span>
                          <input type="range" min={-180} max={180} step={1} value={Math.round(oriDeg[ai])} onChange={(e) => setOriDeg((p) => p.map((v, idx) => (idx === ai ? Number(e.target.value) : v)))} style={{ flex: 1, accentColor: acc }} />
                          <span style={{ ...mono, fontSize: 12, color: 'var(--fg2)', minWidth: 42, textAlign: 'center', border: '1px solid var(--line2)', borderRadius: 7, padding: '5px 0' }}>{Math.round(oriDeg[ai])}°</span>
                        </div>
                      ))}
                      <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--line)', fontSize: 12, color: 'var(--muted)', lineHeight: 1.55 }}>Select a part in the model or list to edit its material. ⌘/Ctrl-click to multi-select, then right-click to group.</div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', minHeight: 0 }}>
                  {inspPage === 'library' ? (
                    <div style={{ padding: '14px 16px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                        <button className="rfk-soft" onClick={() => (customize ? clearSel() : setInspPage('props'))} title="Back" style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 7, border: '1px solid var(--line2)', background: 'transparent', color: 'var(--fg2)', cursor: 'pointer' }}><Ico s={15} w={1.8} d="M15 18l-6-6 6-6" /></button>
                        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)' }}>{customize ? 'Choose an option' : 'Change Material'}</span>
                      </div>
                      {/* One offscreen renderer bakes each gem to a cached image — no live canvas per card. */}
                      <GemBaker glbUrl={modelUrl} meshName={diamondMeshName} presets={registry.gems.map((g) => g.id)} registry={registry} onBaked={() => setBakeTick((t) => t + 1)} />
                      {(!customize || custGems.length > 0) && (
                        <>
                          <CatHeader label="Gemstone" open={gemCatOpen} onClick={() => setGemCatOpen((v) => !v)} />
                          {gemCatOpen && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 8 }}>
                              {custGems.map((g) => {
                                const cur = firstPart && firstPart.kind === 'gem' && firstPart.preset === g.id;
                                return <MatCard key={g.id} kind="gem" variant={g.id} label={g.label} finishWord={g.finishWord} active={cur} acc={acc} registry={registry} snapshot={gemSnaps[g.id]} onClick={() => assignGem(g.id)} />;
                              })}
                            </div>
                          )}
                        </>
                      )}
                      {(!customize || custMetals.length > 0) && (
                        <>
                          <CatHeader label="Metal" open={metalCatOpen} onClick={() => setMetalCatOpen((v) => !v)} />
                          {metalCatOpen && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                              {custMetals.map((m) => {
                                const cur = firstPart && firstPart.kind === 'metal' && firstPart.finish === m.id;
                                return <MatCard key={m.id} kind="metal" variant={m.id} label={m.label} finishWord={m.finishWord} active={cur} acc={acc} registry={registry} onClick={() => assignMetal(m.id)} />;
                              })}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ) : inspPage === 'advanced' ? (
                    <>
                      <div style={{ padding: '14px 16px 4px', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <button className="rfk-soft" onClick={() => setInspPage('props')} title="Back" style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 7, border: '1px solid var(--line2)', background: 'transparent', color: 'var(--fg2)', cursor: 'pointer' }}><Ico s={15} w={1.8} d="M15 18l-6-6 6-6" /></button>
                        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)' }}>Advanced shader</span>
                      </div>
                      <div style={{ padding: '8px 16px 18px' }}>
                        {firstPart && firstPart.kind === 'gem' && advGem && (
                          <div style={{ marginTop: 14 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                              <span style={{ ...mono, fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>Gem shader</span>
                              <div style={{ display: 'flex', gap: 12 }}>
                                {onSaveMaterial && <button onClick={saveAsMaterial} style={{ fontSize: 11, color: 'var(--fg2)', background: 'transparent', border: 'none', cursor: 'pointer' }}>Save as material</button>}
                                <button onClick={resetShader} style={{ fontSize: 11, color: acc, background: 'transparent', border: 'none', cursor: 'pointer' }}>Reset</button>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 11 }}>
                              <span style={{ fontSize: 11, color: 'var(--muted)' }}>Tint</span>
                              <input type="color" value={rgbToHex(advGem.color)} onChange={(e) => setOver('color', hexToRgb(e.target.value))} style={{ width: 30, height: 26 }} />
                              <div style={{ marginLeft: 'auto', display: 'flex', gap: 5 }}>
                                {[['Direct', 0], ['Glow', 1]].map(([lbl, v]) => { const on = Math.round(advGem.cm) === v; return <button key={v} onClick={() => setOver('cm', v)} style={{ fontSize: 11, borderRadius: 6, padding: '4px 11px', cursor: 'pointer', border: '1px solid ' + (on ? acc : 'var(--line2)'), background: on ? `rgba(${accRgb},0.14)` : 'transparent', color: on ? acc : 'var(--muted)' }}>{lbl}</button>; })}
                              </div>
                            </div>
                            <ShaderSlider label="Depth / saturation" value={advGem.density} min={0} max={6} step={0.1} onChange={(v) => setOver('density', v)} acc={acc} />
                            <ShaderSlider label="Refractive index" value={advGem.ior} min={1} max={2.7} step={0.01} onChange={(v) => setOver('ior', v)} acc={acc} />
                            <ShaderSlider label="Dispersion (fire)" value={advGem.aber} min={0} max={0.06} step={0.001} onChange={(v) => setOver('aber', v)} acc={acc} />
                            <ShaderSlider label="Velvet (turbidity)" value={advGem.velvet} min={0} max={1} step={0.02} onChange={(v) => setOver('velvet', v)} acc={acc} />
                            <ShaderSlider label="Clarity (opacity)" value={advGem.opacity} min={0} max={1} step={0.02} onChange={(v) => setOver('opacity', v)} acc={acc} />
                            <ShaderSlider label="Facet sharpness" value={advGem.fb} min={0} max={1} step={0.05} onChange={(v) => setOver('fb', v)} acc={acc} />
                          </div>
                        )}
                        {firstPart && firstPart.kind === 'metal' && advMetal && (
                          <div style={{ marginTop: 14 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                              <span style={{ ...mono, fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>Metal shader</span>
                              <div style={{ display: 'flex', gap: 12 }}>
                                {onSaveMaterial && <button onClick={saveAsMaterial} style={{ fontSize: 11, color: 'var(--fg2)', background: 'transparent', border: 'none', cursor: 'pointer' }}>Save as material</button>}
                                <button onClick={resetShader} style={{ fontSize: 11, color: acc, background: 'transparent', border: 'none', cursor: 'pointer' }}>Reset</button>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 11 }}>
                              <span style={{ fontSize: 11, color: 'var(--muted)' }}>Color</span>
                              <input type="color" value={rgbToHex(advMetal.color)} onChange={(e) => setOver('color', hexToRgb(e.target.value))} style={{ width: 30, height: 26 }} />
                            </div>
                            <ShaderSlider label="Roughness" value={advMetal.roughness} min={0} max={1} step={0.01} onChange={(v) => setOver('roughness', v)} acc={acc} />
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ padding: '15px 16px 18px', borderBottom: '1px solid var(--line)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <span style={{ fontFamily: "'Instrument Serif', serif", fontSize: 19, lineHeight: 1.1, color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selTitle}</span>
                          {single && <button onClick={() => startRename(single.id)} title="Rename" style={{ flexShrink: 0, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 2, display: 'flex' }}><Ico s={13} d={['M12 20h9', 'M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z']} /></button>}
                        </div>
                        <div style={{ ...mono, fontSize: 10, color: 'var(--muted)', marginTop: 3 }}>{selSub}</div>
                      </div>
                      <div style={{ padding: '16px 16px 20px' }}>
                        {custFixed && (
                          <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>This part is fixed on this piece — it can't be changed. Pick a customizable part to see its options.</div>
                        )}
                        {firstPart && !custFixed && (
                          <>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', marginBottom: 9 }}>Material</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                              <span style={{ width: 48, height: 48, borderRadius: 10, background: 'var(--input)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: 'inset 0 0 0 1px var(--line2)' }}><MaterialOrb kind={firstPart.kind} variant={firstPart.kind === 'gem' ? firstPart.preset : firstPart.finish} size={38} /></span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{finishWordOf(firstPart.kind, firstPart.finish)}</div>
                                <div style={{ fontSize: 14.5, color: 'var(--fg)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{matLabelOf(firstPart.kind, firstPart.preset, firstPart.finish)}</div>
                              </div>
                              <button className="rfk-soft" onClick={() => setInspPage('library')} style={{ flexShrink: 0, fontSize: 12.5, color: 'var(--fg)', background: 'transparent', border: '1px solid var(--line2)', borderRadius: 8, padding: '7px 14px', cursor: 'pointer' }}>Change</button>
                            </div>
                          </>
                        )}
                        {/* Cut & size — authoring only. mm/carat are measured off the model; the cut is a
                            geometry guess the admin can override (the override is what's saved). */}
                        {!customize && firstPart && firstPart.kind === 'gem' && (
                          <div style={{ marginBottom: 20 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', marginBottom: 9 }}>Cut &amp; size</div>
                            {firstGeo ? (
                              <div style={{ ...mono, fontSize: 11, color: 'var(--muted)', marginBottom: 10 }}>
                                {firstGeo.lengthMm} × {firstGeo.widthMm}{firstGeo.depthMm != null ? ` × ${firstGeo.depthMm}` : ''} mm · {firstGeo.carat} ct
                                {selPartNodes.length > 1 && <span> · applies to {selPartNodes.filter((p) => p.kind === 'gem').length} stones</span>}
                              </div>
                            ) : (
                              <div style={{ ...mono, fontSize: 11, color: 'var(--muted)', marginBottom: 10 }}>Size unavailable for this mesh.</div>
                            )}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                              {CUTS.map((c) => {
                                const on = effCut === c;
                                const guess = firstGeo?.cut === c && !cutByMesh[firstPart.meshName];
                                return (
                                  <button key={c} onClick={() => setCut(c)} title={guess ? 'Auto-detected' : undefined} style={{ position: 'relative', textTransform: 'capitalize', fontSize: 11.5, borderRadius: 7, padding: '7px 4px', cursor: 'pointer', border: '1px solid ' + (on ? acc : 'var(--line2)'), background: on ? `rgba(${accRgb},0.14)` : 'transparent', color: on ? acc : 'var(--fg2)' }}>{c}{guess && !on ? ' ·' : ''}</button>
                                );
                              })}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 7, lineHeight: 1.5 }}>Auto-detected from the model — override if the guess is off.</div>
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 14, borderTop: '1px solid var(--line)' }}>
                          <button onClick={onHideSel} style={{ fontSize: 11.5, border: '1px solid var(--line2)', background: 'transparent', color: 'var(--fg2)', borderRadius: 7, padding: '6px 12px', cursor: 'pointer' }}>{selNodes.every((n) => n.hidden) && selNodes.length ? 'Show' : 'Hide'}</button>
                          {!customize && firstPart && (
                            <button onClick={() => setInspPage('advanced')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', color: 'var(--muted)', fontSize: 12, cursor: 'pointer' }}><span style={mono}>▸</span> Advanced shader</button>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
                {inspPage === 'props' && (
                  <div style={{ flexShrink: 0, padding: '12px 16px', borderTop: '1px solid var(--line)', background: 'var(--panel)' }}>
                    <button onClick={clearSel} style={{ width: '100%', border: 'none', borderRadius: 9, padding: '11px 0', cursor: 'pointer', background: acc, color: '#0a0a0c', fontSize: 13.5, fontWeight: 600 }}>Done</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONTEXT MENU */}
      {ctx && (
        <>
          <div onClick={() => setCtx(null)} onContextMenu={(e) => { e.preventDefault(); setCtx(null); }} style={{ position: 'fixed', inset: 0, zIndex: 60 }} />
          <div style={{ position: 'fixed', left: ctx.x, top: ctx.y, zIndex: 61, minWidth: 198, background: 'var(--menu)', border: '1px solid var(--line2)', borderRadius: 10, padding: 5, boxShadow: '0 16px 44px rgba(0,0,0,.62)' }}>
            {[
              single && { label: 'Rename', onClick: () => startRename(single.id) },
              sel.length > 1 && { label: 'Group selection', onClick: groupSelection },
              single && single.type === 'folder' && { label: 'Ungroup', onClick: () => { ungroup(single.id); setCtx(null); } },
              { label: selNodes.every((n) => n.hidden) && selNodes.length ? 'Show' : 'Hide', onClick: () => { onHideSel(); setCtx(null); } },
            ].filter(Boolean).map((it, i) => (
              <button key={i} className="rfk-row" onClick={it.onClick} style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10, background: 'transparent', border: 'none', color: 'var(--fg2)', fontSize: 12.5, padding: '8px 9px', borderRadius: 6, cursor: 'pointer' }}>{it.label}</button>
            ))}
          </div>
        </>
      )}

      {/* GUIDED TOUR — coach card; the target region glows via ring() */}
      {tourStep != null && TOUR[tourStep] && (
        <div style={{ position: 'fixed', top: 62, left: '50%', transform: 'translateX(-50%)', zIndex: 70, width: 'min(92vw, 380px)', boxSizing: 'border-box', background: 'var(--menu)', border: `1px solid rgba(${accRgb},0.5)`, borderRadius: 12, padding: 16, boxShadow: '0 18px 50px rgba(0,0,0,.6)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ ...mono, fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: acc }}>Tour · {tourStep + 1}/{TOUR.length}</span>
            <button onClick={endTour} style={{ background: 'transparent', border: 'none', color: 'var(--muted)', fontSize: 12, cursor: 'pointer' }}>Skip</button>
          </div>
          <div style={{ fontSize: 15.5, fontWeight: 600, color: 'var(--fg)', marginBottom: 5 }}>{TOUR[tourStep].title}</div>
          <div style={{ fontSize: 13.5, lineHeight: 1.55, color: 'var(--fg2)', marginBottom: 14 }}>{TOUR[tourStep].body}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <button onClick={() => setTourStep((s) => Math.max(0, s - 1))} style={{ fontSize: 12.5, border: '1px solid var(--line2)', background: 'transparent', color: 'var(--fg2)', borderRadius: 7, padding: '6px 12px', cursor: 'pointer', opacity: tourStep === 0 ? 0.4 : 1, pointerEvents: tourStep === 0 ? 'none' : 'auto' }}>Back</button>
            {tourStep < TOUR.length - 1
              ? <button onClick={() => setTourStep((s) => s + 1)} style={{ fontSize: 12.5, fontWeight: 600, border: 'none', background: acc, color: '#0a0a0c', borderRadius: 7, padding: '6px 16px', cursor: 'pointer' }}>Next →</button>
              : <button onClick={endTour} style={{ fontSize: 12.5, fontWeight: 600, border: 'none', background: acc, color: '#0a0a0c', borderRadius: 7, padding: '6px 16px', cursor: 'pointer' }}>Done</button>}
          </div>
        </div>
      )}
    </div>
  );
}

function CatHeader({ label, open, onClick }) {
  return (
    <button onClick={onClick} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'transparent', border: 'none', borderTop: '1px solid var(--line)', padding: '12px 0 11px', cursor: 'pointer' }}>
      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>{label}</span>
      <span style={{ ...mono, color: 'var(--muted)', fontSize: 12 }}>{open ? '▾' : '▸'}</span>
    </button>
  );
}
// Gem cards show a baked snapshot <img> (rendered once by GemBaker — no live canvas
// per card, so the library scales past the browser's ~16 WebGL-context limit). Until a
// gem's snapshot is baked (and for metals) it shows the cheap, tinted CSS orb.
function MatCard({ kind, variant, label, finishWord, active, acc, onClick, registry, snapshot }) {
  const isGem = kind === 'gem';
  return (
    <button className="rfk-soft" onClick={onClick} style={{ textAlign: 'left', boxSizing: 'border-box', width: '100%', minWidth: 0, maxWidth: '100%', background: 'var(--input)', border: '1.5px solid ' + (active ? acc : 'var(--line2)'), borderRadius: 11, padding: '11px 11px 9px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span style={{ width: '100%', height: isGem ? 104 : 62, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {snapshot ? <img src={snapshot} alt={label} style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <MaterialOrb kind={kind} variant={variant} size={kind === 'metal' ? 56 : 54} tint={registry?.get(variant)?.swatch} />}
      </span>
      <span><span style={{ display: 'block', fontSize: 10.5, color: 'var(--muted)' }}>{finishWord}</span><span style={{ display: 'block', fontSize: 13, color: 'var(--fg)', fontWeight: 500 }}>{label}</span></span>
    </button>
  );
}
