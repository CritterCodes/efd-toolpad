import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Stepper, Step, StepLabel,
  TextField, MenuItem, Stack, Grid, Typography, Box, FormControlLabel, Switch, Alert,
} from '@mui/material';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';

const STEPS = ['Client & Title', 'Specification', 'Review'];

const dialogPaperProps = {
  sx: { backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', color: REPAIRS_UI.textPrimary, border: `1px solid ${REPAIRS_UI.border}` },
};

const EMPTY = {
  customerName: '', customerEmail: '', customerPhone: '', title: '', type: 'custom-design', isRush: false,
  jewelryType: '', metalType: '', karat: '', size: '', budget: '', dueDate: '', description: '', specialRequests: '',
};

const goldBtn = { backgroundColor: REPAIRS_UI.accent, color: '#1A1A1A', fontWeight: 600, '&:hover': { backgroundColor: '#C19B2E' } };

export default function NewCustomStepper({ open, onClose, onCreated, onError }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const reset = () => { setForm(EMPTY); setStep(0); };
  const close = () => { if (!saving) { reset(); onClose(); } };

  const step0Valid = form.customerName.trim() || form.title.trim();

  const create = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        budget: form.budget === '' ? null : Number(form.budget),
        dueDate: form.dueDate || null,
      };
      const res = await fetch('/api/custom-orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to create');
      const created = await res.json();
      reset();
      onCreated(created.customID);
    } catch (e) {
      onError?.(e.message);
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="sm" PaperProps={dialogPaperProps}>
      <DialogTitle>New Custom Order</DialogTitle>
      <DialogContent>
        <Stepper activeStep={step} sx={{ mb: 3, mt: 1, '& .MuiStepLabel-label': { color: REPAIRS_UI.textSecondary }, '& .Mui-active': { color: REPAIRS_UI.accent }, '& .Mui-completed': { color: REPAIRS_UI.accent } }}>
          {STEPS.map((s) => <Step key={s}><StepLabel>{s}</StepLabel></Step>)}
        </Stepper>

        {step === 0 && (
          <Stack spacing={2}>
            <TextField label="Customer name" value={form.customerName} onChange={(e) => set('customerName', e.target.value)} fullWidth autoFocus />
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}><TextField label="Email" value={form.customerEmail} onChange={(e) => set('customerEmail', e.target.value)} fullWidth /></Grid>
              <Grid item xs={12} sm={6}><TextField label="Phone" value={form.customerPhone} onChange={(e) => set('customerPhone', e.target.value)} fullWidth /></Grid>
            </Grid>
            <TextField label="Title" value={form.title} onChange={(e) => set('title', e.target.value)} fullWidth />
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6}>
                <TextField select label="Type" value={form.type} onChange={(e) => set('type', e.target.value)} fullWidth>
                  <MenuItem value="custom-design">Custom Design</MenuItem>
                  <MenuItem value="repair">Repair</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControlLabel control={<Switch checked={form.isRush} onChange={(e) => set('isRush', e.target.checked)} />} label="Rush order" />
              </Grid>
            </Grid>
          </Stack>
        )}

        {step === 1 && (
          <Stack spacing={2}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}><TextField label="Jewelry type" placeholder="ring, pendant…" value={form.jewelryType} onChange={(e) => set('jewelryType', e.target.value)} fullWidth /></Grid>
              <Grid item xs={12} sm={6}><TextField label="Metal type" placeholder="14k yellow gold…" value={form.metalType} onChange={(e) => set('metalType', e.target.value)} fullWidth /></Grid>
              <Grid item xs={6} sm={3}><TextField label="Karat" value={form.karat} onChange={(e) => set('karat', e.target.value)} fullWidth /></Grid>
              <Grid item xs={6} sm={3}><TextField label="Size" value={form.size} onChange={(e) => set('size', e.target.value)} fullWidth /></Grid>
              <Grid item xs={6} sm={3}><TextField label="Budget" type="number" value={form.budget} onChange={(e) => set('budget', e.target.value)} fullWidth /></Grid>
              <Grid item xs={6} sm={3}><TextField label="Due date" type="date" InputLabelProps={{ shrink: true }} value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)} fullWidth /></Grid>
            </Grid>
            <TextField label="Description" value={form.description} onChange={(e) => set('description', e.target.value)} fullWidth multiline minRows={2} />
            <TextField label="Special requests" value={form.specialRequests} onChange={(e) => set('specialRequests', e.target.value)} fullWidth multiline minRows={2} />
          </Stack>
        )}

        {step === 2 && (
          <Box>
            {!step0Valid && <Alert severity="warning" sx={{ mb: 2 }}>Add a customer name or title before creating.</Alert>}
            <Stack spacing={0.75} sx={{ '& .row': { display: 'flex', justifyContent: 'space-between', gap: 2 } }}>
              {[
                ['Customer', form.customerName || '—'],
                ['Contact', [form.customerEmail, form.customerPhone].filter(Boolean).join(' · ') || '—'],
                ['Title', form.title || '—'],
                ['Type', form.type + (form.isRush ? ' · RUSH' : '')],
                ['Jewelry', [form.jewelryType, form.metalType, form.karat && `${form.karat}k`, form.size && `sz ${form.size}`].filter(Boolean).join(' · ') || '—'],
                ['Budget', form.budget ? `$${Number(form.budget).toLocaleString()}` : '—'],
                ['Due', form.dueDate || '—'],
              ].map(([k, v]) => (
                <Box className="row" key={k}>
                  <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary }}>{k}</Typography>
                  <Typography variant="body2" sx={{ color: REPAIRS_UI.textPrimary, textAlign: 'right' }}>{v}</Typography>
                </Box>
              ))}
              {form.description && <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted, mt: 1 }}>{form.description}</Typography>}
            </Stack>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={close} sx={{ color: REPAIRS_UI.textSecondary }}>Cancel</Button>
        <Box sx={{ flex: 1 }} />
        {step > 0 && <Button onClick={() => setStep((s) => s - 1)} sx={{ color: REPAIRS_UI.textPrimary }}>Back</Button>}
        {step < STEPS.length - 1
          ? <Button variant="contained" onClick={() => setStep((s) => s + 1)} sx={goldBtn}>Next</Button>
          : <Button variant="contained" onClick={create} disabled={saving || !step0Valid} sx={goldBtn}>{saving ? 'Creating…' : 'Create'}</Button>}
      </DialogActions>
    </Dialog>
  );
}
