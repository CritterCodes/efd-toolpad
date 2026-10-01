import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogTitle, DialogContent, Stack, TextField, MenuItem, Box, Button, Chip, Typography, InputAdornment, Divider, Alert, CircularProgress, DialogActions, Tooltip, IconButton } from '@mui/material';
import { slotMatchesLink, allowedSpeciesForLink } from '@/services/production/gemLinks';
import { sumStones, caratBand, stoneUnit } from '@/services/production/variantPricing';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { CREATION_OPTS, GEM_ROLES, cap, gemYield, money, stoneSizeLabel, tierRate } from './designShared';
import { StonePicker } from './pricingCards';
export const CONF_COLOR = { exact: '#66BB6A', close: '#FFA726', loose: REPAIRS_UI.textMuted };
// Trade shapes (REFRAKT's cut vocabulary) offered when entering a stone by hand.
export const SHAPE_OPTS = ['round', 'oval', 'princess', 'cushion', 'radiant', 'emerald', 'asscher', 'baguette', 'pear', 'marquise', 'heart', 'trillion'];
// Diamond-equivalent carat from a footprint (matches REFRAKT: 0.00364·L·W²) — for manual entry.
export const caratFromMm = (l, w) => { const L = Number(l); const W = Number(w); return (L > 0 && W > 0) ? Math.round(0.00364 * L * W * W * 1000) / 1000 : null; };
// One-line attribute summary for the (uncluttered) inline stone row; details live in the modal.
export const stoneSummary = (r) => {
  const size = stoneSizeLabel({ l: Number(r.lengthMm) || null, w: Number(r.widthMm) || null }) || r.sizeMm || (r.caratEach ? `${r.caratEach}ct` : '');
  return [cap(r.role), r.creation, size, r.cut, r.preset].filter(Boolean).join(' · ');
};

/** Full stone-line editor (modal). Holds all the per-line detail that used to clutter the row —
 *  role, origin, and the geometry REFRAKT stamps for a CAD design (type/cut/mm), entered by HAND
 *  for a handmade design (no GLB) — plus the catalog + live Stuller match driven by those fields.
 *  Edits a local copy; commits on Done. */
export function StoneEditorModal({ open, row, onClose, onSave }) {
  const [r, setR] = useState(row || {});
  const [data, setData] = useState({ catalog: [], gemDesigns: [], stuller: [], stullerError: null });
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  // Seed the working copy when the modal OPENS (not on every row identity change, which would
  // discard in-progress edits).
  useEffect(() => { if (open) { setR(row || {}); setErr(''); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const f = (patch) => setR((x) => ({ ...x, ...patch }));
  const creation = r.creation || 'natural';
  const linked = Boolean(r.stoneSkuId || r.gemDesignId);
  const compCarat = caratFromMm(r.lengthMm, r.widthMm);

  // Find catalog + Stuller matches from the current attributes (debounced as the user types mm).
  const find = useCallback(async () => {
    if (!open) return;
    if (!r.preset && !r.lengthMm && !r.caratEach) { setData({ catalog: [], gemDesigns: [], stuller: [], stullerError: null }); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/products/stones/match', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gemType: r.preset, cut: r.cut, creation, carat: r.caratEach, lengthMm: r.lengthMm, widthMm: r.widthMm }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || 'Match failed');
      setData({ catalog: d.catalog || [], gemDesigns: d.gemDesigns || [], stuller: d.stuller || [], stullerError: d.stullerError });
    } catch (e) { setData({ catalog: [], gemDesigns: [], stuller: [], stullerError: e.message }); } finally { setLoading(false); }
  }, [open, r.preset, r.cut, creation, r.caratEach, r.lengthMm, r.widthMm]);
  useEffect(() => { const t = setTimeout(find, 300); return () => clearTimeout(t); }, [find]);

  const applyCatalog = (s) => f({ stoneSkuId: s.stoneSkuId || '', stullerSku: s.stullerSku || '', label: s.label || '', unitCost: s.cost != null ? String(s.cost) : '', creation: s.naturalSynthetic || creation, caratEach: r.caratEach || (s.caratEach != null ? String(s.caratEach) : ''), source: 'catalog' });
  const applyStuller = async (c) => {
    const id = c.itemNumber || c.serialNumber || 'x';
    setBusy(id); setErr('');
    try {
      // Melee = a real /v2/products SKU → persist (+ cron-refresh) via from-stuller. Serialized
      // certified stones = point-in-time capture via from-gem.
      const req = c.kind === 'melee'
        ? { url: '/api/products/stones/from-stuller', payload: { itemNumber: c.itemNumber } }
        : { url: '/api/products/stones/from-gem', payload: { candidate: c } };
      const res = await fetch(req.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(req.payload) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || 'Save failed');
      const s = d.stone || {};
      f({ stoneSkuId: s.stoneSkuId || '', stullerSku: s.stullerSku || '', label: s.label || '', unitCost: s.cost != null ? String(s.cost) : '', creation: c.creation || s.naturalSynthetic || creation, caratEach: r.caratEach || (s.caratEach != null ? String(s.caratEach) : ''), source: 'stuller' });
    } catch (e) { setErr(e.message); } finally { setBusy(''); }
  };
  // Link an EFD gem design (Phase 2): pins design + variant + COLOR — the color is the rate
  // key, so payouts and Phase-3 enforcement depend on it. unitCost is the snapshot at the row's
  // carat; reselect the color after a size change to reprice (authoritative price = claim time).
  const applyGemDesign = (c, color) => f({
    stoneSkuId: '', stullerSku: '',
    gemDesignId: c.designID, gemVariantId: c.variantId, gemColor: color.label,
    label: `${c.designName} · ${c.species} · ${color.label}`,
    unitCost: color.price != null ? String(color.price) : '',
    creation: c.creation || creation,
    source: 'gemDesign',
  });
  const unlink = () => f({ stoneSkuId: '', stullerSku: '', gemDesignId: '', gemVariantId: '', gemColor: '', source: '' });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}` } }}>
      <DialogTitle sx={{ color: REPAIRS_UI.textHeader, pb: 0.5 }}>Stone details</DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Stack spacing={1.5}>
          {/* Attributes — for CAD these come prefilled from REFRAKT; for handmade, entered here. */}
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <TextField select size="small" label="Role" value={r.role || 'accent'} onChange={(e) => f({ role: e.target.value })} sx={{ width: 110 }}>
              {GEM_ROLES.map((g) => <MenuItem key={g.value} value={g.value}>{g.label}</MenuItem>)}
            </TextField>
            <TextField select size="small" label="Origin" value={creation} onChange={(e) => f({ creation: e.target.value })} sx={{ width: 110 }}>
              {CREATION_OPTS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
            </TextField>
            <TextField size="small" label="Qty" type="number" value={r.qty ?? '1'} onChange={(e) => f({ qty: e.target.value })} sx={{ width: 72 }} inputProps={{ min: 1 }} />
          </Stack>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <TextField size="small" label="Gem type" value={r.preset || ''} onChange={(e) => f({ preset: e.target.value })} placeholder="diamond, amethyst…" sx={{ width: 150 }} />
            <TextField select size="small" label="Cut / shape" value={r.cut || ''} onChange={(e) => f({ cut: e.target.value })} sx={{ width: 140 }}>
              <MenuItem value="">—</MenuItem>
              {SHAPE_OPTS.map((s) => <MenuItem key={s} value={s}>{cap(s)}</MenuItem>)}
            </TextField>
          </Stack>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="flex-start">
            <TextField size="small" label="Length (mm)" type="number" value={r.lengthMm ?? ''} onChange={(e) => f({ lengthMm: e.target.value })} sx={{ width: 110 }} inputProps={{ step: 0.05, min: 0 }} />
            <TextField size="small" label="Width (mm)" type="number" value={r.widthMm ?? ''} onChange={(e) => f({ widthMm: e.target.value })} sx={{ width: 110 }} inputProps={{ step: 0.05, min: 0 }} />
            <Box>
              <TextField size="small" label="Carat (ct ea)" type="number" value={r.caratEach ?? ''} onChange={(e) => f({ caratEach: e.target.value })} sx={{ width: 120 }} inputProps={{ step: 0.01, min: 0 }} />
              {compCarat != null && String(r.caratEach || '') !== String(compCarat) && (
                <Button size="small" onClick={() => f({ caratEach: String(compCarat) })} sx={{ color: REPAIRS_UI.accent, textTransform: 'none', fontSize: '0.62rem', p: 0, minWidth: 0, mt: 0.25 }}>≈ {compCarat}ct from mm — use</Button>
              )}
            </Box>
          </Stack>

          {linked ? (
            <Stack direction="row" spacing={1} alignItems="center" sx={{ p: 0.75, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 1 }}>
              <Chip size="small" label={r.source === 'gemDesign' ? 'gem design' : r.source === 'stuller' ? 'Stuller' : 'catalog'} variant="outlined" sx={{ height: 18 }} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" noWrap sx={{ color: REPAIRS_UI.textHeader }}>{r.label}</Typography>
                <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }}>{r.gemDesignId ? `cut to order · ${r.gemColor}` : r.stullerSku}</Typography>
              </Box>
              <Button size="small" onClick={unlink} sx={{ color: REPAIRS_UI.textMuted, textTransform: 'none' }}>Unlink</Button>
            </Stack>
          ) : (
            <TextField size="small" label="Unit cost (manual, $/stone)" type="number" value={r.unitCost ?? ''} onChange={(e) => f({ unitCost: e.target.value })} InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} sx={{ maxWidth: 240 }} />
          )}

          <Divider sx={{ borderColor: REPAIRS_UI.border }} />
          <StonePicker value={r.label} onPick={(p) => f(p)} />
          {err && <Alert severity="error">{err}</Alert>}

          {loading ? (
            <Stack alignItems="center" sx={{ py: 2 }}><CircularProgress size={20} sx={{ color: REPAIRS_UI.accent }} /></Stack>
          ) : (
            <Stack spacing={1.5}>
              <Box>
                <Typography variant="caption" sx={{ color: REPAIRS_UI.textSecondary, fontWeight: 600 }}>From your catalog</Typography>
                {data.catalog.length === 0
                  ? <Typography variant="body2" sx={{ color: REPAIRS_UI.textMuted, py: 0.5 }}>No catalog match yet.</Typography>
                  : <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                      {data.catalog.map((c) => (
                        <Stack key={c.stone.stoneSkuId} direction="row" alignItems="center" spacing={1} onClick={() => applyCatalog(c.stone)}
                          sx={{ p: 0.75, borderRadius: 1, cursor: 'pointer', border: `1px solid ${REPAIRS_UI.border}`, '&:hover': { borderColor: REPAIRS_UI.accent } }}>
                          <Chip size="small" label={c.confidence} sx={{ height: 18, bgcolor: 'transparent', color: CONF_COLOR[c.confidence], border: `1px solid ${CONF_COLOR[c.confidence]}` }} />
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" noWrap sx={{ color: REPAIRS_UI.textHeader }}>{c.stone.label}</Typography>
                            <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }}>{[c.stone.dimensions, c.stone.shape, c.stone.stullerSku].filter(Boolean).join(' · ')}</Typography>
                          </Box>
                          <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary }}>{money(c.stone.cost)}</Typography>
                        </Stack>
                      ))}
                    </Stack>}
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: REPAIRS_UI.textSecondary, fontWeight: 600 }}>From EFD gem designs (cut to order)</Typography>
                {(data.gemDesigns || []).length === 0
                  ? <Typography variant="body2" sx={{ color: REPAIRS_UI.textMuted, py: 0.5 }}>No in-house gem design fits.</Typography>
                  : <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                      {data.gemDesigns.map((c) => (
                        <Box key={`${c.designID}:${c.variantId}`} sx={{ p: 0.75, borderRadius: 1, border: `1px solid ${REPAIRS_UI.border}` }}>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Chip size="small" label={c.availability === 'special_request' ? 'request' : 'cut to order'} sx={{ height: 18, bgcolor: 'transparent', color: c.availability === 'special_request' ? '#FFB74D' : '#CE93D8', border: '1px solid currentColor' }} />
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography variant="body2" noWrap sx={{ color: REPAIRS_UI.textHeader }}>{c.designName} · {c.species}</Typography>
                              <Typography variant="caption" sx={{ color: c.inRange ? REPAIRS_UI.textMuted : '#EF5350' }}>
                                {[c.caratMin || c.caratMax ? `${c.caratMin ?? '?'}–${c.caratMax ?? '?'}ct` : null, c.creation === 'lab' ? 'lab' : null, c.treatment, c.remaining != null ? `${c.remaining} left` : null, c.inRange ? null : 'out of range'].filter(Boolean).join(' · ')}
                              </Typography>
                            </Box>
                          </Stack>
                          <Stack spacing={0.25} sx={{ mt: 0.5, pl: 0.5 }}>
                            {(c.colors || []).map((col) => (
                              <Stack key={col.label} direction="row" justifyContent="space-between" alignItems="center" onClick={() => c.inRange && col.price != null && applyGemDesign(c, col)}
                                sx={{ px: 0.5, py: 0.25, borderRadius: 0.75, cursor: c.inRange && col.price != null ? 'pointer' : 'default', '&:hover': c.inRange && col.price != null ? { backgroundColor: REPAIRS_UI.bgCard } : {} }}>
                                <Typography variant="body2" sx={{ color: REPAIRS_UI.textPrimary }}>{col.label}</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 600, color: col.price != null ? REPAIRS_UI.accent : REPAIRS_UI.textMuted }}>{col.price != null ? money(col.price) : 'request'}</Typography>
                              </Stack>
                            ))}
                          </Stack>
                        </Box>
                      ))}
                    </Stack>}
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: REPAIRS_UI.textSecondary, fontWeight: 600 }}>From Stuller (live, by mm)</Typography>
                {data.stuller.length === 0
                  ? <Typography variant="body2" sx={{ color: data.stullerError ? '#EF5350' : REPAIRS_UI.textMuted, py: 0.5 }}>{data.stullerError || 'No matching stones on Stuller for this size.'}</Typography>
                  : <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                      {data.stuller.map((c) => { const id = c.itemNumber || c.serialNumber; return (
                        <Stack key={id} direction="row" alignItems="center" spacing={1} onClick={() => !busy && applyStuller(c)}
                          sx={{ p: 0.75, borderRadius: 1, cursor: 'pointer', border: `1px solid ${REPAIRS_UI.border}`, opacity: busy && busy !== id ? 0.5 : 1, '&:hover': { borderColor: REPAIRS_UI.accent } }}>
                          <Chip size="small" label={c.kind === 'melee' ? 'melee' : 'certified'} sx={{ height: 18, bgcolor: 'transparent', color: c.kind === 'melee' ? '#66BB6A' : '#42A5F5', border: `1px solid ${c.kind === 'melee' ? '#66BB6A' : '#42A5F5'}` }} />
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" noWrap sx={{ color: REPAIRS_UI.textHeader }}>{c.title}</Typography>
                            <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }}>{[c.lengthMm && c.widthMm ? stoneSizeLabel({ l: c.lengthMm, w: c.widthMm }) : null, c.color, c.clarity, id, c.deviationMm != null ? `±${c.deviationMm}mm` : null].filter(Boolean).join(' · ')}</Typography>
                          </Box>
                          {busy === id ? <CircularProgress size={16} sx={{ color: REPAIRS_UI.accent }} /> : <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary }}>{money(c.price)}{c.kind === 'melee' ? '/ea' : ''}</Typography>}
                        </Stack>
                      ); })}
                    </Stack>}
              </Box>
            </Stack>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ color: REPAIRS_UI.textMuted, textTransform: 'none' }}>Cancel</Button>
        <Button onClick={() => { onSave(r); onClose(); }} variant="contained" sx={{ bgcolor: REPAIRS_UI.accent, color: '#1a1205', textTransform: 'none', '&:hover': { bgcolor: REPAIRS_UI.accent } }}>Done</Button>
      </DialogActions>
    </Dialog>
  );
}

/** Per-variant stones: center + accents, seeded from the variant's REFRAKT gem slots and
 *  linked to the gemstone catalog. Cost = unit × qty (accents priced per-stone). */
export function VariantStones({ gemstones, viewerConfig, stoneCosts = {}, gemLinks = [], gemDocs = {}, onChange }) {
  const rows = gemstones || [];
  const [editIdx, setEditIdx] = useState(null);
  const [seeding, setSeeding] = useState(false);
  const set = (i, patch) => onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const saveRow = (i, updated) => onChange(rows.map((r, idx) => (idx === i ? updated : r)));
  const remove = (i) => onChange(rows.filter((_, idx) => idx !== i));
  // Add opens the editor immediately — for handmade (no REFRAKT geometry) that's where type/cut/mm
  // get entered by hand so the catalog + Stuller match can run.
  const add = () => { onChange([...rows, { slot: '', role: 'accent', qty: '1', stoneSkuId: '', stullerSku: '', label: '', unitCost: '', caratEach: '', sizeMm: '', cut: '', creation: 'natural', preset: '', lengthMm: '', widthMm: '', source: '' }]); setEditIdx(rows.length); };
  const gemSlots = (viewerConfig?.meshMap || []).filter((s) => s.type === 'gem');
  // REFRAKT (1.11+) stamps each gem slot with its measured size (lengthMm/widthMm/carat) + cut.
  // Group by gem type + cut + size so mixed accent sizes/shapes split into sourceable rows.
  const gemGroups = (() => {
    const m = new Map();
    for (const s of gemSlots) {
      // REFRAKT 1.12+ stamps per-stone `creation` (natural|lab); group by it too so a natural center
      // + lab melee of the same size split into separate sourceable rows. Missing → natural.
      const creation = s.creation || 'natural';
      const key = `${s.gemPreset || 'gem'}|${s.cut || 'na'}|${s.carat != null ? s.carat : 'na'}|${creation}`;
      const g = m.get(key) || { slot: s.nameContains || '', preset: s.gemPreset || '', cut: s.cut || '', creation, qty: 0, carat: s.carat != null ? s.carat : '', lengthMm: s.lengthMm != null ? s.lengthMm : '', widthMm: s.widthMm != null ? s.widthMm : '', size: stoneSizeLabel({ l: s.lengthMm, w: s.widthMm }) };
      g.qty += 1;
      m.set(key, g);
    }
    return [...m.values()];
  })();
  // Assign a role per group. Name hints win; otherwise there is AT MOST ONE center — the single
  // largest (by carat) qty-1 stone — and everything else is an accent. (A design usually has one
  // focal stone or none; multiple distinct melee groups must not all read as "center".)
  const rolesFor = (groups) => {
    const byName = groups.map((g) => (
      /center|centre|main|feature|solitaire/i.test(g.slot) ? 'center'
        : /accent|melee|pave|pavé|side|halo/i.test(g.slot) ? 'accent' : null
    ));
    let centerIdx = -1;
    if (!byName.includes('center')) {
      let maxCt = -1;
      groups.forEach((g, i) => { const c = Number(g.carat) || 0; if (Number(g.qty) === 1 && c > maxCt) { maxCt = c; centerIdx = i; } });
    }
    return groups.map((g, i) => byName[i] || (i === centerIdx ? 'center' : 'accent'));
  };
  const baseRow = (g, role) => ({
    slot: g.slot, role,
    qty: String(g.qty), stoneSkuId: '', stullerSku: '', label: '', unitCost: '',
    caratEach: g.carat !== '' && g.carat != null ? String(g.carat) : '', sizeMm: g.size || '', cut: g.cut || '', creation: g.creation || 'natural',
    preset: g.preset, lengthMm: g.lengthMm !== '' && g.lengthMm != null ? String(g.lengthMm) : '', widthMm: g.widthMm !== '' && g.widthMm != null ? String(g.widthMm) : '', source: '',
  });
  // Pre-link a seeded row when its slot falls under a design-level gem link: the row inherits the
  // linked gem design (variant resolved by the slot's configured species; single color links fully
  // with a live price, multiple colors leave the pick to the modal).
  const gemLinkRow = (row) => {
    const link = gemLinks.find((l) => slotMatchesLink(row.slot, l.slot || {}));
    if (!link) return null;
    const doc = gemDocs[link.gemDesignId];
    if (!doc) return null;
    const allowed = allowedSpeciesForLink(link, doc);
    const species = String(row.preset || '').toLowerCase();
    const variant = (doc.variants || []).find((v) => v.active !== false && String(v.gemstone?.species || '').toLowerCase() === species)
      || (doc.variants || []).find((v) => v.active !== false && allowed.includes(String(v.gemstone?.species || '').toLowerCase()));
    if (!variant) return null;
    const g = variant.gemstone || {};
    const colors = (g.colors || []).filter((c) => String(c.label || '').trim());
    const one = colors.length === 1 ? colors[0] : null;
    const ct = Number(row.caratEach) || 0;
    const rate = one && ct > 0 ? tierRate(one.rates, ct) : null;
    const price = rate != null ? ((ct / gemYield(g)) * rate + (Number(g.cutLaborCost) || 0)) : null;
    return {
      ...row,
      gemDesignId: doc.designID, gemVariantId: variant.variantId, gemColor: one ? one.label : '',
      label: `${doc.name} · ${g.species}${one ? ` · ${one.label}` : ''}`,
      unitCost: price != null ? String(Math.round(price * 100) / 100) : '',
      source: 'gemDesign',
    };
  };

  // Seed the rows, then auto-link: design gem links FIRST (the declared coupling), then any row
  // that EXACTLY matches a curated catalog stone (owner's choice).
  const seed = async () => {
    const roles = rolesFor(gemGroups);
    const base = gemGroups.map((g, i) => gemLinkRow(baseRow(g, roles[i])) || baseRow(g, roles[i]));
    setSeeding(true);
    try {
      const linked = await Promise.all(base.map(async (row) => {
        if (row.source === 'gemDesign') return row; // already linked by the design's gem link
        try {
          const r = await fetch('/api/products/stones/match', { method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gemType: row.preset, cut: row.cut, creation: row.creation, carat: row.caratEach, lengthMm: row.lengthMm, widthMm: row.widthMm, includeStuller: false }) });
          const d = await r.json().catch(() => ({}));
          const top = r.ok && (d.catalog || [])[0];
          if (top && top.confidence === 'exact') {
            const s = top.stone;
            return { ...row, stoneSkuId: s.stoneSkuId || '', stullerSku: s.stullerSku || '', label: s.label || '', unitCost: s.cost != null ? String(s.cost) : '', source: 'catalog' };
          }
        } catch { /* leave unlinked */ }
        return row;
      }));
      onChange(linked);
    } finally { setSeeding(false); }
  };
  // AUTO-SEED (owner: "i dont like having to click the seed from refrakt on the variant to get the
  // gemstones, should be automatic"). REFRAKT already knows every gem slot's type, cut and size — there
  // is nothing for the user to decide, so asking was pure friction.
  //
  // Runs at most ONCE per mounted variant, tracked in a ref rather than derived from `rows`: seeding
  // calls onChange, and if a match returned nothing the rows would still be empty and the effect would
  // fire forever. The ref also means deleting every row by hand is respected instead of instantly undone.
  const autoSeeded = useRef(false);
  useEffect(() => {
    if (autoSeeded.current) return;
    if (!gemGroups.length || rows.length > 0 || seeding) return;
    autoSeeded.current = true;
    seed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gemGroups.length, rows.length, seeding]);

  const subtotal = sumStones(rows, stoneCosts);
  return (
    <Box sx={{ p: 1.5, backgroundColor: REPAIRS_UI.bgCard, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 1.5 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Typography sx={{ fontWeight: 600, color: REPAIRS_UI.textSecondary, fontSize: '0.8rem' }}>Gemstones</Typography>
        {/* Kept as a manual RE-seed: after deleting rows, or if the auto pass matched nothing. */}
        {gemGroups.length > 0 && rows.length === 0 && (
          <Button size="small" onClick={seed} disabled={seeding} startIcon={seeding ? <CircularProgress size={12} sx={{ color: REPAIRS_UI.accent }} /> : null} sx={{ color: REPAIRS_UI.accent, textTransform: 'none' }}>
            {seeding ? 'Matching…' : `Seed from REFRAKT (${gemGroups.length})`}
          </Button>
        )}
      </Stack>
      {rows.length === 0
        ? <Typography variant="body2" sx={{ color: REPAIRS_UI.textMuted, py: 0.5 }}>{seeding ? 'Reading stones from REFRAKT…' : gemGroups.length ? 'Seed from REFRAKT or add stones manually.' : 'No stones. Add the stones this variant is set with.'}</Typography>
        : (
          <Stack spacing={0.75}>
            {rows.map((r, i) => {
              const band = caratBand(r.caratEach);
              const summary = [stoneSummary(r), band ? band.label : null].filter(Boolean).join(' · ');
              return (
                <Stack key={i} direction="row" spacing={1} alignItems="center" sx={{ p: 0.75, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 1 }}>
                  <Box sx={{ flex: 1, minWidth: 0 }} onClick={() => setEditIdx(i)} style={{ cursor: 'pointer' }}>
                    <Stack direction="row" spacing={0.75} alignItems="center">
                      <Typography variant="body2" noWrap sx={{ color: r.label ? REPAIRS_UI.textHeader : REPAIRS_UI.textMuted }}>{r.label || 'No stone linked'}</Typography>
                      {r.source && <Chip size="small" label={r.source === 'gemDesign' ? 'gem design' : r.source === 'stuller' ? 'Stuller' : 'catalog'} variant="outlined" sx={{ height: 15, fontSize: '0.58rem' }} />}
                    </Stack>
                    <Typography variant="caption" noWrap sx={{ color: REPAIRS_UI.textMuted, display: 'block' }}>{summary || 'Add details →'}</Typography>
                  </Box>
                  <TextField size="small" label="Qty" type="number" value={r.qty ?? '1'} onChange={(e) => set(i, { qty: e.target.value })} sx={{ width: 62 }} inputProps={{ min: 1 }} />
                  <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary, width: 76, textAlign: 'right' }}>{money(stoneUnit(r, stoneCosts) * (Number(r.qty) || 1))}</Typography>
                  <Tooltip title="Edit stone details + match">
                    <IconButton size="small" onClick={() => setEditIdx(i)} sx={{ color: REPAIRS_UI.accent }}><EditIcon sx={{ fontSize: 16 }} /></IconButton>
                  </Tooltip>
                  <IconButton size="small" onClick={() => remove(i)} sx={{ color: REPAIRS_UI.textMuted }}><DeleteIcon sx={{ fontSize: 16 }} /></IconButton>
                </Stack>
              );
            })}
          </Stack>
        )}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1 }}>
        <Button size="small" startIcon={<AddIcon sx={{ fontSize: 16 }} />} onClick={add} sx={{ color: REPAIRS_UI.accent }}>Add stone</Button>
        <Typography variant="caption" sx={{ color: REPAIRS_UI.textSecondary }}>Stones subtotal: <b style={{ color: REPAIRS_UI.textHeader }}>{money(subtotal)}</b></Typography>
      </Stack>
      <StoneEditorModal open={editIdx != null} row={editIdx != null ? rows[editIdx] : null} onClose={() => setEditIdx(null)} onSave={(u) => saveRow(editIdx, u)} />
    </Box>
  );
}

