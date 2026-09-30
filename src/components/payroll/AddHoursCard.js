'use client';
/**
 * Add hours for an hourly worker, from the payroll page (owner, 2026-09-29: "I need to be able to
 * add the hours manually for her because she's already started working today").
 *
 * The shift is credited exactly like a clocked one — same labor log, same rate resolution — so it
 * joins the payroll candidates below the moment it is saved. The rate comes from the person's own
 * record; if they have none the card says so instead of paying them nothing quietly.
 */
import React, { useEffect, useState } from 'react';
import {
  Alert, Box, Button, Card, CardContent, MenuItem, Stack, TextField, Typography,
} from '@mui/material';
import MoreTimeIcon from '@mui/icons-material/MoreTime';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';
import { isApprentice } from '@/services/pay/apprenticeRules';

const money = (n) => Number(n || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

export default function AddHoursCard({ sx, onAdded }) {
  const [people, setPeople] = useState([]);
  const [userID, setUserID] = useState('');
  const [hours, setHours] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    fetch('/api/users?role=artisan')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const all = Array.isArray(d) ? d : (d?.data || []);
        // Only people paid by the hour — the server refuses anyone else (services/pay/apprentice.js).
        setPeople(all.filter((u) => u?.userID && isApprentice(u)));
      })
      .catch(() => setPeople([]));
  }, []);

  const submit = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/time/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userID, hours: Number(hours), note }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Could not add those hours.');
      setMsg({
        severity: body.needsRate ? 'warning' : 'success',
        text: body.needsRate
          ? `${body.shift.hours} h recorded, but this person has no hourly rate — set one on their artisan page, then re-add.`
          : `${body.shift.hours} h at ${money(body.shift.rate)}/h = ${money(body.shift.value)}. It is on payroll now.`,
      });
      setHours('');
      setNote('');
      onAdded?.();
    } catch (e) {
      setMsg({ severity: 'error', text: e.message });
    } finally {
      setBusy(false);
    }
  };

  const label = (u) => [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || u.name || u.email || u.userID;

  return (
    <Card sx={{ bgcolor: REPAIRS_UI.bgPanel, border: `1px solid ${REPAIRS_UI.border}`, ...sx }}>
      <CardContent>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
          <MoreTimeIcon sx={{ color: REPAIRS_UI.accent }} />
          <Typography sx={{ fontWeight: 700, color: REPAIRS_UI.textHeader, flex: 1 }}>Add hours</Typography>
        </Stack>
        <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary, mb: 2 }}>
          For time worked off the clock. Paid at that person&rsquo;s own hourly rate and added to payroll straight away.
        </Typography>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="flex-start">
          <TextField
            select size="small" label="Who" value={userID} onChange={(e) => setUserID(e.target.value)}
            sx={{ minWidth: { xs: '100%', sm: 220 } }}
          >
            {people.length === 0 && <MenuItem value="" disabled>No apprentices — place someone on the Apprentice pay tier first</MenuItem>}
            {people.map((u) => <MenuItem key={u.userID} value={u.userID}>{label(u)}</MenuItem>)}
          </TextField>
          <TextField
            size="small" type="number" label="Hours" value={hours}
            onChange={(e) => setHours(e.target.value)}
            inputProps={{ min: 0, step: 0.25 }} sx={{ width: { xs: '100%', sm: 120 } }}
          />
          <TextField
            size="small" label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)}
            sx={{ flex: 1, minWidth: { xs: '100%', sm: 180 } }}
          />
          <Box sx={{ width: { xs: '100%', sm: 'auto' } }}>
            <Button
              variant="contained" onClick={submit} disabled={busy || !userID || !(Number(hours) > 0)}
              sx={{ minHeight: 40, textTransform: 'none', fontWeight: 700, width: { xs: '100%', sm: 'auto' } }}
            >
              {busy ? 'Adding…' : 'Add hours'}
            </Button>
          </Box>
        </Stack>

        {msg && <Alert severity={msg.severity} sx={{ mt: 2 }} onClose={() => setMsg(null)}>{msg.text}</Alert>}
      </CardContent>
    </Card>
  );
}
