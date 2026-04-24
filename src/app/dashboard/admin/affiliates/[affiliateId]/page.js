"use client";
import React, { useState, useEffect, use } from 'react';
import {
  Box, Typography, Breadcrumbs, Link, CircularProgress, Alert, Card, CardContent,
  Grid, Chip, Table, TableHead, TableRow, TableCell, TableBody, Paper, TableContainer,
  Select, MenuItem, FormControl, InputLabel, Button
} from '@mui/material';
import { useRouter } from 'next/navigation';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const BASE_URL = process.env.NEXT_PUBLIC_SHOP_URL || 'https://engelfinedesign.com';

export default function AdminAffiliateDetailPage({ params }) {
  const router = useRouter();
  const { affiliateId } = use(params);
  const [affiliate, setAffiliate] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusUpdating, setStatusUpdating] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [aRes, cRes, mRes] = await Promise.all([
          fetch(`/api/affiliates/${affiliateId}`),
          fetch(`/api/affiliates/campaigns?affiliateId=${affiliateId}`),
          fetch(`/api/affiliates/metrics?affiliateId=${affiliateId}`),
        ]);
        const [aData, cData, mData] = await Promise.all([aRes.json(), cRes.json(), mRes.json()]);
        if (!aData.success) throw new Error(aData.error || 'Affiliate not found.');
        setAffiliate(aData.data);
        if (cData.success) setCampaigns(cData.data || []);
        if (mData.success) setMetrics(mData.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [affiliateId]);

  const handleStatusChange = async (status) => {
    setStatusUpdating(true);
    try {
      const res = await fetch(`/api/affiliates/${affiliateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success) setAffiliate((prev) => ({ ...prev, status }));
    } catch {}
    setStatusUpdating(false);
  };

  if (loading) return <CircularProgress sx={{ m: 4 }} />;
  if (error) return <Alert severity="error" sx={{ m: 3 }}>{error}</Alert>;

  return (
    <Box sx={{ p: 3 }}>
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link underline="hover" color="inherit" onClick={() => router.push('/dashboard')} sx={{ cursor: 'pointer' }}>Dashboard</Link>
        <Link underline="hover" color="inherit" onClick={() => router.push('/dashboard/admin')} sx={{ cursor: 'pointer' }}>Admin</Link>
        <Link underline="hover" color="inherit" onClick={() => router.push('/dashboard/admin/affiliates')} sx={{ cursor: 'pointer' }}>Affiliates</Link>
        <Typography color="text.primary">{affiliate.name || affiliate.code}</Typography>
      </Breadcrumbs>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={600}>{affiliate.name || affiliate.code}</Typography>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Status</InputLabel>
          <Select label="Status" value={affiliate.status} onChange={(e) => handleStatusChange(e.target.value)} disabled={statusUpdating}>
            {['active', 'paused', 'disabled'].map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
          </Select>
        </FormControl>
      </Box>

      <Grid container spacing={3} mb={4}>
        {[
          ['Code', affiliate.code],
          ['Email', affiliate.email || '—'],
          ['Commission', `${Math.round((affiliate.commissionRate || 0) * 100)}%`],
          ['Promoted', fmtDate(affiliate.promotedAt)],
          ['Clicks', metrics?.clicks ?? '—'],
          ['Custom Requests', metrics?.requests ?? '—'],
          ['Referred Clients', metrics?.referredClientsCount ?? '—'],
        ].map(([label, value]) => (
          <Grid item xs={6} sm={4} md={3} key={label}>
            <Card variant="outlined">
              <CardContent sx={{ pb: '12px !important' }}>
                <Typography variant="caption" color="text.secondary">{label}</Typography>
                <Typography variant="h6" fontWeight={600}>{value}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Typography variant="h6" fontWeight={600} mb={2}>Campaigns</Typography>
      {campaigns.length === 0 ? (
        <Alert severity="info">No campaigns yet.</Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Code</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Referral Link</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {campaigns.map((c) => (
                <TableRow key={c.campaignId}>
                  <TableCell>{c.name}</TableCell>
                  <TableCell><code>{c.code}</code></TableCell>
                  <TableCell><Chip label={c.status} size="small" color={c.status === 'active' ? 'success' : 'default'} /></TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{ wordBreak: 'break-all' }}>
                      {`${BASE_URL}/r/${affiliate.code}/${c.code}`}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
