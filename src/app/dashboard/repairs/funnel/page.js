"use client";

/**
 * Where people give up on the repair landing pages.
 *
 * The ads have good click-through and almost no leads, so the loss is between
 * the click and the form. This is the screen that says which step loses them.
 *
 * Counts are DISTINCT SESSIONS, not events — someone who backs up and re-picks
 * a metal would otherwise make the funnel look like it grew in the middle.
 * Staff test runs (?test=1) are excluded unless you ask for them.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControlLabel,
  LinearProgress,
  Stack,
  Switch,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';

const RANGES = [
  { key: 7, label: '7 days' },
  { key: 14, label: '14 days' },
  { key: 30, label: '30 days' },
];

const VARIANTS = [
  { key: '', label: 'Both pages' },
  { key: 'wait', label: 'While you wait' },
  { key: 'quote', label: 'Instant quote' },
];

const secs = (ms) => (ms == null ? '—' : ms < 1000 ? '<1s' : `${Math.round(ms / 1000)}s`);

function StepRow({ row, topSessions, isWorst }) {
  const pct = topSessions ? (row.sessions / topSessions) * 100 : 0;
  return (
    <Box sx={{ mb: 1.75 }}>
      <Stack direction="row" alignItems="baseline" spacing={1} sx={{ mb: 0.5 }}>
        <Typography sx={{ color: REPAIRS_UI.textPrimary, fontSize: 14.5, flex: 1 }}>
          {row.label}
          {isWorst && (
            <Chip
              size="small"
              label="biggest leak"
              sx={{
                ml: 1,
                height: 18,
                fontSize: 10,
                backgroundColor: 'transparent',
                border: '1px solid #B4736A',
                color: '#B4736A',
              }}
            />
          )}
        </Typography>
        <Typography sx={{ color: REPAIRS_UI.textPrimary, fontSize: 15, fontWeight: 600, minWidth: 44, textAlign: 'right' }}>
          {row.sessions}
        </Typography>
        <Typography sx={{ color: REPAIRS_UI.textMuted, fontSize: 12.5, minWidth: 54, textAlign: 'right' }}>
          {row.pctOfTop}%
        </Typography>
        <Tooltip title="Share of the previous step that made it here">
          <Typography
            sx={{
              color: row.pctOfPrev != null && row.pctOfPrev < 60 ? '#B4736A' : REPAIRS_UI.textSecondary,
              fontSize: 12.5,
              minWidth: 66,
              textAlign: 'right',
            }}
          >
            {row.pctOfPrev == null ? '—' : `kept ${row.pctOfPrev}%`}
          </Typography>
        </Tooltip>
        <Tooltip title="How long the people who quit here sat on this step first">
          <Typography sx={{ color: REPAIRS_UI.textMuted, fontSize: 12.5, minWidth: 46, textAlign: 'right' }}>
            {secs(row.medianDwellMs)}
          </Typography>
        </Tooltip>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={Math.min(pct, 100)}
        sx={{
          height: 7,
          borderRadius: 4,
          backgroundColor: REPAIRS_UI.bgTertiary,
          '& .MuiLinearProgress-bar': {
            backgroundColor: isWorst ? '#B4736A' : REPAIRS_UI.accent,
            borderRadius: 4,
          },
        }}
      />
    </Box>
  );
}

export default function FunnelPage() {
  const [days, setDays] = useState(7);
  const [variant, setVariant] = useState('');
  const [includeTest, setIncludeTest] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ days: String(days) });
      if (variant) params.set('variant', variant);
      if (includeTest) params.set('includeTest', '1');
      const res = await fetch(`/api/funnel?${params}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Could not load the funnel.');
      setData(json.data);
    } catch (e) {
      setError(e.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [days, variant, includeTest]);

  useEffect(() => {
    load();
  }, [load]);

  const steps = data?.steps || [];
  const top = steps[0]?.sessions || 0;
  const done = steps.find((s) => s.step === 'done')?.sessions || 0;
  const worstStep = data?.biggestDropOff?.at;

  return (
    <Box sx={{ p: 3, backgroundColor: REPAIRS_UI.bgPrimary, minHeight: '100vh' }}>
      <Typography variant="h5" sx={{ color: REPAIRS_UI.textPrimary, fontWeight: 600 }}>
        Where people bail
      </Typography>
      <Typography sx={{ color: REPAIRS_UI.textMuted, fontSize: 13, mb: 2 }}>
        Distinct visitors reaching each step of the repair landing pages. Test runs are excluded.
      </Typography>

      <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={days}
          onChange={(_e, v) => v && setDays(v)}
          sx={{ '& .MuiToggleButton-root': { color: REPAIRS_UI.textSecondary, borderColor: REPAIRS_UI.border }, '& .Mui-selected': { color: `${REPAIRS_UI.accent} !important` } }}
        >
          {RANGES.map((r) => (
            <ToggleButton key={r.key} value={r.key}>{r.label}</ToggleButton>
          ))}
        </ToggleButtonGroup>

        <ToggleButtonGroup
          exclusive
          size="small"
          value={variant}
          onChange={(_e, v) => setVariant(v ?? '')}
          sx={{ '& .MuiToggleButton-root': { color: REPAIRS_UI.textSecondary, borderColor: REPAIRS_UI.border }, '& .Mui-selected': { color: `${REPAIRS_UI.accent} !important` } }}
        >
          {VARIANTS.map((v) => (
            <ToggleButton key={v.key || 'all'} value={v.key}>{v.label}</ToggleButton>
          ))}
        </ToggleButtonGroup>

        <FormControlLabel
          control={<Switch size="small" checked={includeTest} onChange={(e) => setIncludeTest(e.target.checked)} />}
          label={<Typography sx={{ color: REPAIRS_UI.textSecondary, fontSize: 13 }}>Include test runs</Typography>}
        />

        <Button size="small" startIcon={<RefreshIcon fontSize="small" />} onClick={load} sx={{ color: REPAIRS_UI.textSecondary }}>
          Refresh
        </Button>
      </Stack>

      <Divider sx={{ borderColor: REPAIRS_UI.border, mb: 2 }} />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Stack alignItems="center" sx={{ py: 6 }}>
          <CircularProgress sx={{ color: REPAIRS_UI.accent }} />
        </Stack>
      ) : steps.length === 0 ? (
        <Box sx={{ py: 6, textAlign: 'center' }}>
          <Typography sx={{ color: REPAIRS_UI.textSecondary }}>No visits recorded in this window.</Typography>
          <Typography sx={{ color: REPAIRS_UI.textMuted, fontSize: 13, mt: 0.5 }}>
            The ads still point at the old /repair page, so the new pages get almost no traffic yet.
          </Typography>
        </Box>
      ) : (
        <>
          <Stack direction="row" spacing={3} sx={{ mb: 3 }} flexWrap="wrap" useFlexGap>
            {[
              ['Visitors', top],
              ['Leads', done],
              ['Conversion', top ? `${Math.round((done / top) * 1000) / 10}%` : '—'],
              ['Saw a price', data?.totals?.quotedSessions ?? 0],
            ].map(([label, value]) => (
              <Box key={label}>
                <Typography sx={{ color: REPAIRS_UI.textMuted, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {label}
                </Typography>
                <Typography sx={{ color: REPAIRS_UI.accent, fontSize: 26, fontWeight: 600, lineHeight: 1.1 }}>
                  {value}
                </Typography>
              </Box>
            ))}
          </Stack>

          {data?.biggestDropOff?.lost > 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Biggest leak: <strong>{data.biggestDropOff.lost}</strong> lost between &ldquo;
              {data.biggestDropOff.after}&rdquo; and &ldquo;{data.biggestDropOff.at}&rdquo; — only{' '}
              {data.biggestDropOff.survived}% carried through.
            </Alert>
          )}

          <Stack direction="row" spacing={1} sx={{ mb: 1, pr: 0.5 }}>
            <Typography sx={{ flex: 1 }} />
            {['people', 'of top', 'kept', 'quit after'].map((h, i) => (
              <Typography
                key={h}
                sx={{ color: REPAIRS_UI.textMuted, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.06em', minWidth: [44, 54, 66, 46][i], textAlign: 'right' }}
              >
                {h}
              </Typography>
            ))}
          </Stack>

          {steps.map((row) => (
            <StepRow key={row.step} row={row} topSessions={top} isWorst={row.label === worstStep && data.biggestDropOff.lost > 0} />
          ))}

          {data?.abandonsByQuote?.length > 0 && (
            <Box sx={{ mt: 4 }}>
              <Typography sx={{ color: REPAIRS_UI.textPrimary, fontWeight: 600, mb: 0.5 }}>
                Did the price scare them off?
              </Typography>
              <Typography sx={{ color: REPAIRS_UI.textMuted, fontSize: 12.5, mb: 1.5 }}>
                People who quit after an estimate was already on screen, grouped by what it said.
              </Typography>
              <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                {data.abandonsByQuote.map((b) => (
                  <Box key={String(b.from)} sx={{ px: 2, py: 1, borderRadius: 1.5, border: '1px solid', borderColor: REPAIRS_UI.border, backgroundColor: REPAIRS_UI.bgCard }}>
                    <Typography sx={{ color: REPAIRS_UI.textSecondary, fontSize: 12 }}>
                      {typeof b.from === 'number' ? `$${b.from}+` : 'unknown'}
                    </Typography>
                    <Typography sx={{ color: REPAIRS_UI.textPrimary, fontSize: 18, fontWeight: 600 }}>{b.abandons}</Typography>
                  </Box>
                ))}
              </Stack>
            </Box>
          )}

          <Typography sx={{ color: REPAIRS_UI.textMuted, fontSize: 12, mt: 4 }}>
            Counts are distinct visitors, not clicks. &ldquo;Quit after&rdquo; is how long the people who
            gave up on a step sat there first — a couple of seconds means wrong page, a minute means
            hesitation.
          </Typography>
        </>
      )}
    </Box>
  );
}
