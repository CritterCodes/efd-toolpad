"use client";

/**
 * Build and send a repair estimate for a lead.
 *
 * Deliberately a focused dialog rather than a reuse of NewRepairForm. That form
 * is built for a piece sitting on the counter — client lookup, promise dates,
 * photos, metal detection. Quoting a web lead is a smaller job: pick the work,
 * agree a number, send it.
 *
 * Line prices come from the catalogue but stay editable. Nobody has seen the
 * piece yet, and a jeweler reading a photo knows things the task list does not.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Delete as DeleteIcon, Send as SendIcon, Save as SaveIcon } from '@mui/icons-material';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';
import tasksService from '@/services/tasks.service';

const money = (n) => `$${(Number(n) || 0).toFixed(2)}`;

const field = {
  '& .MuiInputBase-root': { color: REPAIRS_UI.textPrimary, backgroundColor: REPAIRS_UI.bgCard },
  '& .MuiOutlinedInput-notchedOutline': { borderColor: REPAIRS_UI.border },
  '& .MuiInputLabel-root': { color: REPAIRS_UI.textMuted },
};

export default function QuoteDialog({ open, lead, onClose, onSaved }) {
  const [items, setItems] = useState([]);
  const [note, setNote] = useState('');
  const [tasks, setTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [existing, setExisting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const total = useMemo(
    () => items.reduce((s, i) => s + (Number(i.unitPrice) || 0) * (Number(i.qty) || 1), 0),
    [items]
  );

  // Load the catalogue once the dialog opens, not on mount — the leads page
  // renders many cards and none of them need the task list until asked.
  useEffect(() => {
    if (!open) return;
    let live = true;
    setLoadingTasks(true);
    tasksService
      .getActiveTasks()
      .then((res) => {
        if (!live) return;
        setTasks(Array.isArray(res?.data) ? res.data : []);
      })
      .catch(() => live && setError('Could not load the task catalogue.'))
      .finally(() => live && setLoadingTasks(false));
    return () => {
      live = false;
    };
  }, [open]);

  // Pick up a quote already on this lead so re-opening edits rather than
  // silently starting over.
  useEffect(() => {
    if (!open || !lead?.repairID) return;
    let live = true;
    fetch(`/api/repairs/${lead.repairID}/quote`)
      .then((r) => r.json())
      .then((json) => {
        if (!live || !json?.success || !json.quote) return;
        setExisting(json.quote);
        setItems(json.quote.items || []);
        setNote(json.quote.note || '');
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [open, lead?.repairID]);

  const reset = useCallback(() => {
    setItems([]);
    setNote('');
    setExisting(null);
    setError('');
  }, []);

  const addTask = (task) => {
    if (!task) return;
    setItems((prev) => [
      ...prev,
      {
        taskId: task.id || task._id || null,
        sku: task.sku || null,
        title: task.title || task.displayName || task.name || 'Repair work',
        qty: 1,
        unitPrice: Number(task.price ?? task.basePrice ?? 0),
      },
    ]);
  };

  const patch = (idx, key, value) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [key]: value } : it)));

  const submit = async (action) => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/repairs/${lead.repairID}/quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, items, note }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'That did not work.');
      onSaved?.(action, json);
      reset();
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const alreadyAccepted = existing?.status === 'accepted';

  return (
    <Dialog
      open={open}
      onClose={() => !busy && onClose()}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { backgroundColor: REPAIRS_UI.bgPanel, color: REPAIRS_UI.textPrimary, backgroundImage: 'none' },
      }}
    >
      <DialogTitle sx={{ pb: 0.5 }}>
        Estimate for {lead?.clientName || 'this lead'}
        <Typography sx={{ color: REPAIRS_UI.textMuted, fontSize: 13 }}>
          {lead?.repairID}
          {existing?.status && existing.status !== 'draft' ? ` · quote ${existing.status}` : ''}
        </Typography>
      </DialogTitle>

      <DialogContent>
        {lead?.description && (
          <Box
            sx={{
              p: 1.5,
              mb: 2,
              borderRadius: 1.5,
              backgroundColor: REPAIRS_UI.bgCard,
              border: '1px solid',
              borderColor: REPAIRS_UI.border,
            }}
          >
            <Typography sx={{ color: REPAIRS_UI.textSecondary, fontSize: 13, whiteSpace: 'pre-wrap' }}>
              {lead.description}
            </Typography>
          </Box>
        )}

        {alreadyAccepted && (
          <Alert severity="info" sx={{ mb: 2 }}>
            The customer already accepted this estimate. Editing it will not change what they agreed to —
            call them if the price needs to move.
          </Alert>
        )}

        <Autocomplete
          options={tasks}
          loading={loadingTasks}
          value={null}
          blurOnSelect
          clearOnBlur
          getOptionLabel={(t) => t.title || t.displayName || t.name || ''}
          onChange={(_e, task) => addTask(task)}
          renderOption={(props, t) => (
            <li {...props} key={t.id || t._id}>
              <Stack direction="row" justifyContent="space-between" sx={{ width: '100%' }}>
                <span>{t.title || t.displayName || t.name}</span>
                <span style={{ color: REPAIRS_UI.textMuted }}>{money(t.price ?? t.basePrice)}</span>
              </Stack>
            </li>
          )}
          renderInput={(p) => (
            <TextField
              {...p}
              size="small"
              label="Add a repair task"
              placeholder="Search the catalogue…"
              sx={field}
              InputProps={{
                ...p.InputProps,
                endAdornment: (
                  <>
                    {loadingTasks ? <CircularProgress size={16} sx={{ color: REPAIRS_UI.accent }} /> : null}
                    {p.InputProps.endAdornment}
                  </>
                ),
              }}
            />
          )}
          sx={{ mb: 2 }}
        />

        {items.length === 0 ? (
          <Typography sx={{ color: REPAIRS_UI.textMuted, fontSize: 14, py: 2, textAlign: 'center' }}>
            No lines yet. Add the work you'd quote for.
          </Typography>
        ) : (
          items.map((item, idx) => (
            <Stack key={`${item.taskId || item.title}-${idx}`} direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <TextField
                size="small"
                value={item.title}
                onChange={(e) => patch(idx, 'title', e.target.value)}
                sx={{ ...field, flex: 1 }}
              />
              <TextField
                size="small"
                type="number"
                label="Qty"
                value={item.qty}
                onChange={(e) => patch(idx, 'qty', Math.max(1, Number(e.target.value) || 1))}
                sx={{ ...field, width: 74 }}
              />
              <TextField
                size="small"
                type="number"
                label="Price"
                value={item.unitPrice}
                onChange={(e) => patch(idx, 'unitPrice', Math.max(0, Number(e.target.value) || 0))}
                sx={{ ...field, width: 108 }}
              />
              <IconButton
                onClick={() => setItems((p) => p.filter((_, i) => i !== idx))}
                sx={{ color: REPAIRS_UI.textMuted }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Stack>
          ))
        )}

        <Stack direction="row" justifyContent="space-between" sx={{ mt: 2, mb: 2 }}>
          <Typography sx={{ color: REPAIRS_UI.textSecondary }}>Total</Typography>
          <Typography sx={{ color: REPAIRS_UI.accent, fontWeight: 600, fontSize: 20 }}>{money(total)}</Typography>
        </Stack>

        <TextField
          fullWidth
          multiline
          rows={3}
          size="small"
          label="Note to the customer (optional)"
          placeholder="Anything they should know before agreeing."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          sx={field}
        />

        <Typography sx={{ color: REPAIRS_UI.textMuted, fontSize: 12, mt: 1.5 }}>
          The email says this is subject to inspection, and the link expires after 30 days.
        </Typography>

        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      </DialogContent>

      <DialogActions>
        <Button disabled={busy} onClick={onClose} sx={{ color: REPAIRS_UI.textSecondary }}>
          Back
        </Button>
        <Button
          disabled={busy || items.length === 0}
          startIcon={<SaveIcon fontSize="small" />}
          onClick={() => submit('save')}
          sx={{ color: REPAIRS_UI.textPrimary }}
        >
          Save draft
        </Button>
        <Button
          disabled={busy || items.length === 0}
          startIcon={busy ? <CircularProgress size={14} sx={{ color: REPAIRS_UI.accent }} /> : <SendIcon fontSize="small" />}
          onClick={() => submit('send')}
          sx={{ color: REPAIRS_UI.accent }}
        >
          {busy ? 'Working…' : 'Send to customer'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
