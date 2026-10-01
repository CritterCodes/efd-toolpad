import { Stack, Button, CircularProgress, Chip, Typography, Box, Paper } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { directUpload } from '@/lib/directUpload';
import GemLinksPanel from './GemLinksPanel';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import { JewelryViewer, PanelTitle, panelSx } from './designShared';
export function CadUploadRow({ label, accept, hint, done, uploading, onPick }) {
  return (
    <Stack direction="row" alignItems="center" spacing={2} sx={{ py: 0.75, flexWrap: 'wrap', useFlexGap: true }}>
      <Button
        component="label" size="small" variant="outlined" disabled={uploading}
        startIcon={uploading ? <CircularProgress size={14} /> : <UploadFileIcon sx={{ fontSize: 16 }} />}
        sx={{ color: done ? '#66BB6A' : REPAIRS_UI.accent, borderColor: done ? '#66BB6A' : REPAIRS_UI.border, textTransform: 'none' }}
      >
        {uploading ? 'Uploading…' : (done ? `Replace ${label}` : `Upload ${label}`)}
        <input type="file" hidden accept={accept} onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f); if (e.target) e.target.value = ''; }} />
      </Button>
      {done
        ? <Chip size="small" icon={<CheckCircleIcon sx={{ fontSize: 14 }} />} label="Uploaded" sx={{ backgroundColor: '#66BB6A22', color: '#66BB6A', fontWeight: 700, '& .MuiChip-icon': { color: '#66BB6A' } }} />
        : <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }}>{hint}</Typography>}
    </Stack>
  );
}

export function CadTab({ design, designId, dropId, onReload, notify, onCreateFirstVariant, form, setField }) {
  const router = useRouter();
  const [busyStl, setBusyStl] = useState(false);
  const [busyGlb, setBusyGlb] = useState(false);
  const isGem = form.category === 'gemstone';
  const dm = design.designModel || {};
  const glbUrl = dm.glbUrl || null;
  // The preview shows the FIRST variant's look — that first variant is the design's
  // default. Materials live on variants (built in REFRAKT), so there's nothing to preview
  // until a variant has been configured.
  const firstConfigured = (design.variants || []).find((v) => v.viewerConfig);

  /**
   * DIRECT to MinIO via a signed PUT — the bytes never pass through a serverless function, whose
   * request body is capped at ~4.5 MB. That cap is why a 91 MB manufacturing STL failed here while the
   * far smaller GLB of the same model succeeded. The STL is what Carrera casts from, so it can't be
   * shrunk to fit; the transport had to change.
   */
  // Resolves { url, key }. The key comes from the presign response; never re-derive it from the url.
  const uploadAsset = async (file) => directUpload(file, { scope: 'design', id: designId });

  const patch = async (fields) => {
    const res = await fetch(`/api/production/designs/${designId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fields) });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Save failed');
  };
  const onStl = async (file) => {
    setBusyStl(true);
    try {
      // Direct to MinIO — this is the MANUFACTURING file Carrera casts from (a real one is 91 MB) and a
      // serverless request body caps at ~4.5 MB.
      const { url, key } = await uploadAsset(file);

      // GEMSTONE designs: the viewer GLB is GENERATED from the same solid (one mesh named 'Gemstone',
      // flat facet normals, mm→m; the look comes from the variant's REFRAKT preset). Jewelry never
      // auto-generates — its GLBs need authored, named parts. A GLB is a rendering asset with no
      // bearing on price, so generating it in the browser is fine.
      let glbUrl = null;
      if (isGem) {
        try {
          const { stlToGlb } = await import('@/lib/stlToGlb');
          const blob = await stlToGlb(file);
          const glbFile = new File([blob], `${(form.name || 'gemstone').replace(/[^a-z0-9-]+/gi, '-').toLowerCase()}.glb`, { type: 'model/gltf-binary' });
          glbUrl = (await uploadAsset(glbFile)).url;
        } catch { /* best-effort — the STL still lands; a GLB can be uploaded by hand */ }
      }

      // VOLUME IS MEASURED SERVER-SIDE from the stored object. It sets the mounting cost and therefore
      // the retail price, so it must not be a number this browser computed — and the parser would
      // struggle on a 1.9M-triangle model anyway. The generic design PUT refuses stlVolumeCm3.
      const res = await fetch(`/api/production/designs/${designId}/attach-stl`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, key, glbUrl }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not attach the STL');

      notify([
        data.stlVolumeCm3 != null ? `STL uploaded · volume ${data.stlVolumeCm3} cm³` : 'STL uploaded · volume not calculated',
        glbUrl ? '· viewer GLB generated' : null,
      ].filter(Boolean).join(' '), 'success');
      onReload();
    } catch (e) { notify(e.message, 'error'); } finally { setBusyStl(false); }
  };
  const onGlb = async (file) => {
    setBusyGlb(true);
    try {
      const { url } = await uploadAsset(file);
      await patch({ designModel: { ...dm, glbUrl: url } });
      notify('GLB uploaded', 'success');
      onReload();
    } catch (e) { notify(e.message, 'error'); } finally { setBusyGlb(false); }
  };

  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={{ xs: 0, md: 3 }} alignItems="flex-start">
      <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
        <Paper sx={panelSx}>
          <PanelTitle>CAD files</PanelTitle>
          <CadUploadRow label="STL" accept=".stl" hint={isGem ? 'Volume calibrates carat (× SG) AND the viewer GLB is generated from this solid.' : 'Volume is calculated from the STL.'} done={!!design.stlUrl} uploading={busyStl} onPick={onStl} />
          <Box sx={{ pl: 0.5, mt: 1 }}>
            <Typography sx={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: REPAIRS_UI.textSecondary, mb: 0.25 }}>CAD volume</Typography>
            <Typography sx={{ color: design.stlVolumeCm3 != null ? REPAIRS_UI.textHeader : REPAIRS_UI.textMuted, fontSize: '1rem', fontWeight: 600 }}>
              {design.stlVolumeCm3 != null ? `${design.stlVolumeCm3} cm³` : 'Not calculated yet'}
            </Typography>
            <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }}>Calculated automatically from the uploaded STL — never typed.</Typography>
          </Box>
          <Box sx={{ borderTop: `1px solid ${REPAIRS_UI.border}`, my: 1.5 }} />
          <CadUploadRow label="GLB" accept=".glb" hint={isGem ? 'Optional override — the GLB is auto-generated from the STL; upload only for a hand-tuned model.' : 'The 3D mesh every variant renders — build each look on the Variants tab.'} done={!!glbUrl} uploading={busyGlb} onPick={onGlb} />
        </Paper>
        {/* Design-level gem links (jewelry only): declared BEFORE variants so seeding pre-links
            stone rows and the studio can constrain the slot's species to the cutter's variants. */}
        {!isGem && <GemLinksPanel design={design} designId={designId} notify={notify} onReload={onReload} />}
      </Box>

      <Box sx={{ width: { xs: '100%', md: 420 }, flexShrink: 0 }}>
        <Paper sx={panelSx}>
          <PanelTitle>3D preview</PanelTitle>
          {firstConfigured ? (
            <>
              <Box sx={{ height: 360, borderRadius: 2, overflow: 'hidden', border: `1px solid ${REPAIRS_UI.border}` }}>
                <JewelryViewer glbUrl={glbUrl} config={firstConfigured.viewerConfig} style={{ width: '100%', height: '100%' }} />
              </Box>
              <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted, display: 'block', mt: 1 }}>
                Drag to orbit · scroll to zoom. Showing the default (first) variant — build every look on the Variants tab.
              </Typography>
            </>
          ) : (
            <Box sx={{ minHeight: 360, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1.5, backgroundColor: REPAIRS_UI.bgTertiary, border: `1px dashed ${REPAIRS_UI.border}`, borderRadius: 2, p: 3, textAlign: 'center' }}>
              <ViewInArIcon sx={{ fontSize: 40, color: REPAIRS_UI.textMuted }} />
              {!glbUrl ? (
                <Typography variant="body2" sx={{ color: REPAIRS_UI.textMuted }}>
                  Upload a GLB, then build your first variant in REFRAKT to set the default look.
                </Typography>
              ) : (
                <>
                  <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary }}>
                    No variant yet. Build your first one in REFRAKT — it becomes this design’s default look.
                  </Typography>
                  <Button variant="contained" startIcon={<ViewInArIcon sx={{ fontSize: 16 }} />} onClick={onCreateFirstVariant}
                    sx={{ backgroundColor: REPAIRS_UI.accent, color: '#1A1A1A', fontWeight: 600, textTransform: 'none', '&:hover': { backgroundColor: '#C19B2E' } }}>
                    Create first variant
                  </Button>
                </>
              )}
            </Box>
          )}
        </Paper>

        {/* Customization is a DESIGN-level capability (not per-variant): which parts of the model
            can a shopper change, to what, and what does each option COST. That is authored on the
            Customizer screen — a boolean here never made a design customizable, because the
            pricing endpoint and the storefront both read the authored per-slot
            `viewer.meshMap[].customizable` blocks, not a flag. */}
        <Paper sx={panelSx}>
          <PanelTitle>Customization</PanelTitle>
          {(() => {
            const slots = (design?.viewer?.meshMap || []).filter((sl) => sl?.customizable);
            const unbound = slots.filter((sl) => {
              const key = sl.type === 'gem' ? 'gemPreset' : 'finish';
              const opts = sl.customizable?.options || [];
              return opts.some((o) => !o?.binding || (sl.type === 'gem'
                ? !(o.binding.gemstoneId || (o.binding.materialRef && Number(o.binding.carat) > 0))
                : !o.binding.metalKey)) || !opts.length || !key;
            });
            return (
              <>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1, flexWrap: 'wrap', gap: 1 }}>
                  <Chip
                    size="small"
                    label={slots.length ? `${slots.length} customizable part${slots.length === 1 ? '' : 's'}` : 'Not customizable'}
                    sx={{ backgroundColor: slots.length ? '#66BB6A22' : REPAIRS_UI.bgCard, color: slots.length ? '#66BB6A' : REPAIRS_UI.textMuted, fontWeight: 700 }}
                  />
                  {unbound.length > 0 && (
                    <Chip size="small" label={`${unbound.length} need a cost binding`} sx={{ backgroundColor: '#FFB74D22', color: '#FFB74D', fontWeight: 700 }} />
                  )}
                </Stack>
                <Button
                  variant={slots.length ? 'outlined' : 'contained'}
                  disabled={!glbUrl}
                  onClick={() => router.push(`/dashboard/products/drops/${design?.dropId || dropId}/designs/${designId}/customize`)}
                  sx={slots.length
                    ? { color: REPAIRS_UI.accent, borderColor: REPAIRS_UI.accent, textTransform: 'none' }
                    : { backgroundColor: REPAIRS_UI.accent, color: '#1A1A1A', fontWeight: 600, textTransform: 'none', '&:hover': { backgroundColor: '#C19B2E' } }}
                >
                  {slots.length ? 'Edit customizer options' : 'Set up the customizer'}
                </Button>
                <Typography variant="caption" sx={{ color: glbUrl ? REPAIRS_UI.textMuted : '#FFB74D', display: 'block', mt: 1 }}>
                  {!glbUrl
                    ? 'Upload a GLB to enable the customizer.'
                    : slots.length
                      ? 'Shoppers open REFRAKT and change these parts, starting from the default look — every customized order is made-to-order. Options without a cost binding are refused at checkout.'
                      : 'Choose which parts of the model a shopper may change, the presets allowed for each, and bind every option to a real cost.'}
                </Typography>
              </>
            );
          })()}
        </Paper>
      </Box>
    </Stack>
  );
}

