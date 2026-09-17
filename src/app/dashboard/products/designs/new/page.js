'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Box, Typography, Button, Stack } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';
import DesignCreateStepper from '@/app/dashboard/products/drops/[dropId]/designs/DesignCreateStepper';

/** New design, with no drop attached — the same stepper the artisan side has always used.
 *  A drop can be set later; most of the catalog never belongs to one. */
export default function NewDesignPage() {
  const router = useRouter();
  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 }, maxWidth: 1000, mx: 'auto', pb: 6 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => router.push('/dashboard/products')} sx={{ color: REPAIRS_UI.textSecondary, textTransform: 'none' }}>
          Catalog
        </Button>
        <Typography sx={{ color: REPAIRS_UI.textMuted }}>/</Typography>
        <Typography sx={{ color: REPAIRS_UI.textHeader, fontWeight: 600 }}>New Design</Typography>
      </Stack>

      <DesignCreateStepper
        dropId={null}
        onSave={(created) => router.push(`/dashboard/products/designs/${created.designID}`)}
        onCancel={() => router.push('/dashboard/products')}
      />
    </Box>
  );
}
