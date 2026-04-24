"use client";
import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Breadcrumbs, Link,
  CircularProgress, Alert, TextField, Button, InputAdornment
} from '@mui/material';
import { BarChart as BarChartIcon, CheckCircle as CheckIcon, People as PeopleIcon, Edit as EditIcon, Save as SaveIcon } from '@mui/icons-material';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function AffiliateDashboardPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [affiliate, setAffiliate] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [editingCode, setEditingCode] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [codeSaving, setCodeSaving] = useState(false);
  const [codeError, setCodeError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [affRes, mRes] = await Promise.all([
          fetch('/api/affiliates/me'),
          fetch('/api/affiliates/metrics'),
        ]);
        const [affData, mData] = await Promise.all([affRes.json(), mRes.json()]);

        if (!affData.success) {
          setError('No affiliate profile found for your account.');
          return;
        }
        setAffiliate(affData.data);
        setCodeInput(affData.data.code || '');
        if (mData.success) setMetrics(mData.data);
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
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link underline="hover" color="inherit" onClick={() => router.push('/dashboard')} sx={{ cursor: 'pointer' }}>Dashboard</Link>
        <Typography color="text.primary">Affiliate</Typography>
      </Breadcrumbs>

      <Typography variant="h5" fontWeight={600} mb={3}>Affiliate Dashboard</Typography>

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
              <Grid item xs={12} sm={4} key={s.label}>
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
        </>
      )}
    </Box>
  );
}
