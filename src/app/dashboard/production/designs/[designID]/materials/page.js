'use client';

/**
 * M3-T1 — base material-tagging for a production Design. Mounts the shared <MaterialStudio>
 * (refrakt Studio) against the design's GLB; Save persists the base meshMap onto the design's
 * viewer config via PUT …/base-meshmap, which merge-PRESERVES any ConfiguratorSetup-authored
 * `customizable` block + `volumeCm3` (PM ruling #169 / refrakt #170). Sibling to the customs
 * assign-materials page — same wrapper, a design→viewer onSave adapter.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Box, CircularProgress, Typography, Button } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import MaterialStudio from '@/components/viewers/MaterialStudio';

export default function DesignMaterialsPage() {
  const { designID } = useParams();
  const router = useRouter();

  const [design, setDesign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/production/designs/${designID}`);
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
  }, [designID]);

  const back = useCallback(() => router.push('/dashboard/production/designs'), [router]);

  const glbUrl = design?.viewer?.glbUrl || null;

  // Studio emits the full JewelryViewer config on Save. Persist its meshMap onto the design's
  // viewer; the route merge-preserves customizable + volumeCm3 (base re-tag is non-destructive).
  const onSave = useCallback(async (config) => {
    try {
      const res = await fetch(`/api/production/designs/${designID}/base-meshmap`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meshMap: config?.meshMap, glbUrl: config?.glbUrl || glbUrl }),
      });
      if (!res.ok) { const data = await res.json().catch(() => ({})); throw new Error(data.error || 'Failed to save base materials'); }
    } catch (e) {
      // eslint-disable-next-line no-alert
      if (typeof window !== 'undefined') window.alert(`Save failed: ${e.message}`);
      return;
    }
    back();
  }, [designID, glbUrl, back]);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress sx={{ color: '#D4AF37' }} /></Box>;
  }
  if (error || !glbUrl) {
    return (
      <Box sx={{ p: 4 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={back} sx={{ color: '#9CA3AF', mb: 2 }}>Back to designs</Button>
        <Typography color="error">{error || 'This design has no GLB yet — upload a GLB/CAD on the design first.'}</Typography>
      </Box>
    );
  }

  return (
    <MaterialStudio
      glbUrl={glbUrl}
      initialConfig={design.viewer}
      saveLabel="Save base materials"
      onClose={back}
      onSave={onSave}
    />
  );
}
