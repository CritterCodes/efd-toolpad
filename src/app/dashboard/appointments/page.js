"use client";

/**
 * The bench day.
 *
 * efd-shop sells booked while-you-wait slots to paid traffic. Until this page
 * existed nothing in admin could read the `appointments` collection at all, so
 * someone could book Monday at 3pm off an ad and the shop would find out when
 * they walked through the door.
 *
 * The page answers one question — who is coming, and when — and offers the four
 * things the counter actually does about it.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  ChevronLeft as PrevIcon,
  ChevronRight as NextIcon,
  CheckCircle as ConfirmIcon,
  DirectionsWalk as ArrivedIcon,
  EventBusy as CancelIcon,
  Schedule as RescheduleIcon,
  Today as TodayIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { REPAIRS_UI, repairsMenuProps } from '@/app/dashboard/repairs/components/repairsUi';

/** Must match efd-shop lib/appointments.js DEFAULT_CONFIG.slotTimes. */
const SLOT_TIMES = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'];

const prettyTime = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  const suffix = h < 12 ? 'am' : 'pm';
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${suffix}`;
};

/** Today in the shop's zone, not the browser's — staff travel, the bench doesn't. */
const todayISO = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

const shiftDate = (iso, days) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

const headingFor = (iso) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

const STATUS_COLOUR = {
  scheduled: REPAIRS_UI.accent,
  confirmed: '#7FBF7F',
  'in-progress': '#7FA8D4',
  blocked: REPAIRS_UI.textMuted,
  cancelled: '#B4736A',
};

function BookingCard({ appt, busy, onAction }) {
  const cancelled = appt.status === 'cancelled' || !appt.active;
  // A walk-in hold is the shop's own row, not a customer with an appointment.
  const isWalkIn = appt.source === 'walkin';

  return (
    <Box
      sx={{
        p: 2,
        mb: 1.5,
        borderRadius: 2,
        border: '1px solid',
        borderColor: REPAIRS_UI.border,
        backgroundColor: REPAIRS_UI.bgCard,
        opacity: cancelled ? 0.5 : 1,
      }}
    >
      <Stack direction="row" spacing={2} alignItems="flex-start" flexWrap="wrap">
        <Box sx={{ minWidth: 92 }}>
          <Typography sx={{ color: REPAIRS_UI.textPrimary, fontWeight: 600, fontSize: 18 }}>
            {prettyTime(appt.startTimeLocal)}
          </Typography>
          <Chip
            size="small"
            label={appt.status}
            sx={{
              mt: 0.5,
              height: 20,
              fontSize: 11,
              color: STATUS_COLOUR[appt.status] || REPAIRS_UI.textSecondary,
              borderColor: STATUS_COLOUR[appt.status] || REPAIRS_UI.border,
              backgroundColor: 'transparent',
              border: '1px solid',
            }}
          />
        </Box>

        <Box sx={{ flex: 1, minWidth: 220 }}>
          <Typography sx={{ color: REPAIRS_UI.textPrimary, fontWeight: 500 }}>
            {appt.clientName || (isWalkIn ? 'Walk-in — bench busy' : 'No name given')}
          </Typography>
          {!isWalkIn && (
            <Typography sx={{ color: REPAIRS_UI.textSecondary, fontSize: 13 }}>
              {[appt.clientPhone, appt.clientEmail].filter(Boolean).join(' · ') || 'No contact on file'}
            </Typography>
          )}
          {appt.repair?.description && (
            <Typography sx={{ color: REPAIRS_UI.textMuted, fontSize: 13, mt: 0.75, whiteSpace: 'pre-wrap' }}>
              {appt.repair.description}
            </Typography>
          )}
          {appt.notes && (
            <Typography sx={{ color: REPAIRS_UI.textMuted, fontSize: 12, mt: 0.5, fontStyle: 'italic' }}>
              {appt.notes}
            </Typography>
          )}
          {appt.repairID && (
            <Button
              size="small"
              href={`/dashboard/repairs/${appt.repairID}`}
              sx={{ mt: 0.5, pl: 0, color: REPAIRS_UI.accent, fontSize: 12 }}
            >
              {appt.repairID} · {appt.repair?.status || 'unknown status'}
            </Button>
          )}
        </Box>

        {!cancelled && !isWalkIn && (
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {appt.status !== 'confirmed' && appt.status !== 'in-progress' && (
              <Tooltip title="Tell the customer their slot is confirmed">
                <span>
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={busy}
                    startIcon={<ConfirmIcon fontSize="small" />}
                    onClick={() => onAction(appt, 'confirm')}
                    sx={{ color: REPAIRS_UI.textPrimary, borderColor: REPAIRS_UI.border }}
                  >
                    Confirm
                  </Button>
                </span>
              </Tooltip>
            )}
            {appt.repairID && appt.status !== 'in-progress' && (
              <Tooltip title="They're here — send it to the bench as a while-you-wait repair">
                <span>
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={busy}
                    startIcon={<ArrivedIcon fontSize="small" />}
                    onClick={() => onAction(appt, 'arrive')}
                    sx={{ color: REPAIRS_UI.accent, borderColor: REPAIRS_UI.accent }}
                  >
                    Arrived
                  </Button>
                </span>
              </Tooltip>
            )}
            <Button
              size="small"
              variant="outlined"
              disabled={busy}
              startIcon={<RescheduleIcon fontSize="small" />}
              onClick={() => onAction(appt, 'reschedule')}
              sx={{ color: REPAIRS_UI.textPrimary, borderColor: REPAIRS_UI.border }}
            >
              Move
            </Button>
            <Button
              size="small"
              variant="outlined"
              disabled={busy}
              startIcon={<CancelIcon fontSize="small" />}
              onClick={() => onAction(appt, 'cancel')}
              sx={{ color: '#B4736A', borderColor: REPAIRS_UI.border }}
            >
              Cancel
            </Button>
          </Stack>
        )}

        {isWalkIn && !cancelled && (
          <Button
            size="small"
            variant="outlined"
            disabled={busy}
            onClick={() => onAction(appt, 'cancel')}
            sx={{ color: REPAIRS_UI.textSecondary, borderColor: REPAIRS_UI.border }}
          >
            Release slot
          </Button>
        )}
      </Stack>
    </Box>
  );
}

export default function AppointmentsPage() {
  const [date, setDate] = useState(todayISO);
  const [rows, setRows] = useState([]);
  const [timeZone, setTimeZone] = useState('America/Chicago');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [snack, setSnack] = useState(null);
  const [dialog, setDialog] = useState(null);

  const load = useCallback(async (iso) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/appointments?from=${iso}&to=${iso}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Could not load appointments.');
      setTimeZone(json.timeZone || 'America/Chicago');
      setRows(
        (json.appointments || []).map((a) => ({
          ...a,
          // The server returns the instant; render the shop's wall clock so the
          // page reads the same in Fort Smith and anywhere else.
          startTimeLocal: new Intl.DateTimeFormat('en-GB', {
            timeZone: json.timeZone || 'America/Chicago',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          }).format(new Date(a.slotStart)),
        }))
      );
    } catch (e) {
      setError(e.message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(date);
  }, [date, load]);

  const act = async (appt, action, extra = {}) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/appointments/${appt.appointmentID}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'That did not work.');

      if (action === 'arrive') {
        setSnack({ severity: 'success', message: `Sent ${json.repairID} to the bench.` });
      } else {
        // Say plainly whether the customer was actually told. The email is
        // best-effort, and staff need to know when to pick up the phone instead.
        const sent = json.notified?.sent;
        setSnack({
          severity: sent ? 'success' : 'warning',
          message: sent
            ? `Done — customer emailed.`
            : `Done, but the customer was NOT emailed (${json.notified?.reason || 'unknown'}). Call them.`,
        });
      }
      await load(date);
    } catch (e) {
      setSnack({ severity: 'error', message: e.message });
    } finally {
      setBusy(false);
      setDialog(null);
    }
  };

  const onAction = (appt, action) => {
    if (action === 'reschedule' || action === 'cancel') {
      setDialog({ appt, action, date: appt.slotStart.slice(0, 10), time: appt.startTimeLocal, reason: '' });
      return;
    }
    act(appt, action);
  };

  const bookings = useMemo(() => rows.filter((r) => r.active || r.status === 'cancelled'), [rows]);
  const liveCount = rows.filter((r) => r.active && r.status !== 'cancelled').length;

  return (
    <Box sx={{ p: 3, backgroundColor: REPAIRS_UI.bgPrimary, minHeight: '100vh' }}>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 1 }}>
        <Typography variant="h5" sx={{ color: REPAIRS_UI.textPrimary, fontWeight: 600 }}>
          Bench day
        </Typography>
        <Chip
          size="small"
          label={`${liveCount} booked`}
          sx={{ color: REPAIRS_UI.accent, borderColor: REPAIRS_UI.accent, border: '1px solid', backgroundColor: 'transparent' }}
        />
      </Stack>
      <Typography sx={{ color: REPAIRS_UI.textMuted, fontSize: 13, mb: 2 }}>
        While-you-wait slots booked from the website, plus walk-ins holding the bench. Times are {timeZone.replace('America/', '')}.
      </Typography>

      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <IconButton onClick={() => setDate((d) => shiftDate(d, -1))} sx={{ color: REPAIRS_UI.textSecondary }}>
          <PrevIcon />
        </IconButton>
        <Typography sx={{ color: REPAIRS_UI.textPrimary, minWidth: 240, textAlign: 'center', fontWeight: 500 }}>
          {headingFor(date)}
        </Typography>
        <IconButton onClick={() => setDate((d) => shiftDate(d, 1))} sx={{ color: REPAIRS_UI.textSecondary }}>
          <NextIcon />
        </IconButton>
        <Button
          size="small"
          startIcon={<TodayIcon fontSize="small" />}
          onClick={() => setDate(todayISO())}
          sx={{ color: REPAIRS_UI.textSecondary }}
        >
          Today
        </Button>
        <Button
          size="small"
          startIcon={<RefreshIcon fontSize="small" />}
          onClick={() => load(date)}
          sx={{ color: REPAIRS_UI.textSecondary }}
        >
          Refresh
        </Button>
      </Stack>

      <Divider sx={{ borderColor: REPAIRS_UI.border, mb: 2 }} />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Stack alignItems="center" sx={{ py: 6 }}>
          <CircularProgress sx={{ color: REPAIRS_UI.accent }} />
        </Stack>
      ) : bookings.length === 0 ? (
        <Box sx={{ py: 6, textAlign: 'center' }}>
          <Typography sx={{ color: REPAIRS_UI.textSecondary }}>Nothing booked for this day.</Typography>
          <Typography sx={{ color: REPAIRS_UI.textMuted, fontSize: 13, mt: 0.5 }}>
            The bench is free all day, so the website is offering every slot.
          </Typography>
        </Box>
      ) : (
        bookings.map((appt) => (
          <BookingCard key={appt.appointmentID} appt={appt} busy={busy} onAction={onAction} />
        ))
      )}

      <Dialog
        open={Boolean(dialog)}
        onClose={() => !busy && setDialog(null)}
        PaperProps={{ sx: { backgroundColor: REPAIRS_UI.bgPanel, color: REPAIRS_UI.textPrimary, backgroundImage: 'none' } }}
      >
        <DialogTitle>{dialog?.action === 'cancel' ? 'Cancel this booking?' : 'Move this booking'}</DialogTitle>
        <DialogContent sx={{ minWidth: 360 }}>
          {dialog?.action === 'cancel' ? (
            <>
              <Typography sx={{ color: REPAIRS_UI.textSecondary, fontSize: 14, mb: 2 }}>
                The slot goes back on sale immediately and {dialog?.appt?.clientEmail ? 'the customer is emailed' : 'the customer has no email on file, so nobody is told'}.
              </Typography>
              <TextField
                fullWidth
                size="small"
                label="Reason (included in the email)"
                value={dialog?.reason || ''}
                onChange={(e) => setDialog((d) => ({ ...d, reason: e.target.value }))}
                sx={{ '& .MuiInputBase-root': { color: REPAIRS_UI.textPrimary } }}
              />
            </>
          ) : (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                type="date"
                size="small"
                label="Date"
                InputLabelProps={{ shrink: true }}
                value={dialog?.date || ''}
                onChange={(e) => setDialog((d) => ({ ...d, date: e.target.value }))}
                sx={{ '& .MuiInputBase-root': { color: REPAIRS_UI.textPrimary } }}
              />
              <TextField
                select
                size="small"
                label="Time"
                value={dialog?.time || ''}
                onChange={(e) => setDialog((d) => ({ ...d, time: e.target.value }))}
                SelectProps={{ MenuProps: repairsMenuProps }}
                sx={{ '& .MuiInputBase-root': { color: REPAIRS_UI.textPrimary } }}
              >
                {SLOT_TIMES.map((t) => (
                  <MenuItem key={t} value={t}>{prettyTime(t)}</MenuItem>
                ))}
              </TextField>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button disabled={busy} onClick={() => setDialog(null)} sx={{ color: REPAIRS_UI.textSecondary }}>
            Back
          </Button>
          <Button
            disabled={busy}
            onClick={() =>
              act(
                dialog.appt,
                dialog.action,
                dialog.action === 'cancel'
                  ? { reason: dialog.reason }
                  : { date: dialog.date, time: dialog.time }
              )
            }
            sx={{ color: dialog?.action === 'cancel' ? '#B4736A' : REPAIRS_UI.accent }}
          >
            {busy ? 'Working…' : dialog?.action === 'cancel' ? 'Cancel booking' : 'Move it'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(snack)}
        autoHideDuration={snack?.severity === 'warning' ? 12000 : 5000}
        onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snack?.severity || 'info'} onClose={() => setSnack(null)}>
          {snack?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
