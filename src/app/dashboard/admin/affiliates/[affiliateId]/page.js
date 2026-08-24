"use client";
import React, { useState, useEffect, use } from 'react';
import {
  Box, Typography, CircularProgress, Alert, Grid,
  Chip, Table, TableHead, TableRow, TableCell, TableBody,
  Select, MenuItem, FormControl, InputLabel, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, InputAdornment,
} from '@mui/material';
import { Link as LinkIcon } from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { REPAIRS_UI as UI } from '@/app/dashboard/repairs/components/repairsUi';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const BASE_URL = process.env.NEXT_PUBLIC_SHOP_URL || 'https://engelfinedesign.com';

export default function AdminAffiliateDetailPage({ params }) {
  const router = useRouter();
  const { affiliateId } = use(params);
  const [affiliate, setAffiliate] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [earnings, setEarnings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [reviewing, setReviewing] = useState(null); // commission being approved
  const [reviewProfit, setReviewProfit] = useState('');
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewError, setReviewError] = useState('');

  const loadEarnings = async () => {
    const res = await fetch(`/api/affiliates/commissions?affiliateId=${affiliateId}`);
    const data = await res.json().catch(() => ({}));
    if (data.success) setEarnings(data.data);
  };

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
        await loadEarnings();
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [affiliateId]);

  const actCommission = async (commissionId, body) => {
    setReviewBusy(true); setReviewError('');
    try {
      const res = await fetch(`/api/affiliates/commissions/${commissionId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || 'Update failed.');
      setReviewing(null); setReviewProfit('');
      await loadEarnings();
    } catch (e) {
      setReviewError(e.message);
    } finally {
      setReviewBusy(false);
    }
  };

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

  if (loading) return <CircularProgress sx={{ m: 4, color: UI.accent }} />;
  if (error) return <Alert severity="error" sx={{ m: 3 }}>{error}</Alert>;

  const statItems = [
    ['Code', affiliate.code],
    ['Email', affiliate.email || '—'],
    ['Commission', `${Math.round((affiliate.commissionRate || 0) * 100)}%`],
    ['Promoted', fmtDate(affiliate.promotedAt)],
    ['Clicks', metrics?.clicks ?? '—'],
    ['Custom Requests', metrics?.requests ?? '—'],
    ['Referred Clients', metrics?.referredClientsCount ?? '—'],
    ['Earned', earnings ? `$${(earnings.totals?.earned ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'],
  ];

  const COMMISSION_CHIP = { earned: 'success', needs_review: 'warning', void: 'default' };

  return (
    <Box sx={{ pb: 10 }}>
      {/* Header */}
      <Box
        sx={{
          backgroundColor: { xs: 'transparent', sm: UI.bgPanel },
          border: { xs: 'none', sm: `1px solid ${UI.border}` },
          borderRadius: { xs: 0, sm: 3 },
          boxShadow: { xs: 'none', sm: UI.shadow },
          p: { xs: 0.5, sm: 2.5, md: 3 },
          mb: 3,
        }}
      >
        <Box sx={{ mb: 2 }}>
          <Typography
            sx={{
              display: 'inline-flex', alignItems: 'center', gap: 1,
              px: 1.25, py: 0.5, mb: 1.5,
              fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em',
              color: UI.textPrimary, backgroundColor: UI.bgCard,
              border: `1px solid ${UI.border}`, borderRadius: 2, textTransform: 'uppercase',
            }}
          >
            <LinkIcon sx={{ fontSize: 16, color: UI.accent }} />
            Admin / Affiliates
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
            <Typography sx={{ fontSize: { xs: 28, md: 36 }, fontWeight: 600, color: UI.textHeader }}>
              {affiliate.name || affiliate.code}
            </Typography>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Status</InputLabel>
              <Select
                label="Status"
                value={affiliate.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                disabled={statusUpdating}
              >
                {['active', 'paused', 'disabled'].map((s) => (
                  <MenuItem key={s} value={s}>{s}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Box>
        <Button
          size="small"
          variant="outlined"
          onClick={() => router.push('/dashboard/admin/affiliates')}
          sx={{ color: UI.textPrimary, borderColor: UI.border, backgroundColor: UI.bgCard }}
        >
          Back to Affiliates
        </Button>
      </Box>

      {/* Stat grid */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {statItems.map(([label, value]) => (
          <Grid item xs={6} sm={4} md={3} key={label}>
            <Box
              sx={{
                p: 2,
                border: `1px solid ${UI.border}`,
                borderRadius: 2,
                backgroundColor: UI.bgCard,
              }}
            >
              <Typography variant="caption" sx={{ color: UI.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.7rem' }}>
                {label}
              </Typography>
              <Typography variant="h6" fontWeight={600} sx={{ color: UI.textHeader, fontFamily: label === 'Code' ? 'monospace' : 'inherit' }}>
                {value}
              </Typography>
            </Box>
          </Grid>
        ))}
      </Grid>

      {/* Campaigns */}
      <Typography variant="h6" fontWeight={600} sx={{ color: UI.textHeader, mb: 2 }}>Campaigns</Typography>
      {campaigns.length === 0 ? (
        <Box sx={{ p: 3, border: `1px solid ${UI.border}`, borderRadius: 2, backgroundColor: UI.bgCard }}>
          <Typography sx={{ color: UI.textSecondary }}>No campaigns yet.</Typography>
        </Box>
      ) : (
        <Box sx={{ border: `1px solid ${UI.border}`, borderRadius: 2, overflow: 'hidden' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: UI.bgTertiary }}>
                {['Name', 'Code', 'Status', 'Referral Link'].map((h) => (
                  <TableCell key={h} sx={{ color: UI.textMuted, fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: `1px solid ${UI.border}` }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {campaigns.map((c) => (
                <TableRow
                  key={c.campaignId}
                  sx={{
                    backgroundColor: UI.bgCard,
                    '&:not(:last-child) td': { borderBottom: `1px solid ${UI.border}` },
                    '&:last-child td': { borderBottom: 'none' },
                  }}
                >
                  <TableCell sx={{ color: UI.textPrimary }}>{c.name}</TableCell>
                  <TableCell sx={{ color: UI.textSecondary, fontFamily: 'monospace' }}>{c.code}</TableCell>
                  <TableCell>
                    <Chip label={c.status} size="small" color={c.status === 'active' ? 'success' : 'default'} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{ wordBreak: 'break-all', fontFamily: 'monospace', color: UI.textSecondary }}>
                      {`${BASE_URL}/r/${affiliate.code}/${c.code}`}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}

      {/* Commissions ledger */}
      <Typography variant="h6" fontWeight={600} sx={{ color: UI.textHeader, mb: 2, mt: 4 }}>Commissions</Typography>
      {!earnings?.commissions?.length ? (
        <Box sx={{ p: 3, border: `1px solid ${UI.border}`, borderRadius: 2, backgroundColor: UI.bgCard }}>
          <Typography sx={{ color: UI.textSecondary }}>
            No commissions yet. Custom orders earn automatically at paid-in-full ({Math.round((affiliate.commissionRate || 0) * 100)}% of pre-tax quoted profit);
            product sales appear here for review — enter the profit to approve the payout.
          </Typography>
        </Box>
      ) : (
        <Box sx={{ border: `1px solid ${UI.border}`, borderRadius: 2, overflow: 'hidden' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: UI.bgTertiary }}>
                {['Date', 'Source', 'Type', 'Basis (profit)', 'Rate', 'Amount', 'Status', ''].map((h) => (
                  <TableCell key={h} sx={{ color: UI.textMuted, fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: `1px solid ${UI.border}` }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {earnings.commissions.map((c) => (
                <TableRow key={c.commissionId} sx={{ backgroundColor: UI.bgCard, '&:not(:last-child) td': { borderBottom: `1px solid ${UI.border}` }, '&:last-child td': { borderBottom: 'none' } }}>
                  <TableCell sx={{ color: UI.textSecondary }}>{fmtDate(c.createdAt)}</TableCell>
                  <TableCell sx={{ color: UI.textSecondary, fontFamily: 'monospace', fontSize: '0.78rem' }}>{c.sourceID}</TableCell>
                  <TableCell sx={{ color: UI.textPrimary }}>{c.conversionType === 'product_sale' ? 'Product sale' : 'Custom order'}</TableCell>
                  <TableCell sx={{ color: UI.textSecondary }}>
                    {c.basis?.profit != null ? `$${Number(c.basis.profit).toLocaleString()}` : '—'}
                  </TableCell>
                  <TableCell sx={{ color: UI.textSecondary }}>{Math.round((c.rate || 0) * 1000) / 10}%</TableCell>
                  <TableCell sx={{ color: UI.textPrimary, fontWeight: 600 }}>
                    {c.status === 'needs_review' ? '—' : `$${(c.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                  </TableCell>
                  <TableCell><Chip size="small" label={c.status.replace('_', ' ')} color={COMMISSION_CHIP[c.status] || 'default'} /></TableCell>
                  <TableCell>
                    {c.status === 'needs_review' && (
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button size="small" variant="contained" onClick={() => { setReviewing(c); setReviewProfit(''); setReviewError(''); }}
                          sx={{ backgroundColor: UI.accent, color: '#1A1A1A', fontWeight: 600 }}>Approve…</Button>
                        <Button size="small" color="error" disabled={reviewBusy}
                          onClick={() => actCommission(c.commissionId, { action: 'void', reason: 'admin rejected' })}>Void</Button>
                      </Box>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}

      {/* Approve dialog: admin enters the pre-tax profit; amount = profit × snapshotted rate. */}
      <Dialog open={!!reviewing} onClose={() => !reviewBusy && setReviewing(null)} fullWidth maxWidth="xs"
        PaperProps={{ sx: { backgroundColor: UI.bgPanel, backgroundImage: 'none', color: UI.textPrimary, border: `1px solid ${UI.border}` } }}>
        <DialogTitle>Approve commission</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: UI.textSecondary, mb: 2 }}>
            Order {reviewing?.sourceID} · order total ${Number(reviewing?.basis?.orderTotal || 0).toLocaleString()}
            {reviewing?.basis?.customPaymentPortion > 0 ? ` (incl. $${Number(reviewing.basis.customPaymentPortion).toLocaleString()} custom payments — exclude those; the customs trigger pays them)` : ''}.
            Enter the pre-tax PROFIT on the products; the payout is {Math.round((reviewing?.rate || 0) * 1000) / 10}% of it.
          </Typography>
          <TextField autoFocus fullWidth size="small" label="Pre-tax profit" type="number" value={reviewProfit}
            onChange={(e) => setReviewProfit(e.target.value)} error={!!reviewError} helperText={reviewError || (reviewProfit !== '' ? `Payout: $${(Math.max(0, Number(reviewProfit) || 0) * (reviewing?.rate || 0)).toFixed(2)}` : ' ')}
            InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReviewing(null)} disabled={reviewBusy} sx={{ color: UI.textSecondary }}>Cancel</Button>
          <Button variant="contained" disabled={reviewBusy || reviewProfit === ''} onClick={() => actCommission(reviewing.commissionId, { action: 'approve', profit: Number(reviewProfit) })}
            sx={{ backgroundColor: UI.accent, color: '#1A1A1A', fontWeight: 600 }}>
            {reviewBusy ? 'Approving…' : 'Approve & pay via payroll'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
