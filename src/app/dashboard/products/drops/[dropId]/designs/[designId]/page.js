'use client';

import React, { useEffect, useState, useCallback, useMemo, use } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Typography, Button, Chip, Stack, Paper, CircularProgress, Snackbar, Alert, Tooltip } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DesignServicesIcon from '@mui/icons-material/DesignServices';
import StorefrontIcon from '@mui/icons-material/Storefront';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';

import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';
import { composeMetalKey } from '@/services/production/variantMetal';
import { STATUS_COLOR, artisanId, artisanLabel, cap, newVariantForm, nextVariantSeq, toForm } from './designShared';
import { DetailsTab } from './DetailsTab';
import { CadTab } from './CadTab';
import { VariantsTab } from './VariantsTab';
import { PricingTab } from './PricingTab';
import { buildDesignSaveBody, designFormProblem } from './designSaveBody';
export { nextVariantSeq } from './designShared';

export default function DesignDetailPage({ params }) {
  const { dropId, designId } = use(params);
  return <DesignDetail dropId={dropId} designId={designId} />;
}

/** The full design editor, reusable outside the drop route (e.g. the artisan "My Designs"
 *  surface passes its own back target). `backHref`/`backLabel` default to the drop. */
export function DesignDetail({ dropId, designId, backHref, backLabel }) {
  const router = useRouter();
  const [design, setDesign] = useState(null);
  const [form, setForm] = useState(null);
  const [artisans, setArtisans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [defaultMarkup, setDefaultMarkup] = useState(2.5);
  const [stoneCosts, setStoneCosts] = useState({}); // { stoneSkuId: current wholesale cost }
  const [gemDocs, setGemDocs] = useState({}); // { gemDesignId: gem Design doc } — linked in-house gems
  // Tab order: 0 Details · 1 CAD & 3D · 2 Variants · 3 Pricing.
  // Honour ?tab= so a round trip can return where it started — the REFRAKT studio comes back here after
  // saving a variant, and used to dump the user on Details, which read as the save not registering.
  const [tab, setTab] = useState(() => {
    if (typeof window === 'undefined') return 0;
    const want = new URLSearchParams(window.location.search).get('tab');
    return { details: 0, cad: 1, variants: 2, pricing: 3 }[want] ?? 0;
  });
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });
  const [listing, setListing] = useState(false);
  const [listedProductRef, setListedProductRef] = useState(null); // Mongo _id of the listed product (editor routes key on it)
  const notify = (message, severity = 'success') => setSnack({ open: true, message, severity });
  const closeSnack = () => setSnack((s) => ({ ...s, open: false }));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/production/designs/${designId}`);
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Design not found');
      const d = await res.json();
      setDesign(d);
      setForm(toForm(d));
    } catch (e) { notify(e.message, 'error'); } finally { setLoading(false); }
  }, [designId]);

  useEffect(() => {
    load();
    fetch('/api/users?role=artisan').then((r) => r.json())
      .then((d) => setArtisans(Array.isArray(d) ? d : (d.data || d.users || [])))
      .catch(() => {});
    fetch('/api/admin/settings').then((r) => (r.ok ? r.json() : null)).then((s) => {
      const m = Number(s?.financial?.cogMarkup ?? s?.data?.financial?.cogMarkup);
      if (m > 0) setDefaultMarkup(m);
    }).catch(() => {});
    // Current wholesale cost per stone SKU (kept fresh by the cron) — read live into pricing.
    fetch('/api/products/stones').then((r) => (r.ok ? r.json() : null)).then((d) => {
      const map = {};
      for (const s of (d?.stones || [])) if (s.stoneSkuId) map[s.stoneSkuId] = Number(s.cost) || 0;
      setStoneCosts(map);
    }).catch(() => {});
  }, [load]);

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setPricing = (v) => setForm((f) => ({ ...f, pricing: v }));
  const updateVariant = (i, patch) => setForm((f) => ({
    ...f,
    variants: f.variants.map((v, idx) => {
      if (idx !== i) return v;
      const merged = { ...v, ...patch };
      // Keep the pricing metalKey in sync whenever finish or karat changes.
      if ('finish' in patch || 'karat' in patch) merged.metalKey = composeMetalKey(merged.finish, merged.karat);
      return merged;
    }),
  }));
  const removeVariant = (i) => setForm((f) => ({ ...f, variants: f.variants.filter((_, idx) => idx !== i) }));

  // Prefer the design's real drop for nested routes — the artisan surface mounts this component
  // with a placeholder dropId, but the design may genuinely belong to a drop.
  const configurePath = (variantId) => `/dashboard/products/drops/${design?.dropId || dropId}/designs/${designId}/variants/${variantId}/configure`;

  // "Configure look" needs the variant persisted first (the studio is a separate route
  // that reads from the DB). Save pending edits, then navigate.
  const configureVariant = async (i) => {
    if (!design.designModel?.glbUrl) { notify('Upload a GLB on the CAD & 3D tab first.', 'error'); return; }
    const v = form.variants[i];
    if (dirty) { const ok = await save(); if (!ok) return; }
    router.push(configurePath(v.variantId));
  };

  // "Add variant" (studio-driven): append a stub with an auto-SKU, persist, then open the
  // studio to build the look.
  const addAndConfigureVariant = async () => {
    const isGem = form.category === 'gemstone';
    // Jewelry variants are looks built in REFRAKT (need the GLB); a gemstone variant is a
    // material spec (species/carat/…) edited right on the row — no model required.
    if (!isGem && !design.designModel?.glbUrl) { notify('Upload a GLB on the CAD & 3D tab first — variants are built in REFRAKT.', 'error'); return; }
    const v = newVariantForm();
    const base = (form.name || design.name || 'VAR').toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 12) || 'VAR';
    // Sequence comes from the EXISTING variants, so it keeps counting across page reloads instead of
    // restarting at 1 and colliding with a SKU that's already there.
    v.sku = `${base}-${nextVariantSeq(form.variants)}`;
    if (form.category === 'ring') v.ringSize = '7'; // sensible default so the stub can persist; editable on the row
    v.active = false; // stub starts inactive until its look is built + specs confirmed
    const nextForm = { ...form, variants: [...form.variants, v] };
    setForm(nextForm);
    if (isGem) return; // stays a local edit — fill the stone spec, then Save
    const ok = await save(nextForm);
    if (ok) router.push(configurePath(v.variantId));
  };

  // CAD tab's "Create first variant": configure the first EXISTING variant if there is one
  // (avoid piling up stubs when a studio session was abandoned); otherwise create + open one.
  const configureFirstVariant = () => (form.variants.length ? configureVariant(0) : addAndConfigureVariant());

  const dirty = useMemo(() => {
    if (!design || !form) return false;
    return JSON.stringify(form) !== JSON.stringify(toForm(design));
  }, [design, form]);

  const discard = () => setForm(toForm(design));

  const save = async (f = form) => {
    const problem = designFormProblem(f);
    if (problem) { notify(problem, 'error'); return false; }
    setSaving(true);
    try {
      const body = buildDesignSaveBody(f, { design, stoneCosts });
      const res = await fetch(`/api/production/designs/${designId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Save failed');
      notify('Saved', 'success');
      await load();
      return true;
    } catch (e) { notify(e.message, 'error'); return false; } finally { setSaving(false); }
  };

  // Resolve the listed product's Mongo _id (the catalog editor routes key on _id, the design
  // back-link stores the public productId).
  useEffect(() => {
    if (!design?.productID) { setListedProductRef(null); return; }
    let cancelled = false;
    fetch(`/api/products?productId=${encodeURIComponent(design.productID)}&limit=1`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled) setListedProductRef(d?.products?.[0]?._id || null); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [design?.productID]);

  // "List design" — turn this design into a draft product (the design→listing bridge).
  // Server enforces staff-or-owning-artisan; publish stays a separate transition on the listing.
  const listDesign = async () => {
    if (dirty) { const ok = await save(); if (!ok) return; }
    setListing(true);
    try {
      const res = await fetch(`/api/production/designs/${designId}/list-concept`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || 'Listing failed');
      if (d.product?._id) setListedProductRef(d.product._id);
      notify(
        d.contractWarnings?.length
          ? `Listed as a draft — still needed before publish: ${d.contractWarnings.join('; ')}`
          : 'Listed as a draft product',
        d.contractWarnings?.length ? 'warning' : 'success',
      );
      await load();
    } catch (e) { notify(e.message, 'error'); } finally { setListing(false); }
  };

  // Load the gem Designs this jewelry's stone rows link to (Phase 2) — powers the buildable
  // rollup caption; enforcement lands in Phase 3.
  useEffect(() => {
    const ids = [...new Set([
      ...(design?.variants || []).flatMap((v) => (v.gemstones || []).map((g) => g.gemDesignId)),
      ...(design?.gemLinks || []).map((l) => l.gemDesignId),
    ].filter(Boolean))];
    if (!ids.length) { setGemDocs({}); return; }
    let cancelled = false;
    Promise.all(ids.map((id) => fetch(`/api/production/designs/${id}`).then((r) => (r.ok ? r.json() : null)).catch(() => null)))
      .then((docs) => { if (!cancelled) setGemDocs(Object.fromEntries(docs.filter(Boolean).map((d) => [d.designID, d]))); });
    return () => { cancelled = true; };
  }, [design]);

  const backToDrop = () => router.push(backHref || `/dashboard/products/drops/${dropId}`);
  const backText = backLabel || 'Back to drop';
  const artisanName = (id) => { const a = artisans.find((x) => artisanId(x) === id); return a ? artisanLabel(a) : id; };

  if (loading || !form) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress sx={{ color: REPAIRS_UI.accent }} /></Box>;
  if (!design) {
    return (
      <Box sx={{ p: 3 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={backToDrop} sx={{ color: REPAIRS_UI.textSecondary, mb: 2 }}>{backText}</Button>
        <Typography color="error">Design not found.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 6 }}>
      {/* Sticky unsaved-changes bar (Shopify-style) */}
      {dirty && (
        <Box sx={{ position: 'sticky', top: 0, zIndex: 20, mb: 2 }}>
          <Paper sx={{ p: 1.5, backgroundColor: REPAIRS_UI.bgCard, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.accent}`, borderRadius: 2, boxShadow: REPAIRS_UI.shadow }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
              <Typography sx={{ color: REPAIRS_UI.textPrimary, fontWeight: 600, fontSize: '0.9rem' }}>Unsaved changes</Typography>
              <Stack direction="row" spacing={1}>
                <Button size="small" onClick={discard} disabled={saving} sx={{ color: REPAIRS_UI.textSecondary, textTransform: 'none' }}>Discard</Button>
                <Button size="small" variant="contained" onClick={() => save()} disabled={saving || !form.name.trim() || !form.primaryArtisanId}
                  startIcon={saving ? <CircularProgress size={14} sx={{ color: '#1A1A1A' }} /> : null}
                  sx={{ backgroundColor: REPAIRS_UI.accent, color: '#1A1A1A', fontWeight: 600, textTransform: 'none', '&:hover': { backgroundColor: '#C19B2E' } }}>
                  {saving ? 'Saving…' : 'Save'}
                </Button>
              </Stack>
            </Stack>
          </Paper>
        </Box>
      )}

      {/* Header */}
      <Box sx={{ backgroundColor: { xs: 'transparent', sm: REPAIRS_UI.bgPanel }, border: { xs: 'none', sm: `1px solid ${REPAIRS_UI.border}` }, borderRadius: { xs: 0, sm: 3 }, boxShadow: { xs: 'none', sm: REPAIRS_UI.shadow }, p: { xs: 0.5, sm: 2.5, md: 3 }, mb: 3 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={backToDrop} sx={{ color: REPAIRS_UI.textSecondary, mb: 1.5, pl: 0 }}>{backText}</Button>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, px: 1.25, py: 0.5, mb: 1.5, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', color: REPAIRS_UI.textPrimary, backgroundColor: REPAIRS_UI.bgCard, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, textTransform: 'uppercase' }}>
              <DesignServicesIcon sx={{ fontSize: 16, color: REPAIRS_UI.accent }} /> Design
            </Typography>
            <Typography component="h1" sx={{ fontSize: { xs: 26, md: 32 }, fontWeight: 600, color: REPAIRS_UI.textHeader, mb: 0.5 }}>{design.name || 'Untitled design'}</Typography>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              {design.category && <Typography sx={{ color: REPAIRS_UI.textSecondary, textTransform: 'capitalize' }}>{cap(design.category)}</Typography>}
              {design.primaryArtisanId && <Typography sx={{ color: REPAIRS_UI.textMuted, fontSize: '0.85rem' }}>· {artisanName(design.primaryArtisanId)}</Typography>}
            </Stack>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center" flexShrink={0}>
            {design.productID ? (
              <Tooltip title={listedProductRef ? `Listed as ${design.productID}` : 'Resolving the listing…'}>
                <span>
                  <Button size="small" variant="outlined" startIcon={<StorefrontIcon />} disabled={!listedProductRef}
                    onClick={() => router.push(`/dashboard/products/${listedProductRef}`)}
                    sx={{ color: REPAIRS_UI.accent, borderColor: `${REPAIRS_UI.accent}66`, textTransform: 'none', fontWeight: 600, '&:hover': { borderColor: REPAIRS_UI.accent } }}>
                    View listing
                  </Button>
                </span>
              </Tooltip>
            ) : (
              <Button size="small" variant="outlined" onClick={listDesign} disabled={listing || saving}
                startIcon={listing ? <CircularProgress size={14} sx={{ color: REPAIRS_UI.accent }} /> : <StorefrontIcon />}
                sx={{ color: REPAIRS_UI.accent, borderColor: `${REPAIRS_UI.accent}66`, textTransform: 'none', fontWeight: 600, '&:hover': { borderColor: REPAIRS_UI.accent } }}>
                {listing ? 'Listing…' : 'List design'}
              </Button>
            )}
            <Chip label={cap(design.status || 'draft')} sx={{ backgroundColor: `${STATUS_COLOR[design.status] || REPAIRS_UI.textMuted}22`, color: STATUS_COLOR[design.status] || REPAIRS_UI.textMuted, fontWeight: 700, textTransform: 'capitalize', flexShrink: 0 }} />
          </Stack>
        </Stack>
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile
        sx={{ mb: 2, borderBottom: `1px solid ${REPAIRS_UI.border}`, '& .MuiTab-root': { color: REPAIRS_UI.textSecondary, textTransform: 'none', fontWeight: 600 }, '& .Mui-selected': { color: REPAIRS_UI.accent }, '& .MuiTabs-indicator': { backgroundColor: REPAIRS_UI.accent } }}>
        <Tab label="Details" />
        <Tab label="CAD & 3D" />
        <Tab label="Variants" />
        <Tab label="Pricing" />
      </Tabs>

      {tab === 0 && <DetailsTab form={form} setField={setField} artisans={artisans} />}
      {tab === 1 && <CadTab design={design} designId={designId} dropId={dropId} onReload={load} notify={notify} onCreateFirstVariant={configureFirstVariant} form={form} setField={setField} />}
      {tab === 2 && (
        <VariantsTab
          variants={form.variants}
          category={form.category}
          hasGlb={!!design.designModel?.glbUrl}
          stoneCosts={stoneCosts}
          gemLinks={design.gemLinks || []}
          gemDocs={gemDocs}
          onAdd={addAndConfigureVariant}
          onUpdate={updateVariant}
          onRemove={removeVariant}
          onConfigure={configureVariant}
        />
      )}
      {tab === 3 && (
        <PricingTab
          pricing={form.pricing}
          variants={form.variants}
          category={form.category}
          gemDocs={gemDocs}
          stlVolumeCm3={design.stlVolumeCm3}
          defaultMarkup={defaultMarkup}
          artisanFee={Number(artisans.find((a) => artisanId(a) === form.primaryArtisanId)?.artisanApplication?.customDesignFee) || 0}
          artisanName={form.primaryArtisanId ? artisanName(form.primaryArtisanId) : ''}
          editionType={form.editionType}
          editionLimit={form.editionLimit}
          productionMethod={form.productionMethod}
          stoneCosts={stoneCosts}
          onChange={setPricing}
          onVariantChange={updateVariant}
        />
      )}

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={closeSnack} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={closeSnack} severity={snack.severity} sx={{ backgroundColor: REPAIRS_UI.bgCard, color: REPAIRS_UI.textPrimary, border: `1px solid ${REPAIRS_UI.border}` }}>{snack.message}</Alert>
      </Snackbar>
    </Box>
  );
}
