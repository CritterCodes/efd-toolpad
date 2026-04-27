"use client";
import { useEffect } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useRouter } from 'next/navigation';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';

export default function QualityControlDetailPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/repairs/move');
  }, [router]);

  return (
    <Box sx={{ minHeight: 320, display: 'flex', flexDirection: 'column', gap: 1.5, alignItems: 'center', justifyContent: 'center' }}>
      <CircularProgress sx={{ color: REPAIRS_UI.accent }} />
      <Typography sx={{ color: REPAIRS_UI.textSecondary }}>
        QC review now happens through Move. Redirecting...
      </Typography>
    </Box>
  );
}
