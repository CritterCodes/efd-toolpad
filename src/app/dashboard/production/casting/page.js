'use client';

import React from 'react';
import { Box, Typography, Paper, Stack, Chip } from '@mui/material';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import ConstructionIcon from '@mui/icons-material/Construction';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';

export default function CastingPage() {
  return (
    <Box sx={{ pb: 6 }}>
      <Box sx={{
        backgroundColor: { xs: 'transparent', sm: REPAIRS_UI.bgPanel },
        border: { xs: 'none', sm: `1px solid ${REPAIRS_UI.border}` },
        borderRadius: { xs: 0, sm: 3 },
        boxShadow: { xs: 'none', sm: REPAIRS_UI.shadow },
        p: { xs: 0.5, sm: 2.5, md: 3 },
        mb: 3,
      }}>
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1 }}>
          <PrecisionManufacturingIcon sx={{ fontSize: 28, color: REPAIRS_UI.accent }} />
          <Box>
            <Typography sx={{
              display: 'inline-flex', alignItems: 'center', gap: 1,
              px: 1.25, py: 0.5, mb: 0.75, fontSize: '0.72rem', fontWeight: 700,
              letterSpacing: '0.08em', color: REPAIRS_UI.textPrimary,
              backgroundColor: REPAIRS_UI.bgCard, border: `1px solid ${REPAIRS_UI.border}`,
              borderRadius: 2, textTransform: 'uppercase',
            }}>
              Production
            </Typography>
            <Typography sx={{ fontSize: { xs: 24, md: 32 }, fontWeight: 600, color: REPAIRS_UI.textHeader }}>
              Casting Board
            </Typography>
          </Box>
        </Stack>
        <Typography sx={{ color: REPAIRS_UI.textSecondary, lineHeight: 1.6 }}>
          Track casting orders, wax models, and in-progress production work orders.
        </Typography>
      </Box>

      <Paper sx={{ p: 5, textAlign: 'center', backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px dashed ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' }}>
        <ConstructionIcon sx={{ fontSize: 48, color: REPAIRS_UI.textMuted, mb: 2 }} />
        <Typography sx={{ color: REPAIRS_UI.textHeader, fontWeight: 600, mb: 1 }}>Casting Board</Typography>
        <Typography sx={{ color: REPAIRS_UI.textSecondary, mb: 2 }}>
          The casting board UI is being built in task #48. Pieces start their production lifecycle here once ordered.
        </Typography>
        <Chip
          label="Task #48 — Casting board business logic"
          sx={{ backgroundColor: REPAIRS_UI.bgTertiary, color: REPAIRS_UI.textSecondary, border: `1px solid ${REPAIRS_UI.border}` }}
        />
      </Paper>
    </Box>
  );
}
