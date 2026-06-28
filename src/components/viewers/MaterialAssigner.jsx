'use client';

/**
 * MaterialAssigner — assign metals/gems to a GLB's meshes and save the result as the
 * custom order's `designModel` (so QC + the customer-facing viewer both render the
 * authored materials, not heuristics). Trimmed adaptation of the refrakt repo's Studio:
 * click parts in the model → assign a metal finish / gem preset; auto-detect seeds it.
 * The experimental per-gem sliders (inclusions / growth tubes / velvet / density) are
 * intentionally NOT exposed here yet — assign presets; fine-tune later in the refrakt
 * Studio. StudioViewer + the engine are ported from the refrakt repo (see memory:
 * refrakt-viewer-architecture).
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

const assignKey = (a) => (a.role === 'gem' ? `gem|${a.gemPreset}` : a.role === 'metal' ? `metal|${a.finish}` : 'ignore');
const assignSummary = (a) => (a.role === 'gem' ? GEM_LABEL[a.gemPreset] : a.role === 'metal' ? METAL_LABEL[a.finish] : 'Hidden');

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
    if (a.role === 'metal') return { nameContains: m.name, match: 'exact', type: 'metal', finish: a.finish };
    return { nameContains: m.name, match: 'exact', type: 'gem', gemPreset: a.gemPreset };
  });
  return { environment: env, background: bg, orientation: ori, meshMap };
}

// Seed assignments from an existing designModel.meshMap (exact-name slots).
function assignFromMeshMap(meshMap) {
  const out = {};
  for (const s of meshMap || []) {
    if (!s.nameContains) continue;
    if (s.type === 'gem') out[s.nameContains] = { role: 'gem', gemPreset: s.gemPreset || 'diamond', finish: 'gold' };
    else if (s.type === 'ignore') out[s.nameContains] = { role: 'ignore', finish: 'gold', gemPreset: 'diamond' };
    else out[s.nameContains] = { role: 'metal', finish: s.finish || 'gold', gemPreset: 'diamond' };
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

// CSS vars so the ported inline styles resolve against admin's dark theme.
const THEME_VARS = { '--panel': '#15181D', '--border': '#2A2F38', '--fg': '#E6E8EB', '--muted': '#9CA3AF', '--accent': '#D4AF37' };
const card = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 };
const labelStyle = { fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--muted)', fontFamily: 'ui-monospace, monospace' };
const selectStyle = { background: '#141414', color: 'var(--fg)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', fontSize: 13, width: '100%' };
const chip = (active) => ({ flexShrink: 0, padding: '3px 9px', fontSize: 11, borderRadius: 6, cursor: 'pointer', border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border)'), background: active ? 'rgba(212,175,55,0.12)' : 'transparent', color: active ? 'var(--accent)' : 'var(--muted)' });

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

  // Reset the seed guard whenever the dialog (re)opens so re-opening re-seeds.
  useEffect(() => { if (open) seededRef.current = false; }, [open, glbUrl]);

  const groups = useMemo(() => groupsFrom(meshes, assign), [meshes, assign]);
  const selectedNames = useMemo(() => [...selected], [selected]);
  const orientationRad = useMemo(() => oriDeg.map((d) => (d * Math.PI) / 180), [oriDeg]);
  const config = useMemo(() => (meshes.length ? buildConfig({ meshes, assign, env, bg, oriDeg }) : null), [meshes, assign, env, bg, oriDeg]);

  function assignReplace(names, full) {
    setAssign((prev) => { const next = { ...prev }; for (const n of names) next[n] = { ...full }; return next; });
  }
  const replaceSelected = (full) => assignReplace([...selected], full);
  const assignAll = (full) => assignReplace(meshes.map((m) => m.name), full);
  const handlePick = useCallback((name) => {
    setSelected((prev) => { const next = new Set(prev); next.has(name) ? next.delete(name) : next.add(name); return next; });
  }, []);
  const clearSel = useCallback(() => setSelected(new Set()), []);

  const selAssign = selectedNames.length ? assign[selectedNames[0]] : null;
  const selValue = selAssign ? (selAssign.role === 'gem' ? 'gem:' + selAssign.gemPreset : selAssign.role === 'metal' ? 'metal:' + selAssign.finish : 'ignore:') : '';

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
      setSnack({ severity: 'success', message: 'Materials saved to the design model' });
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
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.25, borderBottom: '1px solid #2A2F38' }}>
          <Typography sx={{ fontWeight: 600 }}>Assign Materials</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button variant="contained" size="small" startIcon={saving ? <CircularProgress size={14} sx={{ color: '#000' }} /> : <SaveIcon sx={{ fontSize: 16 }} />} disabled={saving || !config} onClick={save} sx={{ backgroundColor: '#D4AF37', color: '#000', fontWeight: 600, '&:hover': { backgroundColor: '#C19B2E' } }}>
              {saveLabel}
            </Button>
            <IconButton onClick={onClose} size="small" sx={{ color: '#9CA3AF' }}><CloseIcon /></IconButton>
          </Box>
        </Box>

        {/* Probe (hidden) */}
        {open && glbUrl && (
          <LoadBoundary key={glbUrl} onError={() => setError('Could not read that GLB — it may use DRACO/meshopt compression.')}>
            <Suspense fallback={null}><MeshProbe url={glbUrl} onMeshes={handleMeshes} /></Suspense>
          </LoadBoundary>
        )}

        <Box style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'minmax(0,1.4fr) minmax(340px,0.8fr)', gap: 20, padding: 20, overflow: 'hidden' }}>
          {/* Viewer */}
          <div style={{ position: 'relative', minHeight: 0, borderRadius: 12, overflow: 'hidden', background: bg, border: '1px solid var(--border)' }}>
            {glbUrl && config ? (
              <LoadBoundary key={glbUrl} fallback={<div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f87171', fontSize: 13 }}>Failed to render this model.</div>}>
                <StudioViewer glbUrl={glbUrl} assign={assign} selectedNames={selectedNames} onPick={handlePick} onClear={clearSel} orientation={orientationRad} environment={env} background={bg} autoRotate={autoRotate} />
              </LoadBoundary>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 13 }}>{error || 'Reading model…'}</div>
            )}
            {/* Selection action bar */}
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
            <div style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <p style={{ ...labelStyle, margin: 0 }}>Scene</p>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--muted)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={autoRotate} onChange={(e) => setAutoRotate(e.target.checked)} style={{ accentColor: '#D4AF37' }} /> Turntable
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
                  <input type="range" min={-180} max={180} step={1} value={Math.round(oriDeg[ai])} onChange={(e) => setOriDeg((p) => p.map((v, idx) => (idx === ai ? Number(e.target.value) : v)))} style={{ flex: 1, accentColor: '#D4AF37' }} />
                  <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--muted)', width: 38, textAlign: 'right' }}>{Math.round(oriDeg[ai])}°</span>
                </div>
              ))}
            </div>

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
            <Typography variant="caption" sx={{ color: '#6B7280', px: 0.5 }}>
              Fine gem tuning (inclusions, growth tubes, custom colour) lives in the REFRAKT Studio — assign presets here.
            </Typography>
          </div>
        </Box>
      </Box>
      <Snackbar open={!!snack} autoHideDuration={4000} onClose={() => setSnack(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {snack ? <Alert severity={snack.severity} onClose={() => setSnack(null)} variant="filled">{snack.message}</Alert> : null}
      </Snackbar>
    </Dialog>
  );
}
