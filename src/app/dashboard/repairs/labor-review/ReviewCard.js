/**
 * One pending labour log on the Labor Review queue, and the figures the reviewer judges it by — moved verbatim out
 * of page.js on 2026-10-02 for max-lines. The card is presentational: approving is a prop.
 *
 * The two totals are what the reviewer compares against the hours the jeweller claimed, so they are tested:
 * `getRepairChargeTotal` prefers the ticket's own stored total and only adds the lines up when there isn't one, and
 * `getRepairSuggestedLaborHours` counts hours on tasks ONLY — custom labour is a task, while customLineItems are
 * non-labour charges (owner, 2026-09-18).
 */
import { useState } from 'react';
import { Card, CardContent, Typography, Stack, Box, Chip, Button, TextField, MenuItem, IconButton } from '@mui/material';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';
import CloseIcon from '@mui/icons-material/Close';
export function formatMoney(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

export function getRepairChargeTotal(repair = {}) {
  const taskTotal = (repair.tasks || []).reduce((sum, item) => (
    sum + ((Number(item?.price ?? item?.retailPrice) || 0) * (Math.max(Number(item?.quantity) || 1, 1)))
  ), 0);
  const materialTotal = (repair.materials || []).reduce((sum, item) => (
    sum + ((Number(item?.price ?? item?.unitCost ?? item?.costPerPortion) || 0) * (Math.max(Number(item?.quantity) || 1, 1)))
  ), 0);
  const customTotal = (repair.customLineItems || []).reduce((sum, item) => (
    sum + ((Number(item?.price) || 0) * (Math.max(Number(item?.quantity) || 1, 1)))
  ), 0);

  const computedTotal = taskTotal + materialTotal + customTotal;
  return Number(repair.totalCost || 0) > 0 ? Number(repair.totalCost || 0) : computedTotal;
}

// Labor lives on tasks[] only (custom labor is a task); customLineItems are non-labor charges.
export function getRepairSuggestedLaborHours(repair = {}) {
  const taskHours = (repair.tasks || []).reduce((sum, item) => {
    const quantity = Math.max(Number(item?.quantity) || 1, 1);
    const hours = Number(item?.pricing?.totalLaborHours ?? item?.laborHours) || 0;
    return sum + (hours * quantity);
  }, 0);

  return Math.round(taskHours * 100) / 100;
}

export function getWorkItemLabels(repair = {}) {
  return [
    ...(repair.tasks || []).map((item) => item.name || item.description),
    ...(repair.processes || []).map((item) => item.name || item.description),
    ...(repair.materials || []).map((item) => item.name || item.description || item.itemNumber),
    ...(repair.customLineItems || []).map((item) => item.description),
  ].filter(Boolean);
}

export function formatSourceAction(action = '') {
  return action
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export const jewelerName = (j) => [j.firstName, j.lastName].filter(Boolean).join(' ').trim() || j.name || j.email || j.userID;

export function ReviewCard({ log, jewelers = [], onApprove, loading, onOpenRepair }) {
  const suggestedHours = getRepairSuggestedLaborHours(log.repair);
  const initialHours = Number(log.creditedLaborHours || 0) > 0 ? Number(log.creditedLaborHours || 0) : suggestedHours;
  const [hours, setHours] = useState(initialHours);
  const [notes, setNotes] = useState(log.notes || '');
  // Split-across-jewelers mode: rows of { userID, name, hours }. Seeded with the
  // current jeweler taking the full hours; the admin reallocates from there.
  const [splitMode, setSplitMode] = useState(false);
  const [allocs, setAllocs] = useState([{ userID: log.primaryJewelerUserID || '', name: log.primaryJewelerName || '', hours: initialHours }]);
  const allocTotal = allocs.reduce((s, a) => s + (Number(a.hours) || 0), 0);
  const allocValid = allocs.every((a) => a.userID && Number(a.hours) > 0) && allocs.length > 0;
  const setAlloc = (i, patch) => setAllocs((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const addAlloc = () => setAllocs((rows) => [...rows, { userID: '', name: '', hours: 0 }]);
  const removeAlloc = (i) => setAllocs((rows) => rows.filter((_, idx) => idx !== i));
  const submit = () => {
    if (splitMode) onApprove(log.logID, { allocations: allocs.map((a) => ({ userID: a.userID, name: a.name, hours: Number(a.hours) || 0 })), notes });
    else onApprove(log.logID, { creditedLaborHours: hours, notes });
  };
  const workItems = getWorkItemLabels(log.repair);
  const repairChargeTotal = getRepairChargeTotal(log.repair);
  const exceedsTicketValue = repairChargeTotal > 0 && ((Number(hours || 0) * Number(log.laborRateSnapshot || 0)) > repairChargeTotal);

  return (
    <Card sx={{ bgcolor: REPAIRS_UI.bgPanel, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 3 }}>
      <CardContent>
        <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted, fontFamily: 'monospace' }}>
          {log.logID}
        </Typography>
        <Typography sx={{ color: REPAIRS_UI.textHeader, fontWeight: 600, mt: 0.5 }}>
          {log.primaryJewelerName}
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'flex-start' }} sx={{ mt: 1.5, mb: 2 }}>
          {log.repair?.picture && (
            <Box
              component="img"
              src={log.repair.picture}
              alt=""
              sx={{
                width: { xs: '100%', sm: 88 },
                height: 88,
                objectFit: 'cover',
                borderRadius: 1,
                border: `1px solid ${REPAIRS_UI.border}`,
                flexShrink: 0,
              }}
            />
          )}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1}>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ color: REPAIRS_UI.textHeader, fontWeight: 700 }}>
                  {log.repair?.clientName || log.repair?.businessName || 'Repair'} · {log.repairID}
                </Typography>
                <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary }}>
                  {log.repair?.description || 'No repair description saved.'}
                </Typography>
              </Box>
              <Box sx={{ textAlign: { xs: 'left', sm: 'right' }, flexShrink: 0 }}>
                <Typography sx={{ color: REPAIRS_UI.textHeader, fontWeight: 700 }}>
                  Ticket {formatMoney(repairChargeTotal)}
                </Typography>
                <Typography variant="caption" sx={{ color: REPAIRS_UI.textSecondary, display: 'block' }}>
                  {Number(log.laborRateSnapshot || 0).toFixed(2)}/hr snapshot
                </Typography>
              </Box>
            </Stack>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
              <Chip size="small" label={formatSourceAction(log.sourceAction || 'Labor Credit')} />
              {log.repair?.status && <Chip size="small" label={log.repair.status} />}
              {exceedsTicketValue && <Chip size="small" color="warning" label="Pay exceeds ticket" />}
              {log.createdAt && <Chip size="small" label={new Date(log.createdAt).toLocaleString()} />}
            </Stack>
            {workItems.length > 0 && (
              <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary, mt: 1 }}>
                Work: {workItems.slice(0, 5).join(', ')}
                {workItems.length > 5 ? ` +${workItems.length - 5} more` : ''}
              </Typography>
            )}
          </Box>
        </Stack>
        <Stack direction="row" justifyContent="flex-end" sx={{ mb: 1 }}>
          <Button
            size="small"
            onClick={() => setSplitMode((v) => !v)}
            disabled={jewelers.length === 0}
            sx={{ color: splitMode ? REPAIRS_UI.accent : REPAIRS_UI.textSecondary }}
          >
            {splitMode ? 'Single jeweler' : 'Split across jewelers'}
          </Button>
        </Stack>

        {!splitMode ? (
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 1.5 }}>
            <TextField
              label="Credited Hours"
              size="small"
              type="number"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              inputProps={{ min: 0, step: 0.25 }}
              helperText={suggestedHours > 0 ? `Suggested ${suggestedHours.toFixed(2)}h from current ticket` : ''}
            />
            <TextField
              label="Notes"
              size="small"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              sx={{ minWidth: 220, flex: 1 }}
            />
          </Box>
        ) : (
          <Box sx={{ mb: 1.5 }}>
            <Stack spacing={1}>
              {allocs.map((a, i) => (
                <Stack direction="row" spacing={1} alignItems="center" key={i}>
                  <TextField
                    select size="small" label="Jeweler" value={a.userID}
                    onChange={(e) => {
                      const j = jewelers.find((x) => x.userID === e.target.value);
                      setAlloc(i, { userID: e.target.value, name: j ? jewelerName(j) : '' });
                    }}
                    sx={{ minWidth: 180, flex: 1 }}
                  >
                    {jewelers.map((j) => <MenuItem key={j.userID} value={j.userID}>{jewelerName(j)}</MenuItem>)}
                  </TextField>
                  <TextField
                    label="Hrs" size="small" type="number" value={a.hours}
                    onChange={(e) => setAlloc(i, { hours: e.target.value })}
                    inputProps={{ min: 0, step: 0.25 }} sx={{ width: 90 }}
                  />
                  <IconButton size="small" disabled={allocs.length <= 1} onClick={() => removeAlloc(i)} sx={{ color: REPAIRS_UI.textMuted }}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Stack>
              ))}
            </Stack>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1 }}>
              <Button size="small" onClick={addAlloc} sx={{ color: REPAIRS_UI.accent }}>+ Add jeweler</Button>
              <Typography variant="caption" sx={{ color: Math.abs(allocTotal - Number(hours)) > 0.001 ? '#E0A33E' : REPAIRS_UI.textSecondary }}>
                Allocated {allocTotal.toFixed(2)}h{suggestedHours > 0 ? ` · suggested ${suggestedHours.toFixed(2)}h` : ''}
              </Typography>
            </Stack>
            <TextField
              label="Notes" size="small" value={notes} fullWidth sx={{ mt: 1 }}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Box>
        )}
        <Button
          variant="contained"
          disabled={loading || (splitMode && !allocValid)}
          onClick={submit}
          sx={{ bgcolor: REPAIRS_UI.accent, color: '#000', '&:hover': { bgcolor: '#FFCF4D' } }}
        >
          {splitMode ? 'Finalize Split' : 'Finalize Review'}
        </Button>
        <Button
          size="small"
          onClick={() => onOpenRepair(log.repairID)}
          sx={{ color: REPAIRS_UI.accent, ml: 1, px: 0 }}
        >
          Open Repair
        </Button>
      </CardContent>
    </Card>
  );
}

