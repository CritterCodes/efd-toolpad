"use client";
import * as React from 'react';
import PropTypes from 'prop-types';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import Divider from '@mui/material/Divider';

export default function RevenueAnalytics({ summary = {}, labor = {} }) {
  const data = [
    { label: 'Revenue This Period', value: `$${Number(summary.totalRevenue || 0).toFixed(2)}` },
    { label: 'Legacy Carryover', value: `$${Number(summary.legacyCarryoverRevenue || 0).toFixed(2)}` },
    { label: 'Go-Live Revenue', value: `$${Number(summary.goLiveRevenue || 0).toFixed(2)}` },
    { label: 'Labor This Period', value: `$${Number(labor.totalPay || 0).toFixed(2)}` },
  ];

  return (
    <Card
      sx={{
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        padding: 3,
        textAlign: 'center',
        maxWidth: 350,
        height: 320,
        mx: 'auto',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-evenly',
      }}
    >
      <Typography variant="h6" fontWeight="bold" mb={2}>
        Revenue Analytics
      </Typography>
      <Divider sx={{ mb: 2 }} />
      <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mb: 1.5 }}>
        Labor is post-baseline only
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {data.map((item) => (
          <Box
            key={item.label}
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              py: 1,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              {item.label}
            </Typography>
            <Typography variant="h6" fontWeight="bold" sx={{ color: 'primary.main' }}>
              {item.value}
            </Typography>
          </Box>
        ))}
      </Box>
    </Card>
  );
}

RevenueAnalytics.propTypes = {
  summary: PropTypes.object,
  labor: PropTypes.object,
};
