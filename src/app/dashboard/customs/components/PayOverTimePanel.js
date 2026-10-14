'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Box, Typography, Button, Chip, Stack, TextField, Table, TableHead, TableRow, TableCell, TableBody, Alert,
} from '@mui/material';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';

/**
 * PAY OVER TIME, on the order's Invoices tab — everything the owner needs to run one of these orders:
 * the stages and which are paid, the monthly clock, the stone check (with the buttons that email the
 * client), whether the mounting follows the metal market, the price history, and recorded overrides.
 * Data: GET /api/custom-orders/[customID]/payment-progress. Contract: docs/manufacturing/PAY_OVER_TIME_CONTRACT.md.
 */

const money = (v) => `$${(Number(v) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const day = (d) => (d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—');

// Named styles, not inline objects (src/components/inlineSx.ratchet.test.js).
const S = {
  wrap: { mb: 2, p: 1.5, borderRadius: 1, border: `1px solid ${REPAIRS_UI.border}`, backgroundColor: REPAIRS_UI.bgTertiary },
  title: { color: REPAIRS_UI.textPrimary, fontWeight: 700 },
  muted: { color: REPAIRS_UI.textSecondary },
  faint: { color: REPAIRS_UI.textMuted },
  section: { mt: 1.5 },
  label: { color: REPAIRS_UI.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', mb: 0.5 },
  cell: { color: REPAIRS_UI.textPrimary, borderColor: REPAIRS_UI.border, py: 0.75 },
  head: { color: REPAIRS_UI.textSecondary, borderColor: REPAIRS_UI.border, py: 0.5 },
  paid: { color: '#66BB6A', borderColor: REPAIRS_UI.border, py: 0.75, fontWeight: 600 },
  btn: { borderColor: REPAIRS_UI.border, color: REPAIRS_UI.textPrimary },
  note: { mt: 1, maxWidth: 520 },
};

const STONE_WORDS = { available: 'Still available', sold: 'Sold', purchased: 'Bought' };

export default function PayOverTimePanel({ customID, order, reloadKey, onChanged, notify }) {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  const fetchProgress = useCallback(async () => {
    const res = await fetch(`/api/custom-orders/${customID}/payment-progress`);
    if (res.ok) setData(await res.json());
  }, [customID]);
  useEffect(() => { fetchProgress(); }, [fetchProgress, reloadKey]);

  const stoneCheck = async (status) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/custom-orders/${customID}/stone-check`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status, note }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Could not record the stone check');
      setNote('');
      notify(`Recorded: ${STONE_WORDS[status].toLowerCase()}. The client has been emailed.`, 'success');
      await onChanged?.();
      await fetchProgress();
    } catch (e) { notify(e.message, 'error'); } finally { setBusy(false); }
  };

  if (!data) return <Box sx={S.wrap}><Typography variant="body2" sx={S.muted}>Loading pay-over-time details…</Typography></Box>;

  const q = order.quote || {};
  const { ladder = {}, clock = {} } = data;
  const sc = data.stoneCheck || order.stoneCheck || null;
  const hasStone = !!(q.centerstone?.item || Number(q.centerstone?.cost) > 0);
  const metal = q.mounting?.metal;
  const overdue = data.overdueSince || clock.overdue;
  const history = (q.priceHistory || []).slice(-5).reverse();

  return (
    <Box sx={S.wrap}>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
        <Typography variant="body2" sx={S.title}>Pay over time</Typography>
        {overdue && <Chip size="small" color="error" label={`Overdue since ${day(data.overdueSince || clock.dueBy)}`} />}
        {data.readyForProduction
          ? <Chip size="small" color="success" label="Production stage paid" />
          : <Chip size="small" variant="outlined" label={`${money(data.amountForProduction)} to production`} />}
      </Stack>
      <Typography variant="caption" sx={S.muted}>
        {clock.dueBy
          ? `Last payment ${day(clock.lastPaymentAt)}. Next: at least ${money(clock.minimumDue)} by ${day(clock.dueBy)}. Reminders go out a week and a day before.`
          : 'Paid in full, or no due date yet.'}
      </Typography>

      {/* Stages */}
      <Box sx={S.section}>
        <Typography variant="caption" sx={S.label}>Stages: payments fill these in order</Typography>
        <Table size="small">
          <TableHead><TableRow>
            {['Stage', 'Covers', 'Amount', 'Paid at', ''].map((h) => <TableCell key={h} sx={S.head}>{h}</TableCell>)}
          </TableRow></TableHead>
          <TableBody>
            {(ladder.gates || []).map((g) => (
              <TableRow key={g.n}>
                <TableCell sx={S.cell}>{g.name}</TableCell>
                <TableCell sx={S.cell}>{g.covers}</TableCell>
                <TableCell sx={S.cell}>{money(g.amount)}</TableCell>
                <TableCell sx={S.cell}>{money(g.cumulative)}</TableCell>
                <TableCell sx={g.covered ? S.paid : S.cell}>{g.covered ? 'Paid' : `${money(g.toCover)} to go`}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!(ladder.gates || []).length && <Typography variant="caption" sx={S.faint}>No stages on this quote yet. Save the quote to compute them.</Typography>}
      </Box>

      {/* Buying signals (staff only) */}
      {hasStone && ladder.stoneGatePaid && sc?.status !== 'purchased' && (
        <Alert severity="success" sx={S.section} action={<Button size="small" disabled={busy} onClick={() => stoneCheck('purchased')}>Mark stone bought</Button>}>
          Stone stage paid: buy the stone. It&apos;s the client&apos;s, held for them.
        </Alert>
      )}
      {hasStone && !ladder.stoneGatePaid && ladder.stoneBuyable && (
        <Alert severity="info" sx={S.section}>
          Staff only: payments ({money(data.totalPaid)}) have covered the stone&apos;s cost ({money(ladder.stoneCost)}), so you could buy it now if you&apos;d rather not risk it selling.
        </Alert>
      )}

      {/* Stone check */}
      {hasStone && !ladder.stoneGatePaid && (
        <Box sx={S.section}>
          <Typography variant="caption" sx={S.label}>Stone availability{data.stoneDue ? ': check due' : ''}</Typography>
          <Typography variant="body2" sx={S.muted}>
            {q.centerstone?.item || 'Centre stone'}: {sc?.checkedAt ? `${STONE_WORDS[sc.status] || sc.status} (checked ${day(sc.checkedAt)})` : 'never checked'}.
            {' '}It isn&apos;t held until the stone stage is paid. Check weekly; the client is emailed when you record it.
          </Typography>
          <TextField size="small" fullWidth sx={S.note} label="Note to the client (optional)" value={note} disabled={busy} onChange={(e) => setNote(e.target.value)} />
          <Stack direction="row" spacing={1} sx={S.section}>
            <Button size="small" variant="outlined" sx={S.btn} disabled={busy} onClick={() => stoneCheck('available')}>Still available</Button>
            <Button size="small" variant="outlined" color="error" disabled={busy} onClick={() => stoneCheck('sold')}>It sold</Button>
          </Stack>
        </Box>
      )}

      {/* Metal */}
      <Box sx={S.section}>
        <Typography variant="caption" sx={S.label}>Mounting price</Typography>
        <Typography variant="body2" sx={S.muted}>
          {ladder.mountingGatePaid
            ? 'Mounting stage paid: the price is locked.'
            : metal
              ? `Follows the metal market: ${metal.metalKey} at ${money(metal.pricePerGram)}/g, priced ${day(metal.pricedAt)}. Checked daily; re-priced only on a move of 5% or more, and the client is emailed.`
              : 'Typed by hand, so it will NOT follow the metal market. Run Estimate on the Quote tab to tie it to the market.'}
        </Typography>
        {history.length > 0 && (
          <Typography variant="caption" component="div" sx={S.faint}>
            {history.map((h) => `${day(h.at)}: ${h.reason}, mounting ${money(h.mountingGate)}, total ${money(h.total)}`).join(' · ')}
          </Typography>
        )}
      </Box>

      {(data.overrides || []).length > 0 && (
        <Box sx={S.section}>
          <Typography variant="caption" sx={S.label}>Overrides</Typography>
          {data.overrides.map((o) => (
            <Typography key={`${o.at}`} variant="caption" component="div" sx={S.muted}>
              {day(o.at)}: {o.from} → {o.to} with {money(o.amountForProduction)} still to production, by {o.by}: &ldquo;{o.reason}&rdquo;
            </Typography>
          ))}
        </Box>
      )}
    </Box>
  );
}
