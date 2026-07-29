'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box, Typography, Paper, Stack, Chip, Button, Grid, Card, CardContent, CircularProgress,
  Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  FormControl, InputLabel, Select, MenuItem, Tooltip,
} from '@mui/material';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import PaymentsIcon from '@mui/icons-material/Payments';
import InventoryIcon from '@mui/icons-material/Inventory2';
import LockIcon from '@mui/icons-material/Lock';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { REPAIRS_UI, repairsMenuProps } from '@/app/dashboard/repairs/components/repairsUi';

/**
 * Casting board (PRODUCTION_RUNS.md §4.1). Ownership-scoped: an artisan sees their own runs'
 * castings, staff see everything.
 *
 * Deliberately transport-agnostic. "Record order" is the PRIMARY action — you order from the caster
 * however you like (portal, phone, email) and record it here, which is what keeps the WO ledger
 * truthful without depending on any vendor integration. The automated vendor email exists in the API
 * but is intentionally not surfaced while the vendor's own ordering path is in flux.
 *
 * Carrera (vendor) is the ONLY casting path — artisan/peer/in-house casting was SCRAPPED because the
 * flask, not the piece, is the cost unit, so a peer caster can't be profitable on small work
 * (PRODUCTION_RUNS.md §4.1). Every batch here is therefore a vendor batch that EFD orders and
 * receives; there is no self-cast path, by design.
 *
 * OPEN DECISIONS (deliberately not settled in code — they're policy, not UI):
 *  1. `deliver` is currently available to the owning artisan while `receive` is staff-only. That's
 *     defensible if "delivered" means *the artisan confirms arrival* (their 48h inspection window
 *     starts on their own say-so), but it reads against the reasoning behind staff-only receive (EFD
 *     holds and ships the parcel). Decide it deliberately rather than by omission.
 *  2. Receipt now BILLS the artisan (`castingSettlement`), so casting debt reaches `artisanInvoices`
 *     and an overdue casting freezes the artisan like any other bill. Because the debt is real, every
 *     exit from it resolves it: `pay` marks the invoice paid, `cancel` VOIDS it. Still open: nothing
 *     pushes the invoice to Stripe — `pushArtisanInvoiceToStripe` has no caller, so today settlement
 *     is a staff "Mark paid" click rather than the artisan paying a hosted invoice (U-BILL-2).
 *  3. There is no `artisanInvoices` admin surface at all (no route, no page), so a stranded invoice
 *     can only be fixed through the board's own actions. Worth building alongside U-BILL-2.
 */

const STATUS_LABEL = {
  needs_ordering: 'Needs ordering',
  ordered: 'Ordered',
  received: 'Received',
  delivered: 'Delivered',
  disputed: 'Disputed',
  accepted: 'Accepted',
  cancelled: 'Cancelled',
};
const STATUS_COLOR = {
  needs_ordering: '#FFA726',
  ordered: '#42A5F5',
  received: '#66BB6A',
  delivered: '#26A69A',
  disputed: '#EF5350',
  accepted: REPAIRS_UI.accent,
  cancelled: REPAIRS_UI.textMuted,
};
const STATUS_OPTIONS = ['all', ...Object.keys(STATUS_LABEL)];
const money = (n) => (n == null ? '—' : `$${(Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
const when = (d) => (d ? new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—');
/** A 48h deadline needs the TIME — "Jul 30" reads as all day, but the window shuts mid-afternoon. */
const whenExact = (d) => (d ? new Date(d).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—');
/** Past-tense wording per action (never string-concat "ed" — that yields "payed"/"disputeed"). */
const DONE_WORD = { order: 'recorded as ordered', receive: 'received', pay: 'marked paid', deliver: 'marked delivered', dispute: 'disputed', accept: 'accepted', cancel: 'cancelled' };

/** An unpaid charge outstanding on this batch? (the ship gate + the debt indicator) */
const isGated = (b) => Boolean(b.shippingGated && !b.charge?.paid);
/** Has the 48h dispute window lapsed? Mirrors castingBoard.isPastDisputeWindow. */
const disputeClosed = (b) => Boolean(b.disputeDeadline && Date.now() >= new Date(b.disputeDeadline).getTime());
/**
 * Only offer Cancel where the service actually permits it. ALLOWLIST (mirrors `canTransition`'s
 * ALLOWED map) rather than a denylist, so an unrecognized status can never render a button that
 * 409s. Additionally an artisan may not cancel a batch they still owe money on: cancelling leaves
 * the charge unpaid but drops it off this board, so only staff may cancel once a charge exists.
 */
const CANCELLABLE = ['needs_ordering', 'ordered', 'received', 'disputed'];
const canCancel = (b, staff) => {
  if (!CANCELLABLE.includes(b.status)) return false;
  if (b.charge?.amount != null && !b.charge.paid && !staff) return false;
  return true;
};

function MetricCard({ icon: Icon, label, value, accent }) {
  return (
    <Card sx={{ height: '100%', backgroundColor: REPAIRS_UI.bgCard, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' }}>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: 2, backgroundColor: REPAIRS_UI.bgTertiary, border: `1px solid ${REPAIRS_UI.border}` }}>
          <Icon sx={{ color: accent || REPAIRS_UI.accent, fontSize: 22 }} />
        </Box>
        <Box>
          <Typography sx={{ fontSize: 24, fontWeight: 700, color: REPAIRS_UI.textHeader, lineHeight: 1.1 }}>{value}</Typography>
          <Typography sx={{ fontSize: '0.74rem', color: REPAIRS_UI.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function CastingBoardPage() {
  const [batches, setBatches] = useState([]);
  const [staff, setStaff] = useState(false);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('all');
  const [loadError, setLoadError] = useState(null);
  const [snack, setSnack] = useState(null);
  const [dialog, setDialog] = useState(null);   // { action, batch }
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);

  const notify = (message, severity = 'success') => setSnack({ message, severity });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/production/casting');
      const d = await r.json().catch(() => ({}));
      // A failed load must NOT decay into the cheerful "no castings yet" empty state — the snackbar
      // auto-hides, so the error is also held in state and shown in place of the empty state.
      if (!r.ok) { const m = d.error || `Could not load the casting board (${r.status}).`; setLoadError(m); notify(m, 'error'); setBatches([]); return; }
      setLoadError(null);
      setBatches(Array.isArray(d.batches) ? d.batches : []);
      setStaff(Boolean(d.isStaff));
    } catch (e) {
      const m = `Could not reach the server: ${e.message}`;
      setLoadError(m); notify(m, 'error'); setBatches([]);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const metrics = useMemo(() => ({
    needsOrdering: batches.filter((b) => b.status === 'needs_ordering').length,
    ordered: batches.filter((b) => b.status === 'ordered').length,
    // Shares the `isGated` predicate with the "Mark paid" button (which additionally requires staff),
    // so the count and the action can't drift apart on the gate condition. A non-staff artisan can
    // see a non-zero count with no button — the red gate row on the card is their explanation.
    awaitingPayment: batches.filter((b) => b.status === 'received' && isGated(b)).length,
    delivered: batches.filter((b) => b.status === 'delivered').length,
  }), [batches]);

  const visible = useMemo(
    () => (status === 'all' ? batches : batches.filter((b) => b.status === status)),
    [batches, status],
  );

  /** Fire an action; surface the API's own error text (it carries the real reason). */
  const act = async (batch, action, body = {}) => {
    setBusy(true);
    try {
      const r = await fetch(`/api/production/casting/${batch.batchId}/${action}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { notify(d.error || `Could not ${action} this casting.`, 'error'); return false; }
      // Receipt bills the artisan and payment settles that bill. Either half can fail while the
      // primary transition stands, so report the SIDE-EFFECT failure explicitly — keyed off a
      // structured `error` flag, never by pattern-matching the prose.
      const side = d.billing || d.settlement;
      if (side?.error) {
        notify(side.reason, 'warning');
      } else if (d.billing?.invoiced) {
        notify(`Casting received — invoiced ${money(d.billing.amount)}.`);
      } else if (d.settlement?.settled) {
        notify('Payment recorded — invoice settled and the casting released.');
      } else if (d.settlement?.voided) {
        notify('Casting cancelled — the artisan’s invoice was voided.');
      } else if (d.settlement?.alreadyPaid) {
        // Cancelling a PAID casting doesn't refund it; say so rather than implying it's squared away.
        notify(d.settlement.reason, 'warning');
      } else {
        notify(`Casting ${DONE_WORD[action] || action}.`);
      }
      setDialog(null); setForm({});
      await load();
      return true;
    } catch (e) {
      // A rejected fetch (offline/DNS) must not vanish silently.
      notify(`Could not reach the server: ${e.message}`, 'error');
      return false;
    } finally { setBusy(false); }
  };

  const openDialog = (action, batch) => {
    setForm(action === 'order' ? { vendor: batch.vendor || 'Carrera', estCost: batch.estCost ?? '' } : {});
    setDialog({ action, batch });
  };

  return (
    <Box sx={{ pb: 6 }}>
      <Paper sx={{ p: { xs: 2, md: 3 }, mb: 3, backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <PrecisionManufacturingIcon sx={{ fontSize: 28, color: REPAIRS_UI.accent }} />
          <Box>
            <Typography sx={{ fontSize: { xs: 22, md: 28 }, fontWeight: 600, color: REPAIRS_UI.textHeader }}>Casting Board</Typography>
            <Typography sx={{ color: REPAIRS_UI.textSecondary }}>
              {staff ? 'Every artisan’s castings.' : 'Your runs’ castings.'} Order from your caster however you like, then record it here.
            </Typography>
          </Box>
        </Stack>
      </Paper>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}><MetricCard icon={ShoppingCartIcon} label="Needs ordering" value={metrics.needsOrdering} accent="#FFA726" /></Grid>
        <Grid item xs={6} md={3}><MetricCard icon={PrecisionManufacturingIcon} label="At the caster" value={metrics.ordered} accent="#42A5F5" /></Grid>
        <Grid item xs={6} md={3}><MetricCard icon={PaymentsIcon} label="Awaiting payment" value={metrics.awaitingPayment} accent="#EF5350" /></Grid>
        <Grid item xs={6} md={3}><MetricCard icon={LocalShippingIcon} label="Delivered" value={metrics.delivered} accent="#26A69A" /></Grid>
      </Grid>

      <Stack direction="row" spacing={1.5} sx={{ mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Status</InputLabel>
          <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)} MenuProps={repairsMenuProps}>
            {STATUS_OPTIONS.map((s) => (
              <MenuItem key={s} value={s}>{s === 'all' ? 'All statuses' : STATUS_LABEL[s]}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      {loading ? (
        <Stack alignItems="center" sx={{ py: 6 }}><CircularProgress sx={{ color: REPAIRS_UI.accent }} /></Stack>
      ) : loadError ? (
        <Paper sx={{ p: 4, textAlign: 'center', backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: '1px solid #EF5350', borderRadius: 2, boxShadow: 'none' }}>
          <WarningAmberIcon sx={{ fontSize: 40, color: '#EF5350', mb: 1 }} />
          <Typography sx={{ color: REPAIRS_UI.textHeader, fontWeight: 600, mb: 0.5 }}>Couldn’t load the casting board</Typography>
          <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary, mb: 2 }}>{loadError}</Typography>
          <Button variant="outlined" onClick={load} sx={{ color: REPAIRS_UI.accent, borderColor: REPAIRS_UI.accent, textTransform: 'none' }}>Retry</Button>
        </Paper>
      ) : visible.length === 0 ? (
        <Paper sx={{ p: 5, textAlign: 'center', backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px dashed ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' }}>
          <InventoryIcon sx={{ fontSize: 44, color: REPAIRS_UI.textMuted, mb: 1.5 }} />
          <Typography sx={{ color: REPAIRS_UI.textSecondary }}>
            {batches.length === 0 ? 'No castings yet. Start a production run and its castings land here.' : 'No castings with that status.'}
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={1.5}>
          {visible.map((b) => (
            <BatchCard key={b.batchId} batch={b} staff={staff} onAction={openDialog} onSimple={act} busy={busy} />
          ))}
        </Stack>
      )}

      <ActionDialog dialog={dialog} form={form} setForm={setForm} busy={busy} onClose={() => { setDialog(null); setForm({}); }} onConfirm={act} />

      <Snackbar open={Boolean(snack)} autoHideDuration={6000} onClose={() => setSnack(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {snack ? <Alert severity={snack.severity} onClose={() => setSnack(null)} sx={{ width: '100%' }}>{snack.message}</Alert> : undefined}
      </Snackbar>
    </Box>
  );
}

function BatchCard({ batch: b, staff, onAction, onSimple, busy }) {
  const gated = isGated(b);
  const pieceCount = (b.pieceIDs || []).length;
  return (
    <Paper sx={{ p: 2, backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${gated ? '#EF5350' : REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between">
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Chip size="small" label={STATUS_LABEL[b.status] || b.status}
              sx={{ height: 20, fontWeight: 700, color: '#1a1205', bgcolor: STATUS_COLOR[b.status] || REPAIRS_UI.textMuted }} />
            <Typography sx={{ fontWeight: 600, color: REPAIRS_UI.textHeader }}>{b.designName}</Typography>
            <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary }}>
              {pieceCount} piece{pieceCount === 1 ? '' : 's'}
            </Typography>
          </Stack>

          {/* What to actually order — the per-metal breakdown. Chip keys use the SAME `::` separator
              buildOrderLines groups on, so they can't collide across variants. */}
          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
            {(b.lines || []).map((l) => (
              <Chip key={`${l.variantId}::${l.ringSize ?? '-'}`} size="small" variant="outlined"
                label={`${l.qty}× ${l.metalLabel}${l.ringSize ? ` · sz ${l.ringSize}` : ''}`}
                sx={{ height: 22, color: REPAIRS_UI.textHeader, borderColor: REPAIRS_UI.border }} />
            ))}
            {(b.lineErrors || []).length > 0 && (
              <Tooltip title={b.lineErrors.join('; ')}>
                <Chip size="small" icon={<WarningAmberIcon sx={{ fontSize: 15 }} />} label="needs attention"
                  sx={{ height: 22, color: '#EF5350', borderColor: '#EF5350' }} variant="outlined" />
              </Tooltip>
            )}
          </Stack>

          <Typography variant="caption" sx={{ display: 'block', mt: 1, color: REPAIRS_UI.textMuted }}>
            {b.vendor ? `${b.vendor} · ` : ''}est {money(b.estCost)}
            {b.actualCost != null && ` · actual ${money(b.actualCost)}`}
            {b.charge?.amount != null && ` · charge ${money(b.charge.amount)}${b.charge.paid ? ' (paid)' : ' (unpaid)'}`}
            {b.orderedAt && ` · ordered ${when(b.orderedAt)}`}
            {b.disputeDeadline && b.status === 'delivered' && ` · dispute by ${whenExact(b.disputeDeadline)}`}
          </Typography>

          {gated && (
            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 1 }}>
              <LockIcon sx={{ fontSize: 15, color: '#EF5350' }} />
              {/* An artisanInvoice now exists (billed at receipt), but nothing pushes it to Stripe
                  yet, so "settled" = staff Mark-paid rather than the artisan paying online. */}
              <Typography variant="caption" sx={{ color: '#EF5350' }}>
                Gated from shipping until this charge is settled
              </Typography>
            </Stack>
          )}
        </Box>

        <Stack direction="row" spacing={1} alignItems="flex-start" flexWrap="wrap" useFlexGap>
          {b.status === 'needs_ordering' && (
            <Button size="small" variant="contained" disabled={busy} onClick={() => onAction('order', b)}
              sx={{ bgcolor: REPAIRS_UI.accent, color: '#1a1205', textTransform: 'none', '&:hover': { bgcolor: REPAIRS_UI.accent } }}>
              Record order
            </Button>
          )}
          {/* Receiving sets the ACTUAL cost, which becomes the artisan's charge (cost × markup) and
              their pieces' COGS. EFD placed the order and holds the vendor invoice, so EFD records
              it — the debtor must not set the number that bills them. Enforced server-side too:
              `receive` is in the route's STAFF_ONLY set, so this is a real gate, not just a hidden
              button. (Open: if an artisan orders casting on their OWN vendor account, nobody is
              billing them and this flow isn't modelled — see the file header.) */}
          {b.status === 'ordered' && staff && (
            <Button size="small" variant="contained" disabled={busy} onClick={() => onAction('receive', b)}
              sx={{ bgcolor: '#66BB6A', color: '#1a1205', textTransform: 'none', '&:hover': { bgcolor: '#66BB6A' } }}>
              Receive
            </Button>
          )}
          {b.status === 'ordered' && !staff && (
            <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted, alignSelf: 'center' }}>
              At the caster — EFD records receipt
            </Typography>
          )}
          {b.status === 'received' && gated && staff && (
            <Button size="small" variant="outlined" disabled={busy} onClick={() => onSimple(b, 'pay')}
              sx={{ color: REPAIRS_UI.accent, borderColor: REPAIRS_UI.accent, textTransform: 'none' }}>
              Mark paid
            </Button>
          )}
          {b.status === 'received' && !gated && (
            <Button size="small" variant="contained" disabled={busy} onClick={() => onSimple(b, 'deliver')}
              sx={{ bgcolor: '#26A69A', color: '#1a1205', textTransform: 'none', '&:hover': { bgcolor: '#26A69A' } }}>
              Mark delivered
            </Button>
          )}
          {b.status === 'delivered' && (
            <>
              <Button size="small" variant="contained" disabled={busy} onClick={() => onSimple(b, 'accept')}
                sx={{ bgcolor: REPAIRS_UI.accent, color: '#1a1205', textTransform: 'none', '&:hover': { bgcolor: REPAIRS_UI.accent } }}>
                Accept
              </Button>
              {/* Disputes are only open for 48h after delivery — don't offer a button that must 409. */}
              {!disputeClosed(b) && (
                <Button size="small" disabled={busy} onClick={() => onAction('dispute', b)} sx={{ color: '#EF5350', textTransform: 'none' }}>
                  Dispute
                </Button>
              )}
            </>
          )}
          {b.status === 'disputed' && (
            <>
              {/* The point of a dispute: the caster is liable, so re-order the failed casting. */}
              <Button size="small" variant="contained" disabled={busy} onClick={() => onAction('order', b)}
                sx={{ bgcolor: '#42A5F5', color: '#1a1205', textTransform: 'none', '&:hover': { bgcolor: '#42A5F5' } }}>
                Re-order
              </Button>
              <Button size="small" variant="outlined" disabled={busy} onClick={() => onSimple(b, 'accept')}
                sx={{ color: REPAIRS_UI.accent, borderColor: REPAIRS_UI.accent, textTransform: 'none' }}>
                Resolve &amp; accept
              </Button>
            </>
          )}
          {canCancel(b, staff) && (
            <Button size="small" disabled={busy} onClick={() => onSimple(b, 'cancel')} sx={{ color: REPAIRS_UI.textMuted, textTransform: 'none' }}>
              Cancel
            </Button>
          )}
        </Stack>
      </Stack>
    </Paper>
  );
}

function ActionDialog({ dialog, form, setForm, busy, onClose, onConfirm }) {
  if (!dialog) return null;
  const { action, batch } = dialog;
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const config = {
    order: {
      title: 'Record casting order',
      help: 'You placed this order with the caster (portal, phone, email — however you did it). Recording it here keeps the work-order ledger accurate. The estimate can be corrected when you receive it.',
      body: (
        <>
          <TextField fullWidth size="small" label="Caster / vendor" value={form.vendor ?? ''} onChange={set('vendor')} sx={{ mb: 2 }} />
          <TextField fullWidth size="small" type="number" label="Estimated cost" value={form.estCost ?? ''} onChange={set('estCost')}
            inputProps={{ min: 0, step: '0.01' }}
            InputProps={{ startAdornment: <Typography sx={{ color: REPAIRS_UI.textMuted, mr: 0.5 }}>$</Typography> }}
            helperText="Optional — the actual cost is what gets billed, recorded at receipt." />
        </>
      ),
      // Only send a genuine non-negative number; junk/negative must never reach estCost.
      payload: () => {
        const raw = String(form.estCost ?? '').trim();
        const n = Number(raw);
        const ok = raw !== '' && Number.isFinite(n) && n >= 0;
        return { vendor: (form.vendor || '').trim() || null, ...(ok ? { estCost: n } : {}) };
      },
      valid: () => {
        const raw = String(form.estCost ?? '').trim();
        return raw === '' || (Number.isFinite(Number(raw)) && Number(raw) >= 0);
      },
      cta: 'Record order',
    },
    receive: {
      title: 'Receive casting',
      help: 'Enter the caster’s ACTUAL cost. It splits onto the pieces as COGS and sets the artisan’s charge; the casting stays gated from shipping until that charge is paid.',
      body: (
        <TextField fullWidth size="small" type="number" label="Actual cost" value={form.actualCost ?? ''} onChange={set('actualCost')}
          inputProps={{ min: 0, step: '0.01' }}
          InputProps={{ startAdornment: <Typography sx={{ color: REPAIRS_UI.textMuted, mr: 0.5 }}>$</Typography> }} autoFocus />
      ),
      payload: () => ({ actualCost: Number(form.actualCost) }),
      // MUST be finite: '1e999' is a legal <input type=number> value that becomes Infinity, which
      // JSON-serializes to null and would be read server-side as 0 — silently receiving the casting
      // at $0 (zero COGS, zero charge) and reporting success. Same guard estCost got.
      valid: () => {
        const raw = String(form.actualCost ?? '').trim();
        const n = Number(raw);
        return raw !== '' && Number.isFinite(n) && n >= 0;
      },
      cta: 'Receive',
    },
    dispute: {
      title: 'Dispute this casting',
      help: 'Casting failures are the caster’s liability. Disputes are only open within 48 hours of delivery.',
      body: (
        <TextField fullWidth size="small" multiline minRows={3} label="What’s wrong?" value={form.reason ?? ''} onChange={set('reason')} autoFocus />
      ),
      payload: () => ({ reason: (form.reason || '').trim() || null }),
      cta: 'Submit dispute',
    },
  }[action];

  if (!config) return null;
  const ok = config.valid ? config.valid() : true;

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}` } }}>
      <DialogTitle sx={{ color: REPAIRS_UI.textHeader }}>{config.title}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary, mb: 2 }}>
          {batch.designName} · {(batch.pieceIDs || []).length} piece(s)
        </Typography>
        <Typography variant="caption" sx={{ display: 'block', color: REPAIRS_UI.textMuted, mb: 2 }}>{config.help}</Typography>
        {config.body}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ color: REPAIRS_UI.textMuted, textTransform: 'none' }}>Cancel</Button>
        <Button variant="contained" disabled={busy || !ok} onClick={() => onConfirm(batch, action, config.payload())}
          sx={{ bgcolor: REPAIRS_UI.accent, color: '#1a1205', textTransform: 'none', '&:hover': { bgcolor: REPAIRS_UI.accent } }}>
          {busy ? 'Working…' : config.cta}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
