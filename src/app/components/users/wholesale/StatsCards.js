import React from 'react';
import { Grid, Card, CardContent, Typography } from '@mui/material';

export default function StatsCards({ stats }) {
  if (!stats) return null;

  const cards = [
    { label: 'Pending Review', value: stats.pending || 0, color: 'warning.main' },
    { label: 'Active Wholesalers', value: stats.activeWholesalers || 0, color: 'success.main' },
    { label: 'Canonical Profiles', value: stats.canonicalWholesalers || 0, color: 'primary.main' },
    { label: 'Legacy Repairs', value: stats.legacyRepairNeeded || 0, color: 'error.main' },
    { label: 'Safe Matches', value: stats.safeMatches || 0, color: 'info.main' },
    { label: 'Ambiguous Matches', value: stats.ambiguousMatches || 0, color: 'warning.dark' },
  ];

  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {cards.map((card) => (
        <Grid item xs={6} md={2} key={card.label}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="div" color={card.color}>
                {card.value}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {card.label}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}
