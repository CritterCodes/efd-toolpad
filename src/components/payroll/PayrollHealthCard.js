'use client';
/**
 * Payroll health — the top of the payroll page.
 *
 * Answers the two questions the page could not answer before:
 *   "did payroll run?"             — a run that pays nobody used to leave no trace at all, so a healthy
 *                                    quiet Wednesday looked exactly like a cron that never fired.
 *   "how much do I need in Stripe?" — a Connect transfer can only spend balance that is already there,
 *                                    and nothing tops it up automatically unless funding is switched on.
 *
 * Reads GET /api/repairs/payroll/status.
 */
import React, { useEffect, useState } from 'react';
import { Box, Button, Chip, CircularProgress, Collapse, Stack, Typography } from '@mui/material';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';

const money = (n) => Number(n || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
const when = (d) => (d ? new Date(d).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'never');
const day = (d) => (d ? new Date(d).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }) : '—');

export default function PayrollHealthCard({ sx }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    fetch('/api/repairs/payroll/status')
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.error || 'Could not load payroll health.');
        setData(d);
      })
      .catch((e) => setError(e.message));
  }, []);

  if (error) return null; // the page's own data still matters more than this card
  if (!data) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 2, ...sx }}>
        <CircularProgress size={20} sx={{ color: REPAIRS_UI.accent }} />
      </Box>
    );
  }

  const weekly = (data.runs || []).find((r) => r.job === 'weekly-payroll') || {};
  const others = (data.runs || []).filter((r) => r.job !== 'weekly-payroll');
  const anyOverdue = (data.runs || []).some((r) => r.overdue);
  const short = Number(data.shortfall);
  const needsMoney = Number.isFinite(short) && short > 0;
  const projected = Number(data.due?.projected || 0);

  const headlineColor = anyOverdue ? '#F87171' : needsMoney ? REPAIRS_UI.accent : '#66BB6A';
  const HeadlineIcon = anyOverdue ? ErrorOutlineIcon : needsMoney ? MonitorHeartIcon : CheckCircleIcon;

  return (
    <Box sx={{ bgcolor: REPAIRS_UI.bgPanel, border: `1px solid ${anyOverdue ? '#F87171' : REPAIRS_UI.border}`, borderRadius: 3, p: { xs: 2, md: 2.5 }, mb: 3, ...sx }}>
      <Stack direction="row" spacing={1.5} alignItems="flex-start">
        <HeadlineIcon sx={{ color: headlineColor, mt: 0.25 }} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ color: REPAIRS_UI.textHeader, fontWeight: 700 }}>
            {weekly.neverRun
              ? 'Payroll has never run'
              : weekly.overdue
                ? `Payroll has not run since ${when(weekly.lastRanAt)}`
                : `Payroll last ran ${when(weekly.lastRanAt)}`}
          </Typography>
          {weekly.summary && !weekly.neverRun && (
            <Typography variant="body2" sx={{ color: weekly.ok === false ? '#F87171' : REPAIRS_UI.textSecondary }}>
              {weekly.summary}
            </Typography>
          )}
          <Typography variant="caption" sx={{ display: 'block', color: REPAIRS_UI.textMuted, mt: 0.5 }}>
            Next run {day(data.nextPayrollRunAt)} · money reaches banks the Friday after
          </Typography>
        </Box>
        <Button size="small" onClick={() => setShowAll((v) => !v)} sx={{ color: REPAIRS_UI.textSecondary, textTransform: 'none', flexShrink: 0 }}>
          {showAll ? 'Less' : 'All jobs'}
        </Button>
      </Stack>

      {/* What has to be sitting in Stripe before that run can pay anyone. */}
      <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${REPAIRS_UI.border}` }}>
        <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
          <Box>
            <Typography variant="caption" sx={{ display: 'block', color: REPAIRS_UI.textMuted }}>Due next run</Typography>
            <Typography sx={{ fontWeight: 700, fontSize: 20, color: REPAIRS_UI.textHeader, fontVariantNumeric: 'tabular-nums' }}>{money(projected)}</Typography>
            {data.due?.payees?.length > 0 && (
              <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }}>{data.due.payees.join(', ')}</Typography>
            )}
          </Box>
          <Box>
            <Typography variant="caption" sx={{ display: 'block', color: REPAIRS_UI.textMuted }}>In Stripe now</Typography>
            <Typography sx={{ fontWeight: 700, fontSize: 20, color: REPAIRS_UI.textHeader, fontVariantNumeric: 'tabular-nums' }}>
              {data.balance?.error || !data.balance ? '—' : money(data.balance.available)}
            </Typography>
            <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }}>
              {data.balance?.error ? 'Stripe unreachable' : data.balance ? `${money(data.balance.pending)} still settling` : 'Stripe not configured'}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ display: 'block', color: REPAIRS_UI.textMuted }}>
              {needsMoney ? 'Add before the run' : 'Covered'}
            </Typography>
            <Typography sx={{ fontWeight: 700, fontSize: 20, color: needsMoney ? REPAIRS_UI.accent : '#66BB6A', fontVariantNumeric: 'tabular-nums' }}>
              {short === null || !Number.isFinite(short) ? '—' : needsMoney ? money(short) : money(0)}
            </Typography>
            {data.funding && (
              <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }}>
                {data.funding.enabled ? `auto top-up on · floor ${money(data.funding.floor)}` : 'auto top-up off'}
              </Typography>
            )}
          </Box>
        </Stack>
        {needsMoney && (
          <Typography variant="caption" sx={{ display: 'block', color: REPAIRS_UI.textMuted, mt: 1.5, lineHeight: 1.6 }}>
            A transfer can only spend money already in Stripe. Add {money(short)} from Balances → Add to balance
            {data.funding?.enabled ? '' : ', or turn auto top-up on in Store Settings'} — a bank transfer takes 1–2 business days, so start it by Monday.
          </Typography>
        )}
      </Box>

      <Collapse in={showAll}>
        <Stack spacing={1} sx={{ mt: 2, pt: 2, borderTop: `1px solid ${REPAIRS_UI.border}` }}>
          {others.map((r) => (
            <Stack key={r.job} direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
              <Chip
                size="small"
                label={r.neverRun ? 'never run' : r.overdue ? 'overdue' : r.ok === false ? 'failed' : 'ok'}
                color={r.neverRun || r.overdue || r.ok === false ? 'warning' : 'success'}
              />
              <Typography variant="body2" sx={{ color: REPAIRS_UI.textHeader, minWidth: 150 }}>{r.label}</Typography>
              <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted, flex: 1, minWidth: 180 }}>
                {r.neverRun ? 'no run recorded yet' : `${when(r.lastRanAt)} — ${r.summary || 'ran'}`}
              </Typography>
            </Stack>
          ))}
          <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted, mt: 0.5 }}>
            Each payroll job stamps a heartbeat whether or not it moves money, so &ldquo;nothing to pay&rdquo; is a visible outcome rather than silence.
          </Typography>
        </Stack>
      </Collapse>
    </Box>
  );
}
