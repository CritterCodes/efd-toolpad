'use client';

/**
 * REFRAKT studio for building/editing ONE variant's look. Variants are "built with
 * REFRAKT": you pick the finish/gems visually on the design's GLB, and Save stores the
 * variant's viewerConfig (meshMap). Finish is derived from that config; karat + SKU are
 * separate spec fields on the Variants tab (REFRAKT doesn't know karat). Reuses the same
 * @crittercodes/refrakt Studio as the design/customs material flows.
 */
import React, { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useParams, useRouter } from 'next/navigation';
import { Box, CircularProgress, Typography, Button } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { deriveFinish, composeMetalKey } from '@/services/production/variantMetal';

const Studio = dynamic(() => import('@crittercodes/refrakt').then((m) => m.Studio), { ssr: false });

export default function VariantConfigurePage() {
  const { dropId, designId, variantId } = useParams();
  const router = useRouter();
  const [design, setDesign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/production/designs/${designId}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Failed to load design');
        if (!cancelled) setDesign(data);
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [designId]);

  const back = useCallback(() => router.push(`/dashboard/products/drops/${dropId}/designs/${designId}`), [router, dropId, designId]);

  const variant = (design?.variants || []).find((v) => v.variantId === variantId) || null;
  const glbUrl = design?.designModel?.glbUrl || null;
  const initialConfig = variant?.viewerConfig || design?.designModel || null;

  // Studio emits the full viewer config on Save → store it on THIS variant, and derive
  // finish → recompose the pricing metalKey (karat stays whatever the variant has).
  const onSave = useCallback(async (config) => {
    try {
      const finish = deriveFinish(config);
      const nextVariants = (design.variants || []).map((v) => (
        v.variantId === variantId
          ? { ...v, viewerConfig: config, finish, metalKey: composeMetalKey(finish, v.karat) }
          : v
      ));
      const res = await fetch(`/api/production/designs/${designId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variants: nextVariants }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'Failed to save variant look'); }
    } catch (e) {
      if (typeof window !== 'undefined') window.alert(`Save failed: ${e.message}`);
      return;
    }
    back();
  }, [design, designId, variantId, back]);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress sx={{ color: '#D4AF37' }} /></Box>;
  }
  if (error || !variant || !glbUrl) {
    return (
      <Box sx={{ p: 4 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={back} sx={{ color: '#9CA3AF', mb: 2 }}>Back to design</Button>
        <Typography color="error">
          {error || (!variant ? 'Variant not found.' : 'This design has no uploaded GLB yet — upload the GLB on the CAD & 3D tab first.')}
        </Typography>
      </Box>
    );
  }

  return (
    <Studio
      glbUrl={glbUrl}
      initialConfig={initialConfig}
      saveLabel="Save variant look"
      onClose={back}
      onSave={onSave}
    />
  );
}
