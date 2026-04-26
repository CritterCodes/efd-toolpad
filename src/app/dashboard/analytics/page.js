"use client";
import * as React from 'react';
import { useState, useMemo } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import RepairOverviewAnalytics from '@/app/components/analytics/repairOverview.component';
import RepairStatusAnalytics from '@/app/components/analytics/status.component';
import CustomerInsightsAnalytics from '@/app/components/analytics/clientInsights.component';
import RevenueAnalytics from '@/app/components/analytics/revenue.component';
import UpcomingDeadlinesAnalytics from '@/app/components/analytics/upcoming.component';
import RevenueTrendAnalytics from '@/app/components/analytics/revenueTrend.component';
import SalesTaxReport from '@/app/components/analytics/salesTax.component';
import { useRepairs } from '@/app/context/repairs.context';

const DATE_RANGES = [
  { label: '7 Days', value: '7d', days: 7 },
  { label: '30 Days', value: '30d', days: 30 },
  { label: '90 Days', value: '90d', days: 90 },
  { label: '1 Year', value: '1yr', days: 365 },
  { label: 'All Time', value: 'all', days: Infinity },
];

export default function AnalyticsPage() {
  const { repairs, loading } = useRepairs();
  const [dateRange, setDateRange] = useState('30d');

  const filteredRepairs = useMemo(() => {
    if (!Array.isArray(repairs)) return [];
    const selected = DATE_RANGES.find(r => r.value === dateRange);
    if (!selected || selected.days === Infinity) return repairs;
    const cutoff = Date.now() - selected.days * 24 * 60 * 60 * 1000;
    return repairs.filter(r => r.createdAt && new Date(r.createdAt).getTime() >= cutoff);
  }, [repairs, dateRange]);

  if (loading) {
    return <Typography sx={{ p: 4 }}>Loading analytics data...</Typography>;
  }

  return (
    <Box sx={{ padding: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" fontWeight="bold">Analytics Dashboard</Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          {DATE_RANGES.map(range => (
            <Chip
              key={range.value}
              label={range.label}
              onClick={() => setDateRange(range.value)}
              color={dateRange === range.value ? 'primary' : 'default'}
              variant={dateRange === range.value ? 'filled' : 'outlined'}
              sx={{ cursor: 'pointer' }}
            />
          ))}
        </Stack>
      </Box>

      <Grid container spacing={3}>
        {/* Row 1: Summary cards */}
        <Grid item xs={12} md={4}>
          <RepairOverviewAnalytics repairs={filteredRepairs} />
        </Grid>
        <Grid item xs={12} md={4}>
          <RevenueAnalytics repairs={filteredRepairs} />
        </Grid>
        <Grid item xs={12} md={4}>
          <CustomerInsightsAnalytics repairs={filteredRepairs} />
        </Grid>

        {/* Row 2: Revenue trend chart + Status pie */}
        <Grid item xs={12} md={8}>
          <RevenueTrendAnalytics repairs={filteredRepairs} />
        </Grid>
        <Grid item xs={12} md={4}>
          <RepairStatusAnalytics repairs={filteredRepairs} />
        </Grid>

        {/* Row 3: Sales Tax Report (full width) */}
        <Grid item xs={12}>
          <SalesTaxReport repairs={filteredRepairs} />
        </Grid>

        {/* Row 4: Upcoming deadlines (uses all repairs, not filtered — show real upcoming) */}
        <Grid item xs={12} md={6}>
          <UpcomingDeadlinesAnalytics repairs={repairs} />
        </Grid>
      </Grid>
    </Box>
  );
}
