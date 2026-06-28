'use client';

/**
 * MaterialAssigner — assign metals/gems to a GLB's meshes and save the result as the
 * custom order's `designModel` (so QC + the customer-facing viewer render the authored
 * materials). Adaptation of the refrakt repo's Studio: click parts in the model → assign
 * a metal finish / gem preset, then fine-tune the selected material with the full gem
 * (and metal) slider suite. Auto-detect seeds the initial assignment. StudioViewer + the
 * engine are ported from the refrakt repo (see memory: refrakt-viewer-architecture).
 */

import { Component, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGLTF } from '@react-three/drei';
import { Dialog, Box, Button, IconButton, Typography, CircularProgress, Snackbar, Alert } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SaveIcon from '@mui/icons-material/Save';
import StudioViewer from './StudioViewer';
import { GEM_CONFIGS } from '@/lib/refrakt/core/materials';

const METAL_FINISHES = [
  { value: 'gold', label: 'Yellow Gold (polished)' },
  { value: 'satin', label: 'Satin Gold (brushed)' },
  { value: 'whiteGold', label: 'White Gold' },
  { value: 'roseGold', label: 'Rose Gold' },
  { value: 'platinum', label: 'Platinum' },
  { value: 'silver', label: 'Silver' },
];
const GEM_PRESETS = [
  { value: 'diamond', label: 'Diamond' },
  { value: 'moissanite', label: 'Moissanite' },
  { value: 'marquise', label: 'Marquise Diamond' },
  { value: 'amethyst', label: 'Amethyst' },
  { value: 'ruby', label: 'Ruby' },
  { value: 'sapphire', label: 'Sapphire' },
  { value: 'emerald', label: 'Emerald' },
];
const ENV_PRESETS = ['city', 'studio', 'sunset', 'dawn', 'night', 'warehouse', 'forest', 'park', 'lobby', 'apartment'];
const METAL_LABEL = Object.fromEntries(METAL_FINISHES.map((m) => [m.value, m.label]));
const GEM_LABEL = Object.fromEntries(GEM_PRESETS.map((g) => [g.value, g.label]));

const GEM_KEYWORDS = { diamond: 'diamond', moissanite: 'moissanite', marquise: 'marquise', amethyst: 'amethyst', ruby: 'ruby', sapphire: 'sapphire', emerald: 'emerald', topaz: 'amethyst', gem: 'diamond', stone: 'diamond' };
const METAL_KEYWORDS = /gold|silver|platin|metal|band|shank|prong|mount|setting|head|bezel|claw|gallery|ring|halo/;

const ACCENT = '#D4AF37';
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const r4 = (n) => +Number(n).toFixed(4);
function rgbToHex(rgb) {
  const h = (x) => Math.round(clamp01(x) * 255).toString(16).padStart(2, '0');
  return '#' + h(rgb[0]) + h(rgb[1]) + h(rgb[2]);
}
function hexToRgb(hex) {
  const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex);
  return m ? [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255] : [1, 1, 1];
}

const METAL_DEFAULTS = {
  gold: { color: [0.85, 0.62, 0.2], roughness: 0.07 },
  satin: { color: [0.78, 0.56, 0.16], roughness: 0.72 },
  whiteGold: { color: [0.76, 0.78, 0.82], roughness: 0.14 },
  roseGold: { color: [0.85, 0.58, 0.52], roughness: 0.07 },
  platinum: { color: [0.8, 0.82, 0.85], roughness: 0.09 },
  silver: { color: [0.76, 0.78, 0.82], roughness: 0.14 },
};
function gemDefaults(preset) {
  const c = GEM_CONFIGS[preset] || GEM_CONFIGS.diamond;
  return { ior: c.ior, color: [c.color.r, c.color.g, c.color.b], aber: c.aber, fresnel: c.fresnel, fb: c.fb, cm: c.cm, density: c.density ?? 0, inclusions: c.incl ?? 0, inclScale: c.inclScale ?? 1, tubes: c.tubes ?? 0, tubeAngle: c.tubeAngle ?? 0, velvet: c.velvet ?? 0, opacity: c.opacity ?? 0 };
}
function gemEff(a) {
  const d = gemDefaults(a.gemPreset);
  return { ior: a.ior ?? d.ior, color: a.color ?? d.color, aber: a.aber ?? d.aber, fresnel: a.fresnel ?? d.fresnel, fb: a.fb ?? d.fb, cm: a.cm ?? d.cm, density: a.density ?? d.density, inclusions: a.inclusions ?? d.inclusions, inclScale: a.inclScale ?? d.inclScale, tubes: a.tubes ?? d.tubes, tubeAngle: a.tubeAngle ?? d.tubeAngle, velvet: a.velvet ?? d.velvet, opacity: a.opacity ?? d.opacity };
}
function metalEff(a) {
  const d = METAL_DEFAULTS[a.finish] || METAL_DEFAULTS.gold;
  return { color: a.color ?? d.color, roughness: a.roughness ?? d.roughness };
}
const isCustomGem = (a) => a.ior != null || a.color != null || a.aber != null || a.fresnel != null || a.fb != null || a.cm != null || a.density != null || a.inclusions != null || a.inclScale != null || a.tubes != null || a.tubeAngle != null || a.velvet != null || a.opacity != null;
const isCustomMetal = (a) => a.color != null || a.roughness != null;

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
  for (const kw in GEM_KEYWORDS) if (hay.includes(kw)) return { role: 'gem', gemPreset: GEM_KEYWORDS[kw], finish: 'gold', why: `name “${kw}”` };
  if (m.transmission > 0.1 || m.opacity < 0.95) return { role: 'gem', gemPreset: 'diamond', finish: 'gold', why: 'glass-like material' };
  if (m.metalness > 0.5) return { role: 'metal', gemPreset: 'diamond', finish: metalFinish(m.color), why: 'metallic material' };
  if (METAL_KEYWORDS.test(hay)) return { role: 'metal', gemPreset: 'diamond', finish: metalFinish(m.color), why: 'name hint' };
  return { role: 'metal', gemPreset: 'diamond', finish: 'gold', why: 'default' };
}

const assignKey = (a) =>
  a.role === 'gem'
    ? `gem|${a.gemPreset}|${a.ior ?? ''}|${a.color ?? ''}|${a.aber ?? ''}|${a.fresnel ?? ''}|${a.fb ?? ''}|${a.cm ?? ''}|${a.density ?? ''}|${a.inclusions ?? ''}|${a.inclScale ?? ''}|${a.tubes ?? ''}|${a.tubeAngle ?? ''}|${a.velvet ?? ''}|${a.opacity ?? ''}`
    : a.role === 'metal'
    ? `metal|${a.finish}|${a.color ?? ''}|${a.roughness ?? ''}`
    : 'ignore';
const assignSummary = (a) =>
  a.role === 'gem'
    ? GEM_LABEL[a.gemPreset] + (isCustomGem(a) ? ' (custom)' : '')
    : a.role === 'metal'
    ? METAL_LABEL[a.finish] + (isCustomMetal(a) ? ' (custom)' : '')
    : 'Hidden';

function groupsFrom(meshes, assign) {
  const map = new Map();
  for (const m of meshes) {
    const a = assign[m.name];
    if (!a) continue;
    const key = `${m.tris}|${assignKey(a)}`;
    if (!map.has(key)) map.set(key, { key, tris: m.tris, why: m.auto.why, members: [], ...a });
    map.get(key).members.push(m.name);
  }
  return [...map.values()];
}

function buildConfig({ meshes, assign, env, bg, oriDeg }) {
  const ori = oriDeg.map((d) => (d * Math.PI) / 180);
  const meshMap = meshes.map((m) => {
    const a = assign[m.name] || { role: 'metal', finish: 'gold' };
    if (a.role === 'ignore') return { nameContains: m.name, match: 'exact', type: 'ignore' };
    if (a.role === 'metal') {
      const slot = { nameContains: m.name, match: 'exact', type: 'metal', finish: a.finish };
      if (a.color) slot.color = a.color.map(r4);
      if (a.roughness != null) slot.roughness = r4(a.roughness);
      return slot;
    }
    const slot = { nameContains: m.name, match: 'exact', type: 'gem', gemPreset: a.gemPreset };
    if (a.ior != null) slot.ior = r4(a.ior);
    if (a.color) slot.color = a.color.map(r4);
    if (a.aber != null) slot.aberration = r4(a.aber);
    if (a.fresnel != null) slot.fresnel = r4(a.fresnel);
    if (a.fb != null) slot.facetBlend = r4(a.fb);
    if (a.cm != null) slot.colorMode = a.cm;
    if (a.density != null) slot.density = r4(a.density);
    if (a.inclusions != null) slot.inclusions = r4(a.inclusions);
    if (a.inclScale != null) slot.inclScale = r4(a.inclScale);
    if (a.tubes != null) slot.tubes = r4(a.tubes);
    if (a.tubeAngle != null) slot.tubeAngle = r4(a.tubeAngle);
    if (a.velvet != null) slot.velvet = r4(a.velvet);
    if (a.opacity != null) slot.opacity = r4(a.opacity);
    return slot;
  });
  return { environment: env, background: bg, orientation: ori, meshMap };
}

// Seed assignments from an existing designModel.meshMap (slot field names → assign keys).
function assignFromMeshMap(meshMap) {
  const out = {};
  for (const s of meshMap || []) {
    if (!s.nameContains) continue;
    if (s.type === 'ignore') { out[s.nameContains] = { role: 'ignore', finish: 'gold', gemPreset: 'diamond' }; continue; }
    if (s.type === 'gem') {
      const a = { role: 'gem', gemPreset: s.gemPreset || 'diamond', finish: 'gold' };
      if (s.ior != null) a.ior = s.ior;
      if (s.color) a.color = s.color;
      if (s.aberration != null) a.aber = s.aberration;
      if (s.fresnel != null) a.fresnel = s.fresnel;
      if (s.facetBlend != null) a.fb = s.facetBlend;
      if (s.colorMode != null) a.cm = s.colorMode;
      if (s.density != null) a.density = s.density;
      if (s.inclusions != null) a.inclusions = s.inclusions;
      if (s.inclScale != null) a.inclScale = s.inclScale;
      if (s.tubes != null) a.tubes = s.tubes;
      if (s.tubeAngle != null) a.tubeAngle = s.tubeAngle;
      if (s.velvet != null) a.velvet = s.velvet;
      if (s.opacity != null) a.opacity = s.opacity;
      out[s.nameContains] = a;
      continue;
    }
    const a = { role: 'metal', finish: s.finish || 'gold', gemPreset: 'diamond' };
    if (s.color) a.color = s.color;
    if (s.roughness != null) a.roughness = s.roughness;
    out[s.nameContains] = a;
  }
  return out;
}

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
    const byName = new Map();
    scene.traverse((o) => {
      if (!o.isMesh || o.userData.__outline) return;
      const nm = o.name || '(unnamed)';
      const geo = o.geometry;
      const tris = Math.round((geo?.index ? geo.index.count : geo?.attributes?.position?.count ?? 0) / 3);
      if (!byName.has(nm)) byName.set(nm, { name: nm, tris: 0, mat: readMat(o) });
      byName.get(nm).tris += tris;
    });
    onMeshes([...byName.values()]);
  }, [scene, url, onMeshes]);
  return null;
}
const fmtTris = (n) => (n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'k' : String(n));

const THEME_VARS = { '--panel': '#15181D', '--border': '#2A2F38', '--fg': '#E6E8EB', '--muted': '#9CA3AF', '--accent': ACCENT };
const card = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 };
const labelStyle = { fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--muted)', fontFamily: 'ui-monospace, monospace' };
const selectStyle = { background: '#141414', color: 'var(--fg)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', fontSize: 13, width: '100%' };
const chip = (active) => ({ flexShrink: 0, padding: '3px 9px', fontSize: 11, borderRadius: 6, cursor: 'pointer', border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border)'), background: active ? 'rgba(212,175,55,0.12)' : 'transparent', color: active ? 'var(--accent)' : 'var(--muted)' });

function Slider({ label, value, min, max, step, onChange, hint }) {
  return (
    <div style={{ marginBottom: 10 }} title={hint || ''}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ ...labelStyle, fontSize: 10 }}>{label}</span>
        <span style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--fg)' }}>{Number(value).toFixed(step < 0.01 ? 3 : 2)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} style={{ width: '100%', accentColor: ACCENT }} />
      {hint && <p style={{ fontSize: 9.5, color: 'var(--muted)', margin: '2px 0 0', lineHeight: 1.35 }}>{hint}</p>}
    </div>
  );
}

function AssignOptions() {
  return (
    <>
      <optgroup label="Gemstone">{GEM_PRESETS.map((g) => <option key={'gem:' + g.value} value={'gem:' + g.value}>{g.label}</option>)}</optgroup>
      <optgroup label="Metal">{METAL_FINISHES.map((m) => <option key={'metal:' + m.value} value={'metal:' + m.value}>{m.label}</option>)}</optgroup>
      <optgroup label="Other"><option value="ignore:">Hide</option></optgroup>
    </>
  );
}
function parseAssign(value) {
  const [role, v] = value.split(':');
  if (role === 'gem') return { role: 'gem', gemPreset: v };
  if (role === 'metal') return { role: 'metal', finish: v };
  return { role: 'ignore' };
}

export default function MaterialAssigner({ open, onClose, customID, glbUrl, initialDesignModel, onSaved, saveLabel = 'Save to design model' }) {
  const [meshes, setMeshes] = useState([]);
  const [assign, setAssign] = useState({});
  const [selected, setSelected] = useState(() => new Set());
  const [env, setEnv] = useState(initialDesignModel?.environment || 'city');
  const [bg, setBg] = useState(initialDesignModel?.background || '#080808');
  const [oriDeg, setOriDeg] = useState(() => {
    const o = initialDesignModel?.orientation;
    return Array.isArray(o) ? o.map((r) => (r * 180) / Math.PI) : [0, 0, 0];
  });
  const [autoRotate, setAutoRotate] = useState(false);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [snack, setSnack] = useState(null);
  const seededRef = useRef(false);

  const handleMeshes = useCallback((list) => {
    const withAuto = list.map((info) => ({ ...info, auto: classify(info) }));
    const seed = !seededRef.current ? assignFromMeshMap(initialDesignModel?.meshMap) : {};
    seededRef.current = true;
    const a = {};
    for (const m of withAuto) a[m.name] = seed[m.name] || { role: m.auto.role, finish: m.auto.finish, gemPreset: m.auto.gemPreset };
    setMeshes(withAuto);
    setAssign(a);
    setSelected(new Set());
    setError(null);
  }, [initialDesignModel]);

  useEffect(() => { if (open) seededRef.current = false; }, [open, glbUrl]);

  const groups = useMemo(() => groupsFrom(meshes, assign), [meshes, assign]);
  const selectedNames = useMemo(() => [...selected], [selected]);
  const orientationRad = useMemo(() => oriDeg.map((d) => (d * Math.PI) / 180), [oriDeg]);
  const config = useMemo(() => (meshes.length ? buildConfig({ meshes, assign, env, bg, oriDeg }) : null), [meshes, assign, env, bg, oriDeg]);

  function assignNames(names, patch) {
    setAssign((prev) => { const next = { ...prev }; for (const n of names) next[n] = { ...next[n], ...patch }; return next; });
  }
  function assignReplace(names, full) {
    setAssign((prev) => { const next = { ...prev }; for (const n of names) next[n] = { ...full }; return next; });
  }
  const replaceSelected = (full) => assignReplace([...selected], full);
  const assignAll = (full) => assignReplace(meshes.map((m) => m.name), full);
  const tweakSelected = (role, patch) => assignNames([...selected].filter((n) => assign[n]?.role === role), patch);
  const handlePick = useCallback((name) => {
    setSelected((prev) => { const next = new Set(prev); next.has(name) ? next.delete(name) : next.add(name); return next; });
  }, []);
  const clearSel = useCallback(() => setSelected(new Set()), []);

  const selAssign = selectedNames.length ? assign[selectedNames[0]] : null;
  const selValue = selAssign ? (selAssign.role === 'gem' ? 'gem:' + selAssign.gemPreset : selAssign.role === 'metal' ? 'metal:' + selAssign.finish : 'ignore:') : '';
  const selRole = selAssign?.role ?? null;
  const eaRole = selectedNames.map((n) => assign[n]).find((a) => a?.role === selRole) ?? null;
  const gE = selRole === 'gem' && eaRole ? gemEff(eaRole) : null;
  const mE = selRole === 'metal' && eaRole ? metalEff(eaRole) : null;

  const save = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const designModel = { glbUrl, ...config };
      const res = await fetch(`/api/custom-orders/${customID}/design-model`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(designModel),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setSnack({ severity: 'success', message: 'Materials saved' });
      onSaved?.(data);
    } catch (e) {
      setSnack({ severity: 'error', message: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullScreen PaperProps={{ sx: { backgroundColor: '#0B0D10', backgroundImage: 'none' } }}>
      <Box sx={THEME_VARS} style={{ display: 'flex', flexDirection: 'column', height: '100%', color: 'var(--fg)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.25, borderBottom: '1px solid #2A2F38' }}>
          <Typography sx={{ fontWeight: 600 }}>Assign Materials</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button variant="contained" size="small" startIcon={saving ? <CircularProgress size={14} sx={{ color: '#000' }} /> : <SaveIcon sx={{ fontSize: 16 }} />} disabled={saving || !config} onClick={save} sx={{ backgroundColor: ACCENT, color: '#000', fontWeight: 600, '&:hover': { backgroundColor: '#C19B2E' } }}>
              {saveLabel}
            </Button>
            <IconButton onClick={onClose} size="small" sx={{ color: '#9CA3AF' }}><CloseIcon /></IconButton>
          </Box>
        </Box>

        {open && glbUrl && (
          <LoadBoundary key={glbUrl} onError={() => setError('Could not read that GLB — it may use DRACO/meshopt compression.')}>
            <Suspense fallback={null}><MeshProbe url={glbUrl} onMeshes={handleMeshes} /></Suspense>
          </LoadBoundary>
        )}

        <Box style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'minmax(0,1.4fr) minmax(360px,0.8fr)', gap: 20, padding: 20, overflow: 'hidden' }}>
          {/* Viewer */}
          <div style={{ position: 'relative', minHeight: 0, borderRadius: 12, overflow: 'hidden', background: bg, border: '1px solid var(--border)' }}>
            {glbUrl && config ? (
              <LoadBoundary key={glbUrl} fallback={<div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f87171', fontSize: 13 }}>Failed to render this model.</div>}>
                <StudioViewer glbUrl={glbUrl} assign={assign} selectedNames={selectedNames} onPick={handlePick} onClear={clearSel} orientation={orientationRad} environment={env} background={bg} autoRotate={autoRotate} />
              </LoadBoundary>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 13 }}>{error || 'Reading model…'}</div>
            )}
            <div style={{ position: 'absolute', left: 12, right: 12, bottom: 12, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: 'rgba(8,8,8,0.82)', backdropFilter: 'blur(6px)', border: '1px solid ' + (selectedNames.length ? 'rgba(212,175,55,0.4)' : 'var(--border)') }}>
              {selectedNames.length ? (
                <>
                  <span style={{ fontSize: 13, color: 'var(--accent)', whiteSpace: 'nowrap' }}>{selectedNames.length} selected</span>
                  <select value={selValue} onChange={(e) => { if (e.target.value) replaceSelected(parseAssign(e.target.value)); }} style={{ ...selectStyle, flex: 1 }}>
                    <option value="" disabled>Assign to…</option>
                    <AssignOptions />
                  </select>
                  <button onClick={clearSel} style={chip(false)}>Clear</button>
                </>
              ) : (
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>Click a part in the model to select it →</span>
              )}
            </div>
          </div>

          {/* Side panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', minHeight: 0 }}>
            {/* Scene */}
            <div style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <p style={{ ...labelStyle, margin: 0 }}>Scene</p>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--muted)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={autoRotate} onChange={(e) => setAutoRotate(e.target.checked)} style={{ accentColor: ACCENT }} /> Turntable
                </label>
              </div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                <label style={{ flex: 1 }}>
                  <span style={{ ...labelStyle, fontSize: 10, display: 'block', marginBottom: 5 }}>Environment</span>
                  <select value={env} onChange={(e) => setEnv(e.target.value)} style={selectStyle}>{ENV_PRESETS.map((p) => <option key={p} value={p}>{p}</option>)}</select>
                </label>
                <label>
                  <span style={{ ...labelStyle, fontSize: 10, display: 'block', marginBottom: 5 }}>Background</span>
                  <input type="color" value={bg} onChange={(e) => setBg(e.target.value)} style={{ width: 46, height: 38, background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer' }} />
                </label>
              </div>
              <span style={{ ...labelStyle, fontSize: 10, display: 'block', marginBottom: 6 }}>Orientation</span>
              {['X', 'Y', 'Z'].map((axis, ai) => (
                <div key={axis} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--muted)', width: 12 }}>{axis}</span>
                  <input type="range" min={-180} max={180} step={1} value={Math.round(oriDeg[ai])} onChange={(e) => setOriDeg((p) => p.map((v, idx) => (idx === ai ? Number(e.target.value) : v)))} style={{ flex: 1, accentColor: ACCENT }} />
                  <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--muted)', width: 38, textAlign: 'right' }}>{Math.round(oriDeg[ai])}°</span>
                </div>
              ))}
            </div>

            {/* Customize gem */}
            {selRole === 'gem' && gE && (
              <div style={{ ...card, borderColor: 'rgba(212,175,55,0.35)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <p style={{ ...labelStyle, margin: 0 }}>Customize gem · {selectedNames.length} sel.</p>
                  <button onClick={() => replaceSelected({ role: 'gem', gemPreset: eaRole.gemPreset })} style={chip(false)}>Reset</button>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ ...labelStyle, fontSize: 10 }}>Tint</span>
                  <input type="color" value={rgbToHex(gE.color)} onChange={(e) => tweakSelected('gem', { color: hexToRgb(e.target.value) })} style={{ width: 42, height: 30, background: 'transparent', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer' }} />
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                    {[['Direct', 0], ['Glow', 1]].map(([lbl, v]) => (
                      <button key={v} onClick={() => tweakSelected('gem', { cm: v })} style={chip(Math.round(gE.cm) === v)} title={v ? 'Luminance-tinted (richer color)' : 'Direct env color'}>{lbl}</button>
                    ))}
                  </div>
                </div>
                <Slider label="Depth / saturation" value={gE.density} min={0} max={6} step={0.1} onChange={(v) => tweakSelected('gem', { density: v })} hint="Colour deepening through the stone (Beer–Lambert). 0 = clear like diamond." />
                <Slider label="Opacity (clarity)" value={gE.opacity} min={0} max={1} step={0.02} onChange={(v) => tweakSelected('gem', { opacity: v })} hint="Clear glass (0) → nearly opaque, heavily-included (1)." />
                <Slider label="Velvet (turbidity)" value={gE.velvet} min={0} max={1} step={0.02} onChange={(v) => tweakSelected('gem', { velvet: v })} hint="Softens glassy clarity for a natural, velvety look. 0 = optical glass." />
                <Slider label="Inclusions (jardin)" value={gE.inclusions} min={0} max={1} step={0.02} onChange={(v) => tweakSelected('gem', { inclusions: v })} hint="Milky silk + dark carbon specks. Emeralds want this; diamonds don’t." />
                <Slider label="Inclusion scale" value={gE.inclScale} min={0.2} max={3} step={0.05} onChange={(v) => tweakSelected('gem', { inclScale: v })} hint="Size of the silk/specks." />
                <Slider label="Growth tubes" value={gE.tubes} min={0} max={1} step={0.02} onChange={(v) => tweakSelected('gem', { tubes: v })} hint="Parallel needle inclusions — the signature emerald feature." />
                <Slider label="Tube angle" value={gE.tubeAngle} min={0} max={3.14} step={0.05} onChange={(v) => tweakSelected('gem', { tubeAngle: v })} hint="Direction the growth tubes run." />
                <Slider label="Refractive index (IOR)" value={gE.ior} min={1} max={2.7} step={0.01} onChange={(v) => tweakSelected('gem', { ior: v })} hint="Higher = more brilliance. Diamond 2.42, emerald 1.57." />
                <Slider label="Dispersion (fire)" value={gE.aber} min={0} max={0.06} step={0.001} onChange={(v) => tweakSelected('gem', { aber: v })} hint="Rainbow flashes (“fire”). High in diamond, low in emerald." />
                <Slider label="Fresnel rim" value={gE.fresnel} min={0} max={0.6} step={0.01} onChange={(v) => tweakSelected('gem', { fresnel: v })} hint="Bright glow at grazing edges." />
                <Slider label="Facet sharpness" value={gE.fb} min={0} max={1} step={0.05} onChange={(v) => tweakSelected('gem', { fb: v })} hint="Crisp facet edges (1) vs soft (0)." />
              </div>
            )}
            {/* Customize metal */}
            {selRole === 'metal' && mE && (
              <div style={{ ...card, borderColor: 'rgba(212,175,55,0.35)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <p style={{ ...labelStyle, margin: 0 }}>Customize metal · {selectedNames.length} sel.</p>
                  <button onClick={() => replaceSelected({ role: 'metal', finish: eaRole.finish })} style={chip(false)}>Reset</button>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ ...labelStyle, fontSize: 10 }}>Color</span>
                  <input type="color" value={rgbToHex(mE.color)} onChange={(e) => tweakSelected('metal', { color: hexToRgb(e.target.value) })} style={{ width: 42, height: 30, background: 'transparent', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer' }} />
                </div>
                <Slider label="Roughness (polish ↔ matte)" value={mE.roughness} min={0} max={1} step={0.01} onChange={(v) => tweakSelected('metal', { roughness: v })} hint="0 = mirror polish, 1 = brushed / satin." />
              </div>
            )}

            {/* Parts */}
            <div style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <p style={{ ...labelStyle, margin: 0 }}>Parts ({groups.length})</p>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => assignAll({ role: 'gem', gemPreset: 'diamond' })} style={chip(false)}>All → Diamond</button>
                  <button onClick={() => assignAll({ role: 'metal', finish: 'gold' })} style={chip(false)}>All → Gold</button>
                </div>
              </div>
              <p style={{ fontSize: 11, color: 'var(--muted)', margin: '0 0 10px' }}>Click a row to select that whole group in the model.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {groups.map((g) => {
                  const allSel = g.members.every((n) => selected.has(n));
                  return (
                    <button key={g.key} onClick={() => setSelected(new Set(g.members))} style={{ textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, cursor: 'pointer', border: '1px solid ' + (allSel ? 'var(--accent)' : 'var(--border)'), background: allSel ? 'rgba(212,175,55,0.1)' : 'transparent' }}>
                      <span style={{ minWidth: 0 }}>
                        <span style={{ fontSize: 13, color: 'var(--fg)' }}>{assignSummary(g)}{g.members.length > 1 && <span style={{ color: 'var(--accent)' }}> ×{g.members.length}</span>}</span>
                        <span style={{ fontFamily: 'monospace', display: 'block', fontSize: 10, color: 'var(--muted)' }}>{fmtTris(g.tris * g.members.length)} tris · auto: {g.why}</span>
                      </span>
                      <span style={{ fontFamily: 'monospace', fontSize: 10, color: allSel ? 'var(--accent)' : 'var(--muted)', flexShrink: 0 }}>{allSel ? 'selected' : 'select'}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </Box>
      </Box>
      <Snackbar open={!!snack} autoHideDuration={4000} onClose={() => setSnack(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {snack ? <Alert severity={snack.severity} onClose={() => setSnack(null)} variant="filled">{snack.message}</Alert> : null}
      </Snackbar>
    </Dialog>
  );
}
