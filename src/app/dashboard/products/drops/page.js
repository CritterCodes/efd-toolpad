'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, Button, Paper, TextField, InputAdornment,
  Tabs, Tab, Stack, Chip, CircularProgress, Snackbar, Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import SearchIcon from '@mui/icons-material/Search';
import InboxIcon from '@mui/icons-material/Inbox';
import EditIcon from '@mui/icons-material/Edit';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';

// Drop lifecycle tabs. Labels are the owner's mental model; `statuses` are the
// domain statuses each tab surfaces. `vault` is a NEW status (Disney-vault:
// visible in the shop but not purchasable) distinct from `archived` (retired).
const DROP_TABS = [
  { key: 'planned', label: 'Planned', statuses: ['draft'], empty: 'No planned drops. Create one to start planning a release.' },
  { key: 'scheduled', label: 'Scheduled', statuses: ['scheduled'], empty: 'No scheduled drops. Set a release date on a planned drop to schedule it.' },
  { key: 'dropped', label: 'Dropped', statuses: ['released'], empty: 'No dropped releases yet. Scheduled drops appear here once they go live.' },
  { key: 'vault', label: 'Vault', statuses: ['vault'], empty: 'The vault is empty. Vaulted drops stay visible in the shop but can’t be purchased.' },
];

const STATUS_COLOR = {
  draft: REPAIRS_UI.textMuted,
  scheduled: '#FFB74D',
  released: '#66BB6A',
  vault: '#B58BE0',
  archived: REPAIRS_UI.textMuted,
};

// Friendly per-card status label, aligned with the tab vocabulary.
const STATUS_LABEL = { draft: 'planned', scheduled: 'scheduled', released: 'dropped', vault: 'vault', archived: 'archived' };

const fmtDate = (d) => d ? new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const ownerLabel = (drop) => drop.ownerType === 'artisan' ? (drop.ownerInfo?.name || drop.ownerId || 'Artisan') : 'EFD';
const designCount = (drop) => Array.isArray(drop.designOrder) ? drop.designOrder.length : 0;

const StatusChip = ({ status }) => (
  <Chip
    size="small"
    label={STATUS_LABEL[status] || status || 'planned'}
    sx={{
      backgroundColor: `${STATUS_COLOR[status] || REPAIRS_UI.textMuted}22`,
      color: STATUS_COLOR[status] || REPAIRS_UI.textMuted,
      textTransform: 'capitalize',
      fontWeight: 700,
      fontSize: '0.72rem',
      flexShrink: 0,
    }}
  />
);

export default function DropsPage() {
  const router = useRouter();
  const [drops, setDrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('planned');
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });

  const showSnack = (message, severity = 'error') => setSnack({ open: true, message, severity });
  const closeSnack = () => setSnack((s) => ({ ...s, open: false }));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/production/drops');
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to load drops');
      setDrops(await res.json());
    } catch (e) {
      showSnack(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const activeTab = DROP_TABS.find((t) => t.key === tab) || DROP_TABS[0];

  const tabCounts = useMemo(() => {
    const counts = Object.fromEntries(DROP_TABS.map((t) => [t.key, 0]));
    for (const d of drops) {
      const t = DROP_TABS.find((x) => x.statuses.includes(d.status || 'draft'));
      if (t) counts[t.key] += 1;
    }
    return counts;
  }, [drops]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return drops.filter((d) => {
      if (!activeTab.statuses.includes(d.status || 'draft')) return false;
      if (!q) return true;
      return [d.name, d.slug, d.description].filter(Boolean).join(' ').toLowerCase().includes(q);
    });
  }, [drops, search, activeTab]);

  return (
    <Box sx={{ pb: 6 }}>
      <Box sx={{
        backgroundColor: { xs: 'transparent', sm: REPAIRS_UI.bgPanel },
        border: { xs: 'none', sm: `1px solid ${REPAIRS_UI.border}` },
        borderRadius: { xs: 0, sm: 3 },
        boxShadow: { xs: 'none', sm: REPAIRS_UI.shadow },
        p: { xs: 0.5, sm: 2.5, md: 3 },
        mb: 3,
      }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography sx={{
              display: 'inline-flex', alignItems: 'center', gap: 1,
              px: 1.25, py: 0.5, mb: 1.5, fontSize: '0.72rem', fontWeight: 700,
              letterSpacing: '0.08em', color: REPAIRS_UI.textPrimary,
              backgroundColor: REPAIRS_UI.bgCard, border: `1px solid ${REPAIRS_UI.border}`,
              borderRadius: 2, textTransform: 'uppercase',
            }}>
              <RocketLaunchIcon sx={{ fontSize: 16, color: REPAIRS_UI.accent }} />
              Products
            </Typography>
            <Typography sx={{ fontSize: { xs: 28, md: 36 }, fontWeight: 600, color: REPAIRS_UI.textHeader, mb: 0.5 }}>
              Drops
            </Typography>
            <Typography sx={{ color: REPAIRS_UI.textSecondary, lineHeight: 1.6 }}>
              Release drops own their timing and contain the designs and pieces for that release.
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => router.push('/dashboard/products/drops/new')}
            sx={{ backgroundColor: REPAIRS_UI.accent, color: '#1A1A1A', fontWeight: 600, '&:hover': { backgroundColor: '#C19B2E' } }}
          >
            New Drop
          </Button>
        </Stack>
      </Box>

      <Box sx={{ mb: 2 }}>
        <Tabs
          value={tab}
          onChange={(e, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            minHeight: 0, mb: 2,
            borderBottom: `1px solid ${REPAIRS_UI.border}`,
            '& .MuiTabs-indicator': { backgroundColor: REPAIRS_UI.accent, height: 2 },
            '& .MuiTabs-scrollButtons.Mui-disabled': { opacity: 0.3 },
            '& .MuiTab-root': {
              minHeight: 0, py: 1.25, px: 2, textTransform: 'none', fontWeight: 600,
              fontSize: '0.9rem', color: REPAIRS_UI.textSecondary,
              '&.Mui-selected': { color: REPAIRS_UI.textHeader },
            },
          }}
        >
          {DROP_TABS.map((t) => (
            <Tab
              key={t.key}
              value={t.key}
              disableRipple
              label={
                <Stack direction="row" alignItems="center" spacing={1}>
                  <span>{t.label}</span>
                  <Box component="span" sx={{
                    minWidth: 20, textAlign: 'center', px: 0.75, py: 0.15, borderRadius: 1,
                    fontSize: '0.72rem', fontWeight: 700,
                    color: tab === t.key ? '#1A1A1A' : REPAIRS_UI.textSecondary,
                    backgroundColor: tab === t.key ? REPAIRS_UI.accent : REPAIRS_UI.bgCard,
                    border: `1px solid ${tab === t.key ? REPAIRS_UI.accent : REPAIRS_UI.border}`,
                  }}>{tabCounts[t.key]}</Box>
                </Stack>
              }
            />
          ))}
        </Tabs>
        <TextField
          placeholder="Search by name, slug, description…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="small"
          fullWidth
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: REPAIRS_UI.textSecondary }} /></InputAdornment> }}
        />
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress sx={{ color: REPAIRS_UI.accent }} /></Box>
      ) : filtered.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center', backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px dashed ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' }}>
          <InboxIcon sx={{ fontSize: 48, color: REPAIRS_UI.textMuted, mb: 1 }} />
          <Typography sx={{ color: REPAIRS_UI.textSecondary }}>
            {search.trim() ? 'No drops match your search.' : activeTab.empty}
          </Typography>
        </Paper>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 1.5 }}>
          {filtered.map((drop) => (
            <Paper
              key={drop.dropId}
              onClick={() => router.push(`/dashboard/products/drops/${drop.dropId}`)}
              sx={{
                display: 'flex', flexDirection: 'column',
                p: 2, cursor: 'pointer', backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none',
                border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none',
                transition: 'border-color 0.15s, background-color 0.15s',
                '&:hover': { borderColor: REPAIRS_UI.accent, backgroundColor: REPAIRS_UI.bgTertiary },
                '&:active': { backgroundColor: REPAIRS_UI.bgTertiary, borderColor: REPAIRS_UI.accent },
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 600, color: REPAIRS_UI.textHeader, fontSize: '0.95rem', lineHeight: 1.3 }}>{drop.name}</Typography>
                  <Typography sx={{ color: REPAIRS_UI.textMuted, fontSize: '0.75rem' }}>{drop.slug}</Typography>
                </Box>
                <StatusChip status={drop.status} />
              </Stack>
              <Stack direction="row" spacing={3} sx={{ mt: 1.75 }}>
                {[
                  { label: 'Owner', value: ownerLabel(drop) },
                  { label: 'Release', value: fmtDate(drop.releaseAt) },
                  { label: 'Designs', value: designCount(drop) },
                ].map(({ label, value }) => (
                  <Box key={label} sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: '0.62rem', color: REPAIRS_UI.textSecondary, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</Typography>
                    <Typography sx={{ fontSize: '0.85rem', color: REPAIRS_UI.textPrimary, fontWeight: 500 }} noWrap>{value}</Typography>
                  </Box>
                ))}
              </Stack>
              <Stack direction="row" spacing={1} sx={{ mt: 2, pt: 1.75, borderTop: `1px solid ${REPAIRS_UI.border}` }}>
                <Button
                  size="small" variant="outlined" startIcon={<OpenInNewIcon sx={{ fontSize: 15 }} />}
                  onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/products/drops/${drop.dropId}`); }}
                  sx={{ color: REPAIRS_UI.textPrimary, borderColor: REPAIRS_UI.border, textTransform: 'none', flex: 1, '&:hover': { borderColor: REPAIRS_UI.accent } }}
                >Open</Button>
                <Button
                  size="small" variant="outlined" startIcon={<EditIcon sx={{ fontSize: 15 }} />}
                  onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/products/drops/${drop.dropId}/edit`); }}
                  sx={{ color: REPAIRS_UI.textPrimary, borderColor: REPAIRS_UI.border, textTransform: 'none', flex: 1, '&:hover': { borderColor: REPAIRS_UI.accent } }}
                >Edit</Button>
              </Stack>
            </Paper>
          ))}
        </Box>
      )}

      <Snackbar open={snack.open} autoHideDuration={5000} onClose={closeSnack} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={closeSnack} severity={snack.severity} sx={{ backgroundColor: REPAIRS_UI.bgCard, color: REPAIRS_UI.textPrimary, border: `1px solid ${REPAIRS_UI.border}` }}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
