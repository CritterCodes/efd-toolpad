'use client';

/**
 * U-3 (production-ui-rework) — the one shared list-page header panel (eyebrow pill + title +
 * description + optional right-aligned primary action), replacing the duplicated inline header
 * boxes across the production list pages.
 */

import React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';

export default function ProductionListHeader({ icon: Icon, eyebrow, title, description, action = null }) {
  return (
    <Box sx={{ backgroundColor: { xs: 'transparent', sm: REPAIRS_UI.bgPanel }, border: { xs: 'none', sm: `1px solid ${REPAIRS_UI.border}` }, borderRadius: { xs: 0, sm: 3 }, boxShadow: { xs: 'none', sm: REPAIRS_UI.shadow }, p: { xs: 0.5, sm: 2.5, md: 3 }, mb: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
        <Box sx={{ maxWidth: 920 }}>
          {eyebrow && (
            <Typography sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, px: 1.25, py: 0.5, mb: 1.5, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', color: REPAIRS_UI.textPrimary, backgroundColor: REPAIRS_UI.bgCard, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, textTransform: 'uppercase' }}>
              {Icon && <Icon sx={{ fontSize: 16, color: REPAIRS_UI.accent }} />}
              {eyebrow}
            </Typography>
          )}
          <Typography sx={{ fontSize: { xs: 28, md: 36 }, fontWeight: 600, color: REPAIRS_UI.textHeader, mb: 1 }}>{title}</Typography>
          {description && <Typography sx={{ color: REPAIRS_UI.textSecondary, lineHeight: 1.6 }}>{description}</Typography>}
        </Box>
        {action}
      </Stack>
    </Box>
  );
}
