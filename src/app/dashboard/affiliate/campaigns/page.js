"use client";
import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Breadcrumbs, Link, Button, Card, CardContent,
  Chip, CircularProgress, Alert, Stack, IconButton, Tooltip, Divider,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  MenuItem, Select, FormControl, InputLabel, Snackbar
} from '@mui/material';
import {
  Add as AddIcon, Link as LinkIcon, ContentCopy as CopyIcon,
  Check as CheckIcon, Edit as EditIcon, Pause as PauseIcon,
  PlayArrow as ResumeIcon, Archive as ArchiveIcon
} from '@mui/icons-material';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

const SHOP_URL = process.env.NEXT_PUBLIC_SHOP_URL || 'https://engelfinedesign.com';

const STATUS_COLORS = { active: 'success', paused: 'warning', archived: 'default' };

export default function AffiliateCampaignsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [campaigns, setCampaigns] = useState([]);
  const [metrics, setMetrics] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(null);
  const [snackbar, setSnackbar] = useState('');

  // Edit dialog
  const [editing, setEditing] = useState(null); // campaign being edited
  const [editForm, setEditForm] = useState({ name: '', description: '', destinationUrl: '', status: 'active' });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (session) load();
  }, [session]);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const campRes = await fetch('/api/affiliates/campaigns');
      const campData = await campRes.json();
      if (!campData.success) throw new Error(campData.error || 'Failed to load campaigns');
      const camps = campData.data || [];
      setCampaigns(camps);

      const metricResults = await Promise.all(
        camps.map((c) =>
          fetch(`/api/affiliates/campaigns/${c.campaignId}`).then((r) => r.json()).catch(() => null)
        )
      );
      const map = {};
      metricResults.forEach((r, i) => {
        if (r?.success) map[camps[i].campaignId] = r.data.metrics;
      });
      setMetrics(map);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const referralUrl = (c) => `${SHOP_URL}/r/${c.affiliateCode}/${c.code}`;

  const handleCopy = (id, url) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const openEdit = (c) => {
    setEditing(c);
    setEditForm({ name: c.name, description: c.description || '', destinationUrl: c.destinationUrl || '', status: c.status });
    setSaveError('');
  };

  const handleSave = async () => {
    if (!editForm.name.trim()) { setSaveError('Name is required.'); return; }
    setSaving(true);
    setSaveError('');
    try {
      const res = await fetch(`/api/affiliates/campaigns/${editing.campaignId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to save.');
      setCampaigns((prev) => prev.map((c) => c.campaignId === editing.campaignId ? { ...c, ...editForm } : c));
      setEditing(null);
      setSnackbar('Campaign updated.');
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const patchStatus = async (c, status) => {
    try {
      const res = await fetch(`/api/affiliates/campaigns/${c.campaignId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);
      setCampaigns((prev) => prev.map((x) => x.campaignId === c.campaignId ? { ...x, status } : x));
      setSnackbar(`Campaign ${status}.`);
    } catch (err) {
      setSnackbar(`Error: ${err.message}`);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link underline="hover" color="inherit" onClick={() => router.push('/dashboard')} sx={{ cursor: 'pointer' }}>Dashboard</Link>
        <Link underline="hover" color="inherit" onClick={() => router.push('/dashboard/affiliate')} sx={{ cursor: 'pointer' }}>Affiliate</Link>
        <Typography color="text.primary">Campaigns</Typography>
      </Breadcrumbs>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={600}>Campaigns</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => router.push('/dashboard/affiliate/campaigns/new')}>
          New Campaign
        </Button>
      </Box>

      {loading && <CircularProgress />}
      {error && <Alert severity="error">{error}</Alert>}
      {!loading && !error && campaigns.length === 0 && (
        <Alert severity="info">No campaigns yet. Create your first campaign to get a referral link.</Alert>
      )}

      <Stack spacing={2}>
        {campaigns.map((c) => {
          const url = referralUrl(c);
          const m = metrics[c.campaignId];
          return (
            <Card key={c.campaignId} variant="outlined">
              <CardContent>
                {/* Header row */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="h6">{c.name}</Typography>
                      <Chip label={c.status} color={STATUS_COLORS[c.status] || 'default'} size="small" />
                    </Box>
                    {c.description && (
                      <Typography variant="body2" color="text.secondary" mt={0.5}>{c.description}</Typography>
                    )}
                  </Box>

                  {/* Action buttons */}
                  <Box sx={{ display: 'flex', gap: 0.5, ml: 1 }}>
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => openEdit(c)}><EditIcon fontSize="small" /></IconButton>
                    </Tooltip>
                    {c.status === 'active' && (
                      <Tooltip title="Pause">
                        <IconButton size="small" onClick={() => patchStatus(c, 'paused')}><PauseIcon fontSize="small" /></IconButton>
                      </Tooltip>
                    )}
                    {c.status === 'paused' && (
                      <Tooltip title="Resume">
                        <IconButton size="small" onClick={() => patchStatus(c, 'active')}><ResumeIcon fontSize="small" /></IconButton>
                      </Tooltip>
                    )}
                    {c.status !== 'archived' && (
                      <Tooltip title="Archive">
                        <IconButton size="small" onClick={() => patchStatus(c, 'archived')}><ArchiveIcon fontSize="small" /></IconButton>
                      </Tooltip>
                    )}
                    {c.status === 'archived' && (
                      <Tooltip title="Restore">
                        <IconButton size="small" onClick={() => patchStatus(c, 'active')}><ResumeIcon fontSize="small" /></IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </Box>

                {/* Destination URL */}
                {c.destinationUrl && (
                  <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                    Destination: {c.destinationUrl}
                  </Typography>
                )}

                {/* Referral link */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1.5, p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                  <LinkIcon fontSize="small" color="action" sx={{ flexShrink: 0 }} />
                  <Typography variant="caption" sx={{ flex: 1, wordBreak: 'break-all', fontFamily: 'monospace' }}>
                    {url}
                  </Typography>
                  <Tooltip title={copied === c.campaignId ? 'Copied!' : 'Copy link'}>
                    <IconButton size="small" onClick={() => handleCopy(c.campaignId, url)}>
                      {copied === c.campaignId
                        ? <CheckIcon fontSize="small" color="success" />
                        : <CopyIcon fontSize="small" />}
                    </IconButton>
                  </Tooltip>
                </Box>

                {/* Metrics */}
                <Divider sx={{ my: 1.5 }} />
                <Box sx={{ display: 'flex', gap: 4 }}>
                  <Box>
                    <Typography variant="h6" fontWeight={700}>{m?.clicks ?? '—'}</Typography>
                    <Typography variant="caption" color="text.secondary">Clicks</Typography>
                  </Box>
                  <Box>
                    <Typography variant="h6" fontWeight={700}>{m?.conversions ?? '—'}</Typography>
                    <Typography variant="caption" color="text.secondary">Custom Requests</Typography>
                  </Box>
                  {m && m.clicks > 0 && (
                    <Box>
                      <Typography variant="h6" fontWeight={700}>
                        {m.conversions > 0 ? `${((m.conversions / m.clicks) * 100).toFixed(1)}%` : '0%'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">Conversion Rate</Typography>
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Card>
          );
        })}
      </Stack>

      {/* Edit dialog */}
      <Dialog open={!!editing} onClose={() => setEditing(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Campaign</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          {saveError && <Alert severity="error">{saveError}</Alert>}
          <TextField
            label="Name" value={editForm.name} required fullWidth
            onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
          />
          <TextField
            label="Description" value={editForm.description} multiline rows={2} fullWidth
            onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
          />
          <TextField
            label="Destination URL" value={editForm.destinationUrl} fullWidth
            onChange={(e) => setEditForm((p) => ({ ...p, destinationUrl: e.target.value }))}
            helperText="Where visitors land after clicking your referral link"
          />
          <FormControl fullWidth>
            <InputLabel>Status</InputLabel>
            <Select label="Status" value={editForm.status} onChange={(e) => setEditForm((p) => ({ ...p, status: e.target.value }))}>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="paused">Paused</MenuItem>
              <MenuItem value="archived">Archived</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditing(null)} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!snackbar}
        autoHideDuration={3000}
        onClose={() => setSnackbar('')}
        message={snackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}
