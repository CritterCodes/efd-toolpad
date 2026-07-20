'use client';

/**
 * REFRAKT studio for assigning materials to a design's GLB. Reuses the same
 * @crittercodes/refrakt Studio as the customs assign-materials flow. Flow:
 * upload GLB on the design's CAD & 3D tab → assign here → Save writes the
 * design's designModel (glbUrl + environment/background/orientation/meshMap).
 */
import React, { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useParams, useRouter } from 'next/navigation';
import { Box, CircularProgress, Typography, Button } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const Studio = dynamic(() => import('@crittercodes/refrakt').then((m) => m.Studio), { ssr: false });

export default function DesignAssignMaterialsPage() {
  const { dropId, designId } = useParams();
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

  const glbUrl = design?.designModel?.glbUrl || null;

  // Studio emits the full JewelryViewer config on Save → persist to the design's designModel.
  const onSave = useCallback(async (config) => {
    try {
      const res = await fetch(`/api/production/designs/${designId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ designModel: { glbUrl, ...config } }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'Failed to save design model'); }
    } catch (e) {
      if (typeof window !== 'undefined') window.alert(`Save failed: ${e.message}`);
      return;
    }
    back();
  }, [designId, glbUrl, back]);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress sx={{ color: '#D4AF37' }} /></Box>;
  }
  if (error || !glbUrl) {
    return (
      <Box sx={{ p: 4 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={back} sx={{ color: '#9CA3AF', mb: 2 }}>Back to design</Button>
        <Typography color="error">{error || 'This design has no uploaded GLB yet — upload the GLB on the CAD & 3D tab first.'}</Typography>
      </Box>
    );
  }

  return (
    <Studio
      glbUrl={glbUrl}
      initialConfig={design.designModel}
      saveLabel="Save to design"
      onClose={back}
      onSave={onSave}
    />
  );
}
