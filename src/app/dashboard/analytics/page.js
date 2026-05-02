"use client";

import * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import RepairOverviewAnalytics from '@/app/components/analytics/repairOverview.component';
import RepairStatusAnalytics from '@/app/components/analytics/status.component';
import CustomerInsightsAnalytics from '@/app/components/analytics/clientInsights.component';
import RevenueAnalytics from '@/app/components/analytics/revenue.component';
import UpcomingDeadlinesAnalytics from '@/app/components/analytics/upcoming.component';
import RevenueTrendAnalytics from '@/app/components/analytics/revenueTrend.component';
import SalesTaxReport from '@/app/components/analytics/salesTax.component';
import { useRepairs } from '@/app/context/repairs.context';

const DATE_RANGES = [
  { label: '7 Days', value: '7d' },
  { label: '30 Days', value: '30d' },
  { label: '90 Days', value: '90d' },
  { label: '1 Year', value: '1yr' },
  { label: 'All Time', value: 'all' },
];

export default function AnalyticsPage() {
  const { repairs, loading: repairsLoading } = useRepairs();
  const [dateRange, setDateRange] = useState('30d');
  const [includeLegacy, setIncludeLegacy] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const loadAnalytics = async () => {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams({
          dateRange,
          includeLegacy: includeLegacy ? 'true' : 'false',
        });
        const response = await fetch(`/api/analytics/summary?${params.toString()}`);
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to load analytics summary.');
        }

        if (active) {
          setAnalytics(data);
        }
      } catch (err) {
        if (active) {
          setError(err.message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadAnalytics();
    return () => {
      active = false;
    };
  }, [dateRange, includeLegacy]);

  const upcomingRepairs = useMemo(() => Array.isArray(repairs) ? repairs : [], [repairs]);

  if (loading || repairsLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ padding: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">Analytics Dashboard</Typography>
          <Typography variant="body2" color="text.secondary">
            Revenue is invoice-timed. Operational repair KPIs default to go-live repairs.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <FormControlLabel
            control={<Switch checked={includeLegacy} onChange={(event) => setIncludeLegacy(event.target.checked)} />}
            label="Include Legacy"
          />
          {DATE_RANGES.map((range) => (
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

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {analytics?.baseline?.note && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {analytics.baseline.note}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <RepairOverviewAnalytics summary={analytics?.repairOverview} />
        </Grid>
        <Grid item xs={12} md={4}>
          <RevenueAnalytics summary={analytics?.revenue} labor={analytics?.labor} />
        </Grid>
        <Grid item xs={12} md={4}>
          <CustomerInsightsAnalytics summary={analytics?.customerInsights} />
        </Grid>

        <Grid item xs={12} md={8}>
          <RevenueTrendAnalytics data={analytics?.revenueTrend} />
        </Grid>
        <Grid item xs={12} md={4}>
          <RepairStatusAnalytics data={analytics?.statusBreakdown} />
        </Grid>

        <Grid item xs={12}>
          <SalesTaxReport summary={analytics?.salesTax} />
        </Grid>

        <Grid item xs={12} md={6}>
          <UpcomingDeadlinesAnalytics repairs={upcomingRepairs} />
        </Grid>
      </Grid>
    </Box>
  );
}
