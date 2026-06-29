'use client';

/**
 * Standalone "studio" page for assigning materials to a custom order's GLB, launched
 * from the GLB work order on the bench. Flow: upload GLB → assign materials here →
 * Save sends the work order to QC. The GLB url + any prior meshMap come from the
 * order's designModel (uploadCadGlb writes designModel.glbUrl).
 */

import React, { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Box, CircularProgress, Typography, Button } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

// The packaged REFRAKT Studio — full-screen WebGL editor; never SSR.
const Studio = dynamic(() => import('@crittercodes/refrakt').then((m) => m.Studio), { ssr: false });

export default function AssignMaterialsPage() {
  const { customID } = useParams();
  const router = useRouter();
  const search = useSearchParams();
  const workOrderID = search.get('wo');

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/custom-orders/${customID}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Failed to load custom order');
        if (!cancelled) setOrder(data.order || data);
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [customID]);

  const back = useCallback(() => router.push('/dashboard/repairs/my-bench'), [router]);

  const glbUrl = order?.designModel?.glbUrl || null;

  // Studio emits the full JewelryViewer config on Save. Persist it to the design
  // model, then (if launched from a GLB work order) submit that work order to QC.
  const onSave = useCallback(async (config) => {
    try {
      const res = await fetch(`/api/custom-orders/${customID}/design-model`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ glbUrl, ...config }) });
      if (!res.ok) { const data = await res.json().catch(() => ({})); throw new Error(data.error || 'Failed to save design model'); }
    } catch (e) {
      // eslint-disable-next-line no-alert
      if (typeof window !== 'undefined') window.alert(`Save failed: ${e.message}`);
      return;
    }
    if (workOrderID) {
      try {
        const res = await fetch(`/api/bench/work-orders/${workOrderID}/cad-submit-qc`, { method: 'POST' });
        if (!res.ok) { const data = await res.json().catch(() => ({})); throw new Error(data.error || 'Could not submit to QC'); }
      } catch (e) {
        // Materials saved, but the QC transition failed — surface it and stay.
        // eslint-disable-next-line no-alert
        if (typeof window !== 'undefined') window.alert(`Materials saved, but: ${e.message}`);
        return;
      }
    }
    back();
  }, [customID, glbUrl, workOrderID, back]);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress sx={{ color: '#D4AF37' }} /></Box>;
  }
  if (error || !glbUrl) {
    return (
      <Box sx={{ p: 4 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={back} sx={{ color: '#9CA3AF', mb: 2 }}>Back to bench</Button>
        <Typography color="error">{error || 'This custom order has no uploaded GLB yet — upload the GLB on the work order first.'}</Typography>
      </Box>
    );
  }

  return (
    <Studio
      glbUrl={glbUrl}
      initialConfig={order.designModel}
      saveLabel={workOrderID ? 'Save & send to QC' : 'Save to design model'}
      onClose={back}
      onSave={onSave}
    />
  );
}
