'use client';
import React from 'react';
import { Box, Typography, Chip, Card, CardContent, Stack } from '@mui/material';
import { CheckCircle as CheckCircleIcon } from '@mui/icons-material';

export default function ProcessMatchCard({ process, quantity = 1, confidence = 0, reason = '' }) {
  if (!process) return null;
  const confColor = confidence >= 80 ? 'success' : confidence >= 55 ? 'warning' : 'default';

  return (
    <Card variant="outlined" sx={{ borderColor: 'success.300', bgcolor: 'success.50' }}>
      <CardContent sx={{ py: '10px !important', px: '14px !important' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: 1 }}>
            <CheckCircleIcon fontSize="small" color="success" />
            <Typography variant="body2" fontWeight="bold" noWrap>
              {process.displayName || process.name}
            </Typography>
          </Box>
          <Stack direction="row" spacing={0.5} sx={{ ml: 1, flexShrink: 0 }}>
            {quantity > 1 && <Chip label={`×${quantity}`} size="small" />}
            <Chip label={`${confidence}%`} size="small" color={confColor} />
          </Stack>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
          {process.category && (
            <Typography variant="caption" color="text.secondary">{process.category}</Typography>
          )}
          {process.laborHours > 0 && (
            <Typography variant="caption" color="text.secondary">{process.laborHours}h labor</Typography>
          )}
        </Box>

        {reason && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.25, display: 'block', fontStyle: 'italic' }}>
            {reason}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
