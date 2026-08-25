"use client";
import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Chip, CircularProgress, Alert, Stack, IconButton, Tooltip, Divider,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  MenuItem, Select, FormControl, InputLabel, Snackbar, Autocomplete
} from '@mui/material';
import {
  Add as AddIcon, Link as LinkIcon, ContentCopy as CopyIcon,
  Check as CheckIcon, Edit as EditIcon, Pause as PauseIcon,
  PlayArrow as ResumeIcon, Archive as ArchiveIcon, CampaignOutlined as CampaignIcon
} from '@mui/icons-material';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { REPAIRS_UI as UI } from '@/app/dashboard/repairs/components/repairsUi';

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

  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', description: '', destinationUrl: '', status: 'active' });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // What an affiliate can point a campaign at. Before this the destination was a
  // free-text URL, so promoting a specific piece meant knowing to type
  // `/products/<id>` — in practice every campaign just pointed at the request form.
  const [destinations, setDestinations] = useState([]);
  const [destQuery, setDestQuery] = useState('');

  useEffect(() => {
    if (!session) return undefined;
    const t = setTimeout(() => {
      fetch(`/api/affiliates/promotable${destQuery ? `?q=${encodeURIComponent(destQuery)}` : ''}`)
        .then((r) => r.json())
        .then((d) => { if (d.success) setDestinations(d.data.destinations || []); })
        .catch(() => {});
    }, 250); // debounce the search-as-you-type
    return () => clearTimeout(t);
  }, [session, destQuery]);

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
        <Box sx={{ maxWidth: 920, mb: 2 }}>
          <Typography
            sx={{
              display: 'inline-flex', alignItems: 'center', gap: 1,
              px: 1.25, py: 0.5, mb: 1.5,
              fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em',
              color: UI.textPrimary, backgroundColor: UI.bgCard,
              border: `1px solid ${UI.border}`, borderRadius: 2, textTransform: 'uppercase',
            }}
          >
            <CampaignIcon sx={{ fontSize: 16, color: UI.accent }} />
            Affiliate
          </Typography>
          <Typography sx={{ fontSize: { xs: 28, md: 36 }, fontWeight: 600, color: UI.textHeader, mb: 1 }}>
            Campaigns
          </Typography>
          <Typography sx={{ color: UI.textSecondary, lineHeight: 1.6 }}>
            Manage your referral campaigns and track performance.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => router.push('/dashboard/affiliate/campaigns/new')}
            sx={{ color: UI.textPrimary, borderColor: UI.border, backgroundColor: UI.bgCard }}
          >
            New Campaign
          </Button>
        </Box>
      </Box>

      {loading && <CircularProgress sx={{ color: UI.accent }} />}
      {error && <Alert severity="error">{error}</Alert>}
      {!loading && !error && campaigns.length === 0 && (
        <Box sx={{ p: 3, border: `1px solid ${UI.border}`, borderRadius: 2, backgroundColor: UI.bgCard }}>
          <Typography sx={{ color: UI.textSecondary }}>
            No campaigns yet. Create your first campaign to get a referral link.
          </Typography>
        </Box>
      )}

      <Stack spacing={2}>
        {campaigns.map((c) => {
          const url = referralUrl(c);
          const m = metrics[c.campaignId];
          return (
            <Box
              key={c.campaignId}
              sx={{
                border: `1px solid ${UI.border}`,
                borderRadius: 2,
                backgroundColor: UI.bgCard,
                p: 2.5,
              }}
            >
              {/* Header row */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="h6" sx={{ color: UI.textHeader, fontWeight: 600 }}>{c.name}</Typography>
                    <Chip label={c.status} color={STATUS_COLORS[c.status] || 'default'} size="small" />
                  </Box>
                  {c.description && (
                    <Typography variant="body2" sx={{ color: UI.textSecondary, mt: 0.5 }}>{c.description}</Typography>
                  )}
                </Box>

                <Box sx={{ display: 'flex', gap: 0.5, ml: 1 }}>
                  <Tooltip title="Edit">
                    <IconButton size="small" onClick={() => openEdit(c)} sx={{ color: UI.textMuted }}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  {c.status === 'active' && (
                    <Tooltip title="Pause">
                      <IconButton size="small" onClick={() => patchStatus(c, 'paused')} sx={{ color: UI.textMuted }}>
                        <PauseIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  {c.status === 'paused' && (
                    <Tooltip title="Resume">
                      <IconButton size="small" onClick={() => patchStatus(c, 'active')} sx={{ color: UI.textMuted }}>
                        <ResumeIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  {c.status !== 'archived' && (
                    <Tooltip title="Archive">
                      <IconButton size="small" onClick={() => patchStatus(c, 'archived')} sx={{ color: UI.textMuted }}>
                        <ArchiveIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  {c.status === 'archived' && (
                    <Tooltip title="Restore">
                      <IconButton size="small" onClick={() => patchStatus(c, 'active')} sx={{ color: UI.textMuted }}>
                        <ResumeIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              </Box>

              {c.destinationUrl && (
                <Typography variant="caption" sx={{ color: UI.textMuted, display: 'block', mt: 0.5 }}>
                  Destination: {c.destinationUrl}
                </Typography>
              )}

              {/* Referral link */}
              <Box
                sx={{
                  display: 'flex', alignItems: 'center', gap: 0.5,
                  mt: 1.5, p: 1,
                  backgroundColor: UI.bgTertiary,
                  border: `1px solid ${UI.border}`,
                  borderRadius: 1,
                }}
              >
                <LinkIcon fontSize="small" sx={{ color: UI.textMuted, flexShrink: 0 }} />
                <Typography variant="caption" sx={{ flex: 1, wordBreak: 'break-all', fontFamily: 'monospace', color: UI.textSecondary }}>
                  {url}
                </Typography>
                <Tooltip title={copied === c.campaignId ? 'Copied!' : 'Copy link'}>
                  <IconButton size="small" onClick={() => handleCopy(c.campaignId, url)} sx={{ color: UI.textMuted }}>
                    {copied === c.campaignId
                      ? <CheckIcon fontSize="small" color="success" />
                      : <CopyIcon fontSize="small" />}
                  </IconButton>
                </Tooltip>
              </Box>

              {/* Metrics */}
              <Divider sx={{ my: 1.5, borderColor: UI.border }} />
              <Box sx={{ display: 'flex', gap: 4 }}>
                <Box>
                  <Typography variant="h6" fontWeight={700} sx={{ color: UI.textHeader }}>{m?.clicks ?? '—'}</Typography>
                  <Typography variant="caption" sx={{ color: UI.textMuted }}>Clicks</Typography>
                </Box>
                <Box>
                  <Typography variant="h6" fontWeight={700} sx={{ color: UI.textHeader }}>{m?.conversions ?? '—'}</Typography>
                  <Typography variant="caption" sx={{ color: UI.textMuted }}>Custom Requests</Typography>
                </Box>
                {m && m.clicks > 0 && (
                  <Box>
                    <Typography variant="h6" fontWeight={700} sx={{ color: UI.textHeader }}>
                      {m.conversions > 0 ? `${((m.conversions / m.clicks) * 100).toFixed(1)}%` : '0%'}
                    </Typography>
                    <Typography variant="caption" sx={{ color: UI.textMuted }}>Conversion Rate</Typography>
                  </Box>
                )}
              </Box>
            </Box>
          );
        })}
      </Stack>

      {/* Edit dialog */}
      <Dialog open={!!editing} onClose={() => setEditing(null)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { backgroundColor: UI.bgPanel, border: `1px solid ${UI.border}` } }}
      >
        <DialogTitle sx={{ color: UI.textHeader }}>Edit Campaign</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          {saveError && <Alert severity="error">{saveError}</Alert>}
          <TextField label="Name" value={editForm.name} required fullWidth
            onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} />
          <TextField label="Description" value={editForm.description} multiline rows={2} fullWidth
            onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))} />
          {/* Pick what to promote, or type any path. freeSolo keeps the old behaviour
              available for anything the picker doesn't list yet. */}
          <Autocomplete
            freeSolo
            options={destinations}
            filterOptions={(x) => x} // server already filtered; don't double-filter
            getOptionLabel={(o) => (typeof o === 'string' ? o : o.path)}
            inputValue={editForm.destinationUrl}
            onInputChange={(_, v, reason) => {
              if (reason === 'input') { setEditForm((p) => ({ ...p, destinationUrl: v })); setDestQuery(v); }
            }}
            onChange={(_, v) => {
              const path = typeof v === 'string' ? v : v?.path || '';
              setEditForm((p) => ({ ...p, destinationUrl: path }));
            }}
            renderOption={(props, o) => (
              <Box component="li" {...props} key={o.id}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" noWrap>{o.label}</Typography>
                  <Typography variant="caption" sx={{ color: UI.textMuted }}>
                    {o.sublabel}{o.price ? ` · $${Number(o.price).toLocaleString()}` : ''} · {o.path}
                  </Typography>
                </Box>
              </Box>
            )}
            renderInput={(params) => (
              <TextField {...params} label="What are you promoting?" fullWidth
                helperText="Pick a page or product — or type any path. This is where your link lands." />
            )}
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
