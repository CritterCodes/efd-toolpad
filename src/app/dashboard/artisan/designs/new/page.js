'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Box, Typography, Button, Stack } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';
import DesignCreateStepper from '@/app/dashboard/products/drops/[dropId]/designs/DesignCreateStepper';

/** Artisan self-service create — the same guided stepper, no drop (staff can attach one later).
 *  The API credits the design to the signed-in artisan and gates category by artisan type. */
export default function ArtisanNewDesignPage() {
  const router = useRouter();
  return (
    <Box sx={{ pb: 6 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => router.push('/dashboard/artisan/designs')} sx={{ color: REPAIRS_UI.textSecondary }}>
          My Designs
        </Button>
        <Typography sx={{ color: REPAIRS_UI.textMuted }}>/</Typography>
        <Typography sx={{ color: REPAIRS_UI.textHeader, fontWeight: 600 }}>New Design</Typography>
      </Stack>

      <DesignCreateStepper
        dropId={null}
        onSave={(created) => router.push(`/dashboard/artisan/designs/${created.designID}`)}
        onCancel={() => router.push('/dashboard/artisan/designs')}
      />
    </Box>
  );
}
