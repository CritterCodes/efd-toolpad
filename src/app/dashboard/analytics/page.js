"use client";

import * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
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
import { ANALYTICS_DATE_RANGE_OPTIONS } from '@/services/repairAnalytics';

function formatMoney(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(Number(value || 0));
}

function HighlightCard({ title, value, note }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="body2" color="text.secondary">{title}</Typography>
        <Typography variant="h4" fontWeight={700} sx={{ mt: 1 }}>{value}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{note}</Typography>
      </CardContent>
    </Card>
  );
}

export default function AnalyticsDashPage() {
  const router = useRouter();
  const { repairs, loading: repairsLoading } = useRepairs();
  const [dateRange, setDateRange] = useState('this_month');
  const [includeLegacy, setIncludeLegacy] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const summaryParams = new URLSearchParams({
          dateRange,
          includeLegacy: includeLegacy ? 'true' : 'false',
        });
        const reportParams = new URLSearchParams({ dateRange });
        const [summaryResponse, reportsResponse] = await Promise.all([
          fetch(`/api/analytics/summary?${summaryParams.toString()}`),
          fetch(`/api/analytics/reports?${reportParams.toString()}`),
        ]);
        const [summaryData, reportsData] = await Promise.all([
          summaryResponse.json(),
          reportsResponse.json(),
        ]);

        if (!summaryResponse.ok) throw new Error(summaryData.error || 'Failed to load analytics summary.');
        if (!reportsResponse.ok) throw new Error(reportsData.error || 'Failed to load analytics reports.');

        if (active) {
          setAnalytics(summaryData);
          setReports(reportsData);
        }
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => { active = false; };
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
    <Box sx={{ p: 4 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2} sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">Analytics Dash</Typography>
          <Typography variant="body2" color="text.secondary">
            Go-live-aware operations, invoice-timed revenue, and post-baseline labor.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
          <FormControlLabel
            control={<Switch checked={includeLegacy} onChange={(event) => setIncludeLegacy(event.target.checked)} />}
            label="Include Legacy"
          />
          <Button variant="outlined" onClick={() => router.push('/dashboard/analytics/reports')}>
            Open Reports
          </Button>
        </Stack>
      </Stack>

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
        {ANALYTICS_DATE_RANGE_OPTIONS.map((range) => (
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

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {analytics?.baseline?.note && <Alert severity="info" sx={{ mb: 2 }}>{analytics.baseline.note}</Alert>}

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} lg={3}>
          <HighlightCard
            title="Cash Collected"
            value={formatMoney(reports?.cashCollected?.summary?.totalCollected)}
            note={`${reports?.cashCollected?.summary?.paymentCount || 0} payment(s) in period`}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <HighlightCard
            title="Accounts Receivable"
            value={formatMoney(reports?.accountsReceivable?.summary?.outstandingBalance)}
            note={`${reports?.accountsReceivable?.summary?.overdueCount || 0} overdue invoice(s)`}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <HighlightCard
            title="Closeout Bottlenecks"
            value={String(reports?.closeoutBottlenecks?.summary?.completedUninvoicedCount || 0)}
            note={`${reports?.closeoutBottlenecks?.summary?.readyForPickupUnpaidCount || 0} pickup/delivery jobs still unpaid`}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <HighlightCard
            title="Labor This Period"
            value={formatMoney(analytics?.labor?.totalPay)}
            note={`${analytics?.labor?.label || 'Post-baseline only'} · ${Number(analytics?.labor?.totalHours || 0).toFixed(2)}h`}
          />
        </Grid>
      </Grid>

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
