'use client';
/**
 * Clock in / clock out (owner, 2026-09-29: "just a clock-in/clock-out button for her").
 *
 * One button, the elapsed time while it runs, and this week's total underneath — an hourly person
 * should be able to see that today counted without asking anybody. Clocking out credits the shift,
 * which is what puts it on payroll.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, CircularProgress, Stack, Typography } from '@mui/material';
import ScheduleIcon from '@mui/icons-material/Schedule';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';

const money = (n) => Number(n || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
const two = (n) => String(n).padStart(2, '0');

/** Pure: an elapsed span as h:mm:ss, which is what a running clock should look like. */
export function elapsedLabel(fromISO, now = Date.now()) {
  const start = new Date(fromISO).getTime();
  if (!Number.isFinite(start) || now <= start) return '0:00:00';
  const total = Math.floor((now - start) / 1000);
  return `${Math.floor(total / 3600)}:${two(Math.floor((total % 3600) / 60))}:${two(total % 60)}`;
}

export default function TimeClockCard({ sx }) {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [, forceTick] = useState(0);
  const tick = useRef(null);

  const load = useCallback(() => {
    fetch('/api/time')
      .then((r) => r.json())
      .then((body) => setData(body?.error ? null : body))
      .catch(() => setData(null));
  }, []);
  useEffect(() => { load(); }, [load]);

  // Only run a timer while the clock is actually running.
  useEffect(() => {
    if (!data?.open) {
      if (tick.current) clearInterval(tick.current);
      tick.current = null;
      return undefined;
    }
    tick.current = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(tick.current);
  }, [data?.open]);

  const press = async (action) => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/time', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Could not record that.');
      if (action === 'out' && body.credited) {
        setMsg({
          severity: body.needsRate ? 'warning' : 'success',
          text: body.needsRate
            ? `${body.shift.hours} h recorded, but there is no hourly rate on your account yet — ask an admin to set it.`
            : `${body.shift.hours} h recorded — ${money(body.shift.value)}. It will be on your next payroll.`,
        });
      }
      load();
    } catch (e) {
      setMsg({ severity: 'error', text: e.message });
    } finally {
      setBusy(false);
    }
  };

  // The clock is only for people paid by the hour. A shift already running still shows, so someone
  // moved off the Apprentice rung mid-shift can clock out instead of leaving it open forever.
  if (!data || (!data.canClock && !data.open)) return null;
  const open = data.open;

  return (
    <Card sx={{ bgcolor: REPAIRS_UI.bgPanel, border: `1px solid ${open ? REPAIRS_UI.accent : REPAIRS_UI.border}`, ...sx }}>
      <CardContent>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
          <ScheduleIcon sx={{ color: open ? REPAIRS_UI.accent : REPAIRS_UI.textSecondary }} />
          <Typography sx={{ fontWeight: 700, color: REPAIRS_UI.textHeader, flex: 1 }}>
            {open ? 'On the clock' : 'Time clock'}
          </Typography>
        </Stack>

        {open && (
          <Typography sx={{ fontFamily: REPAIRS_UI.mono || 'monospace', fontSize: 34, fontWeight: 700, color: REPAIRS_UI.accent, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
            {elapsedLabel(open.startedAt)}
          </Typography>
        )}

        <Button
          fullWidth
          size="large"
          variant={open ? 'outlined' : 'contained'}
          onClick={() => press(open ? 'out' : 'in')}
          disabled={busy}
          startIcon={busy ? <CircularProgress size={16} sx={{ color: 'inherit' }} /> : null}
          sx={{ mt: 1.5, minHeight: 52, fontWeight: 700, textTransform: 'none', borderRadius: 2 }}
        >
          {busy ? 'Saving…' : open ? 'Clock out' : 'Clock in'}
        </Button>

        <Box sx={{ mt: 1.5 }}>
          <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }}>
            {data.summary?.count
              ? `${data.summary.hours} h recorded · ${money(data.summary.value)}`
              : 'No hours recorded yet.'}
          </Typography>
        </Box>

        {msg && <Alert severity={msg.severity} sx={{ mt: 1.5 }} onClose={() => setMsg(null)}>{msg.text}</Alert>}
      </CardContent>
    </Card>
  );
}
