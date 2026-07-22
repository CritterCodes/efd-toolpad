'use client';

import React, { use } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Typography, Button, Stack } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';
import DesignCreateStepper from '@/app/dashboard/products/drops/[dropId]/designs/DesignCreateStepper';

export default function NewDesignPage({ params }) {
  const router = useRouter();
  const { dropId } = use(params);

  const handleSave = (created) => {
    // Land on the design detail page — where the rich spec (gem/metal, GLB, variants, pricing) is authored.
    router.push(`/dashboard/products/drops/${dropId}/designs/${created.designID}`);
  };

  return (
    <Box sx={{ pb: 6 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => router.push(`/dashboard/products/drops/${dropId}`)} sx={{ color: REPAIRS_UI.textSecondary }}>
          Drop
        </Button>
        <Typography sx={{ color: REPAIRS_UI.textMuted }}>/</Typography>
        <Typography sx={{ color: REPAIRS_UI.textHeader, fontWeight: 600 }}>New Design</Typography>
      </Stack>

      <DesignCreateStepper
        dropId={dropId}
        onSave={handleSave}
        onCancel={() => router.push(`/dashboard/products/drops/${dropId}`)}
      />
    </Box>
  );
}
