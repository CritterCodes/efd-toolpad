import React from 'react';
import { Box, Typography } from '@mui/material';
import { tint, facelift } from '@/components/facelift';
import { STATUS_DESCRIPTIONS } from '../constants';

// Light-theme Material blue (#e3f2fd fill, #2196f3 edge) on the near-black ground: the panel read as a
// white slab, and its body text — white on #e3f2fd — sat at about 1.1:1. DESIGN.md's rule for a tinted
// region is the `tint()` triplet: ~13% fill, 42% stroke, full-strength text.
const INFO = tint(facelift.info);

const MoveSummary = ({ repairCount, status }) => {
    if (repairCount === 0 || !status) {
        return null;
    }

    return (
        <Box sx={{
            p: 2,
            mb: 3,
            backgroundColor: INFO.bg,
            borderRadius: '12px',
            border: `1px solid ${INFO.border}`
        }}>
            <Typography variant="h6" sx={{ mb: 1, color: INFO.fg }}>
                Move Summary
            </Typography>
            <Typography variant="body1">
                Moving <strong>{repairCount} repair{repairCount !== 1 ? 's' : ''}</strong> to <strong>{status}</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary">
                {STATUS_DESCRIPTIONS[status]}
            </Typography>
        </Box>
    );
};

export default MoveSummary;
