"use client";
import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Chip,
  CircularProgress, Alert, TextField, Button, InputAdornment,
  Table, TableHead, TableRow, TableCell, TableBody,
} from '@mui/material';
import { BarChart as BarChartIcon, CheckCircle as CheckIcon, People as PeopleIcon, Edit as EditIcon, Save as SaveIcon, Paid as PaidIcon } from '@mui/icons-material';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function AffiliateDashboardPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [affiliate, setAffiliate] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [earnings, setEarnings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [editingCode, setEditingCode] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [codeSaving, setCodeSaving] = useState(false);
  const [codeError, setCodeError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [affRes, mRes, cRes] = await Promise.all([
          fetch('/api/affiliates/me'),
          fetch('/api/affiliates/metrics'),
          fetch('/api/affiliates/commissions'),
        ]);
        const [affData, mData, cData] = await Promise.all([affRes.json(), mRes.json(), cRes.json()]);

        if (!affData.success) {
          setError('No affiliate profile found for your account.');
          return;
        }
        setAffiliate(affData.data);
        setCodeInput(affData.data.code || '');
        if (mData.success) setMetrics(mData.data);
        if (cData.success) setEarnings(cData.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    if (session) load();
  }, [session]);

  const handleSaveCode = async () => {
    const trimmed = codeInput.trim();
    if (!trimmed) { setCodeError('Code cannot be empty.'); return; }
    setCodeSaving(true);
    setCodeError('');
    try {
      const res = await fetch(`/api/affiliates/${affiliate.affiliateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: trimmed, codeSetByAffiliate: true }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to update code.');
      setAffiliate((prev) => ({ ...prev, code: data.data.code, codeSetByAffiliate: true }));
      setCodeInput(data.data.code);
      setEditingCode(false);
    } catch (err) {
      setCodeError(err.message);
    } finally {
      setCodeSaving(false);
    }
  };

  const stats = [
    { label: 'Total Clicks', value: metrics?.clicks ?? '—', icon: <BarChartIcon color="primary" /> },
    { label: 'Custom Requests', value: metrics?.requests ?? '—', icon: <CheckIcon color="success" /> },
    { label: 'Referred Clients', value: metrics?.referredClientsCount ?? '—', icon: <PeopleIcon color="secondary" /> },
    { label: 'Earned', value: earnings ? `$${(earnings.totals?.earned ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—', icon: <PaidIcon color="warning" /> },
  ];

  const COMMISSION_CHIP = { earned: 'success', needs_review: 'warning', void: 'default' };

  return (
    <Box sx={{ pb: 10 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={600}>Affiliate Dashboard</Typography>
      </Box>

      {loading && <CircularProgress />}
      {error && <Alert severity="error">{error}</Alert>}

      {!loading && !error && affiliate && (
        <>
          {/* Referral code section */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" mb={1}>Your Referral Code</Typography>
              {!affiliate.codeSetByAffiliate && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  Set a custom referral code — this is what appears in your links (e.g. <strong>engelfinedesign.com/r/yourcode/campaign</strong>).
                </Alert>
              )}
              {editingCode ? (
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                  <TextField
                    size="small"
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    error={!!codeError}
                    helperText={codeError || `engelfinedesign.com/r/${codeInput || '...'}/campaign`}
                    InputProps={{ startAdornment: <InputAdornment position="start">/r/</InputAdornment> }}
                    sx={{ minWidth: 260 }}
                  />
                  <Button variant="contained" size="small" onClick={handleSaveCode} disabled={codeSaving} startIcon={<SaveIcon />}>
                    {codeSaving ? 'Saving...' : 'Save'}
                  </Button>
                  <Button size="small" onClick={() => { setEditingCode(false); setCodeInput(affiliate.code); setCodeError(''); }}>
                    Cancel
                  </Button>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="h6" fontWeight={600}>{affiliate.code}</Typography>
                  <Button size="small" startIcon={<EditIcon />} onClick={() => setEditingCode(true)}>Change</Button>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Metrics */}
          <Grid container spacing={3}>
            {stats.map((s) => (
              <Grid item xs={12} sm={3} key={s.label}>
                <Card>
                  <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    {s.icon}
                    <Box>
                      <Typography variant="h4" fontWeight={700}>{s.value}</Typography>
                      <Typography variant="body2" color="text.secondary">{s.label}</Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Earnings ledger */}
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" mb={1}>Commissions</Typography>
              {!earnings?.commissions?.length ? (
                <Typography variant="body2" color="text.secondary">
                  No commissions yet. You earn a percentage of the pre-tax profit on each referred
                  order once it&rsquo;s paid in full — payouts ride the regular payroll cycle.
                </Typography>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Amount</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {earnings.commissions.map((c) => (
                      <TableRow key={c.commissionId}>
                        <TableCell>{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '—'}</TableCell>
                        <TableCell>{c.conversionType === 'product_sale' ? 'Purchase' : 'Custom order'}</TableCell>
                        <TableCell>
                          <Chip size="small" color={COMMISSION_CHIP[c.status] || 'default'}
                            label={c.status === 'needs_review' ? 'processing' : c.status} />
                        </TableCell>
                        <TableCell align="right">
                          {c.status === 'needs_review' ? '—' : `$${(c.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </Box>
  );
}
