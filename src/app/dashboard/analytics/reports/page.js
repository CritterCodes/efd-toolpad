"use client";

import * as React from 'react';
import { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { ANALYTICS_DATE_RANGE_OPTIONS } from '@/services/repairAnalytics';

function formatMoney(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(Number(value || 0));
}

function SectionCard({ title, subtitle, children }) {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" fontWeight={700}>{title}</Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {subtitle}
          </Typography>
        )}
        {children}
      </CardContent>
    </Card>
  );
}

export default function AnalyticsReportsPage() {
  const [dateRange, setDateRange] = useState('this_month');
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await fetch(`/api/analytics/reports?dateRange=${encodeURIComponent(dateRange)}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to load reports.');
        if (active) setReports(data);
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => { active = false; };
  }, [dateRange]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" fontWeight="bold" sx={{ mb: 0.5 }}>Analytics Reports</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Cash, receivables, closeout, jeweler performance, and wholesale account reporting.
      </Typography>

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
      {reports?.baseline?.note && <Alert severity="info" sx={{ mb: 2 }}>{reports.baseline.note}</Alert>}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6} lg={4}>
          <SectionCard title="Cash Collected" subtitle={`${reports?.cashCollected?.summary?.paymentCount || 0} payment(s)`}>
            <Typography variant="h4" fontWeight={700}>{formatMoney(reports?.cashCollected?.summary?.totalCollected)}</Typography>
            <Typography variant="body2" color="text.secondary">
              Legacy carryover: {formatMoney(reports?.cashCollected?.summary?.legacyCarryoverCollected)}
            </Typography>
          </SectionCard>
        </Grid>
        <Grid item xs={12} md={6} lg={4}>
          <SectionCard title="Accounts Receivable" subtitle={`${reports?.accountsReceivable?.summary?.invoiceCount || 0} open invoice(s)`}>
            <Typography variant="h4" fontWeight={700}>{formatMoney(reports?.accountsReceivable?.summary?.outstandingBalance)}</Typography>
            <Typography variant="body2" color="text.secondary">
              Overdue: {reports?.accountsReceivable?.summary?.overdueCount || 0}
            </Typography>
          </SectionCard>
        </Grid>
        <Grid item xs={12} md={6} lg={4}>
          <SectionCard title="Closeout Bottlenecks" subtitle="Operational exceptions">
            <Typography variant="h4" fontWeight={700}>
              {(reports?.closeoutBottlenecks?.summary?.completedUninvoicedCount || 0)
                + (reports?.closeoutBottlenecks?.summary?.readyForPickupUnpaidCount || 0)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Labor review blocked: {reports?.closeoutBottlenecks?.summary?.laborReviewBlockedCount || 0}
            </Typography>
          </SectionCard>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <SectionCard title="Cash Collected" subtitle="Completed payment activity in the selected period">
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
              {(reports?.cashCollected?.summary?.byMethod || []).map((method) => (
                <Chip key={method.method} label={`${method.method}: ${formatMoney(method.amount)}`} />
              ))}
            </Stack>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Invoice</TableCell>
                  <TableCell>Account</TableCell>
                  <TableCell>Method</TableCell>
                  <TableCell align="right">Amount</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(reports?.cashCollected?.rows || []).slice(0, 12).map((row) => (
                  <TableRow key={`${row.invoiceID}-${row.receivedAt}-${row.method}`}>
                    <TableCell>{new Date(row.receivedAt).toLocaleString()}</TableCell>
                    <TableCell>{row.invoiceID}</TableCell>
                    <TableCell>{row.accountName}</TableCell>
                    <TableCell>{row.method}</TableCell>
                    <TableCell align="right">{formatMoney(row.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </SectionCard>
        </Grid>

        <Grid item xs={12} lg={6}>
          <SectionCard title="Accounts Receivable" subtitle="Outstanding invoice balances">
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
              {Object.entries(reports?.accountsReceivable?.summary?.buckets || {}).map(([bucket, amount]) => (
                <Chip key={bucket} label={`${bucket}: ${formatMoney(amount)}`} />
              ))}
            </Stack>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Invoice</TableCell>
                  <TableCell>Account</TableCell>
                  <TableCell>Aging</TableCell>
                  <TableCell align="right">Remaining</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(reports?.accountsReceivable?.rows || []).slice(0, 10).map((row) => (
                  <TableRow key={row.invoiceID}>
                    <TableCell>{row.invoiceID}</TableCell>
                    <TableCell>{row.accountName}</TableCell>
                    <TableCell>{row.agingBucket}</TableCell>
                    <TableCell align="right">{formatMoney(row.remainingBalance)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </SectionCard>
        </Grid>

        <Grid item xs={12} lg={6}>
          <SectionCard title="Closeout Bottlenecks" subtitle="Jobs stuck between bench completion and payment">
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Completed but not invoiced</Typography>
            <Table size="small">
              <TableBody>
                {(reports?.closeoutBottlenecks?.completedUninvoiced || []).slice(0, 6).map((row) => (
                  <TableRow key={row.repairID}>
                    <TableCell>{row.repairID}</TableCell>
                    <TableCell>{row.clientName}</TableCell>
                    <TableCell align="right">{formatMoney(row.totalCost)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Ready for pickup / delivery but unpaid</Typography>
            <Table size="small">
              <TableBody>
                {(reports?.closeoutBottlenecks?.readyForPickupUnpaid || []).slice(0, 6).map((row) => (
                  <TableRow key={row.repairID}>
                    <TableCell>{row.repairID}</TableCell>
                    <TableCell>{row.clientName}</TableCell>
                    <TableCell align="right">{formatMoney(row.remainingBalance)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </SectionCard>
        </Grid>

        <Grid item xs={12} lg={6}>
          <SectionCard title="Jeweler Performance" subtitle="Labor output in the selected period">
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
              <Chip label={`Hours ${Number(reports?.jewelerPerformance?.summary?.totalHours || 0).toFixed(2)}`} />
              <Chip label={`Labor ${formatMoney(reports?.jewelerPerformance?.summary?.totalPay)}`} />
              <Chip label={`Paid ${formatMoney(reports?.jewelerPerformance?.summary?.payrollPaid)}`} />
            </Stack>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Jeweler</TableCell>
                  <TableCell align="right">Hours</TableCell>
                  <TableCell align="right">Labor</TableCell>
                  <TableCell align="right">Paid</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(reports?.jewelerPerformance?.rows || []).map((row) => (
                  <TableRow key={row.userID}>
                    <TableCell>{row.userName}</TableCell>
                    <TableCell align="right">{row.laborHours.toFixed(2)}</TableCell>
                    <TableCell align="right">{formatMoney(row.laborPay)}</TableCell>
                    <TableCell align="right">{formatMoney(row.paidThroughPayroll)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </SectionCard>
        </Grid>

        <Grid item xs={12} lg={6}>
          <SectionCard title="Wholesale Performance" subtitle="Store-level revenue and outstanding pickup workload">
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
              <Chip label={`Stores ${reports?.wholesalePerformance?.summary?.stores || 0}`} />
              <Chip label={`Revenue ${formatMoney(reports?.wholesalePerformance?.summary?.revenue)}`} />
              <Chip label={`Pickup ${reports?.wholesalePerformance?.summary?.pendingPickup || 0}`} />
            </Stack>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Store</TableCell>
                  <TableCell align="right">Revenue</TableCell>
                  <TableCell align="right">Unpaid</TableCell>
                  <TableCell align="right">Pickup</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(reports?.wholesalePerformance?.rows || []).slice(0, 10).map((row) => (
                  <TableRow key={row.storeKey}>
                    <TableCell>{row.storeName}</TableCell>
                    <TableCell align="right">{formatMoney(row.revenue)}</TableCell>
                    <TableCell align="right">{formatMoney(row.unpaidBalance)}</TableCell>
                    <TableCell align="right">{row.pendingPickup}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </SectionCard>
        </Grid>
      </Grid>
    </Box>
  );
}
