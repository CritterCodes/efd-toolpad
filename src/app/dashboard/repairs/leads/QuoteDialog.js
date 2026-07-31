"use client";

/**
 * Quote a lead using the real repair form.
 *
 * WHY THE FULL FORM
 * -----------------
 * A first attempt used a cut-down task picker. That was wrong: quoting needs
 * everything building a repair needs — metal and karat, sizing, materials,
 * custom lines, rush, delivery, tax — because the number sent to the customer
 * has to be the number the bench will actually charge. Anything the simplified
 * picker could not express would have quietly produced a wrong quote.
 *
 * So this is NewRepairForm with `persistOnSubmit={false}`: identical to writing
 * a repair, except submitting saves and sends an estimate instead of creating
 * one. The lead stays a lead. It only becomes a repair when the piece is
 * physically dropped off.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';
import NewRepairForm from '@/app/components/repairs/NewRepairForm';

const money = (n) => `$${(Number(n) || 0).toFixed(2)}`;

export default function QuoteDialog({ open, lead, onClose, onSaved }) {
  const [existing, setExisting] = useState(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !lead?.repairID) return undefined;
    let live = true;
    setError('');
    fetch(`/api/repairs/${lead.repairID}/quote`)
      .then((r) => r.json())
      .then((json) => {
        if (!live || !json?.success) return;
        setExisting(json.quote || null);
        setNote(json.quote?.note || '');
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [open, lead?.repairID]);

  /**
   * NewRepairForm hands back exactly what it would have written as a repair.
   * Turn that into an estimate instead.
   */
  const handleSubmit = useCallback(
    async (submission) => {
      setError('');
      try {
        const res = await fetch(`/api/repairs/${lead.repairID}/quote`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'send', note, submission }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'That did not work.');
        onSaved?.('send', json);
        onClose();
      } catch (e) {
        setError(e.message);
      }
    },
    [lead?.repairID, note, onSaved, onClose]
  );

  // Carry what the lead already told us into the form so nobody retypes it.
  const initialData = lead
    ? {
        clientName: lead.clientName || '',
        clientEmail: lead.clientEmail || lead.leadContact || '',
        clientPhone: lead.clientPhone || '',
        description: lead.description || '',
        userID: lead.userID || null,
        picture: lead.picture || null,
        ...(existing?.submission || {}),
      }
    : null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: REPAIRS_UI.bgPanel,
          color: REPAIRS_UI.textPrimary,
          backgroundImage: 'none',
          height: '92vh',
        },
      }}
    >
      <DialogTitle sx={{ pb: 0.5, pr: 6 }}>
        Estimate for {lead?.clientName || 'this lead'}
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
          <Typography sx={{ color: REPAIRS_UI.textMuted, fontSize: 13 }}>{lead?.repairID}</Typography>
          {existing?.status && existing.status !== 'draft' && (
            <Chip
              size="small"
              label={`${existing.status} · ${money(existing.total)}`}
              sx={{
                height: 20,
                fontSize: 11,
                backgroundColor: 'transparent',
                border: '1px solid',
                borderColor: existing.status === 'declined' ? '#B4736A' : REPAIRS_UI.accent,
                color: existing.status === 'declined' ? '#B4736A' : REPAIRS_UI.accent,
              }}
            />
          )}
        </Stack>
        <IconButton onClick={onClose} sx={{ position: 'absolute', top: 12, right: 12, color: REPAIRS_UI.textMuted }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ borderColor: REPAIRS_UI.border }}>
        {existing?.status === 'accepted' && (
          <Alert severity="info" sx={{ mb: 2 }}>
            The customer already accepted this estimate at {money(existing.total)}. Re-sending is blocked —
            if the price needs to move, call them.
          </Alert>
        )}

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

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
          <Typography sx={{ color: REPAIRS_UI.textMuted, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            What they told us
          </Typography>
          <Typography sx={{ color: REPAIRS_UI.textSecondary, fontSize: 13.5, whiteSpace: 'pre-wrap', mt: 0.5 }}>
            {lead?.description || '—'}
          </Typography>
        </Box>

        <TextField
          fullWidth
          multiline
          rows={2}
          size="small"
          label="Note to the customer (appears in the email)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          sx={{
            mb: 2,
            '& .MuiInputBase-root': { color: REPAIRS_UI.textPrimary, backgroundColor: REPAIRS_UI.bgCard },
            '& .MuiOutlinedInput-notchedOutline': { borderColor: REPAIRS_UI.border },
            '& .MuiInputLabel-root': { color: REPAIRS_UI.textMuted },
          }}
        />

        <Typography sx={{ color: REPAIRS_UI.textMuted, fontSize: 12, mb: 2 }}>
          Price it exactly as you would the real repair. Nothing is created until they drop the piece off —
          this only saves and emails the estimate. The link expires after 30 days.
        </Typography>

        <NewRepairForm
          onSubmit={handleSubmit}
          initialData={initialData}
          submitMode="create"
          persistOnSubmit={false}
          submitLabel="Save & send estimate"
          clientInfo={
            lead
              ? {
                  userID: lead.userID || null,
                  firstName: (lead.clientName || '').split(/\s+/)[0] || '',
                  lastName: (lead.clientName || '').split(/\s+/).slice(1).join(' '),
                  email: lead.clientEmail || lead.leadContact || '',
                  phoneNumber: lead.clientPhone || '',
                }
              : null
          }
        />
      </DialogContent>
    </Dialog>
  );
}
