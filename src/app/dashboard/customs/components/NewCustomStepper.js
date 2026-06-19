import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Stepper, Step, StepLabel,
  TextField, MenuItem, Stack, Grid, Typography, Box, FormControlLabel, Switch, Alert,
  Autocomplete, Avatar, CircularProgress,
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAddAlt';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';
import UsersService from '@/services/users';
import NewClientForm from '@/app/components/clients/newClientForm.component';
import {
  JEWELRY_TYPES, METAL_TYPES, GOLD_COLORS, getKaratOptions, BUDGET_RANGES, TIMELINE_OPTIONS,
  GEMSTONE_OPTIONS, isRushTimeline, metalDisplay,
} from '@/constants/customRequest.constants';

const STEPS = ['Client', 'Specification', 'Review'];

const dialogPaperProps = {
  sx: { backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', color: REPAIRS_UI.textPrimary, border: `1px solid ${REPAIRS_UI.border}` },
};
const goldBtn = { backgroundColor: REPAIRS_UI.accent, color: '#1A1A1A', fontWeight: 600, '&:hover': { backgroundColor: '#C19B2E' } };

const EMPTY = {
  selectedClient: null, isRush: false,
  jewelryType: '', metalType: '', karat: '', goldColor: '', size: '', gemstones: [],
  budget: '', timeline: '', description: '', specialRequests: '',
};

function clientLabel(c) {
  if (!c) return '';
  const name = [c.firstName, c.lastName].filter(Boolean).join(' ').trim() || c.name || c.email || c.userID;
  return `${name}${c.userID ? ` (${c.userID})` : ''}`;
}
function clientName(c) {
  return [c?.firstName, c?.lastName].filter(Boolean).join(' ').trim() || c?.name || c?.email || '';
}

export default function NewCustomStepper({ open, onClose, onCreated, onError }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [addClientOpen, setAddClientOpen] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const reset = () => { setForm(EMPTY); setStep(0); };
  const close = () => { if (!saving) { reset(); onClose(); } };

  const loadClients = useCallback(async () => {
    setClientsLoading(true);
    try {
      const res = await UsersService.getAllUsers();
      setClients(Array.isArray(res?.users) ? res.users : (Array.isArray(res) ? res : []));
    } catch { setClients([]); } finally { setClientsLoading(false); }
  }, []);
  useEffect(() => { if (open) loadClients(); }, [open, loadClients]);

  const onClientCreated = (newClient) => {
    if (!newClient) return;
    setClients((prev) => [newClient, ...prev]);
    set('selectedClient', newClient);
    setAddClientOpen(false);
  };

  const hasClient = !!form.selectedClient?.userID;

  const create = async () => {
    setSaving(true);
    try {
      const c = form.selectedClient || {};
      const payload = {
        clientID: c.userID || null,
        customerName: clientName(c),
        customerEmail: c.email || '',
        customerPhone: c.phoneNumber || c.phone || '',
        // type is always custom-design (model default); title is deprecated.
        isRush: form.isRush || isRushTimeline(form.timeline),
        jewelryType: form.jewelryType, metalType: form.metalType, karat: form.karat, goldColor: form.goldColor, size: form.size,
        gemstones: form.gemstones,
        budget: form.budget || null,
        timeline: form.timeline || null,
        description: form.description, specialRequests: form.specialRequests,
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
            {/* Client from the client base (create-if-missing, like repair intake) */}
            <Stack direction="row" spacing={1} alignItems="flex-start">
              <Autocomplete
                sx={{ flex: 1 }}
                options={clients}
                loading={clientsLoading}
                value={form.selectedClient}
                onChange={(_, v) => set('selectedClient', v)}
                getOptionLabel={clientLabel}
                isOptionEqualToValue={(o, v) => o?.userID === v?.userID}
                renderInput={(params) => (
                  <TextField {...params} label="Client" placeholder="Search by name or ID…" fullWidth
                    InputProps={{ ...params.InputProps, endAdornment: (<>{clientsLoading ? <CircularProgress size={18} /> : null}{params.InputProps.endAdornment}</>) }} />
                )}
              />
              <Button variant="outlined" startIcon={<PersonAddIcon />} onClick={() => setAddClientOpen(true)} sx={{ mt: 0.5, whiteSpace: 'nowrap', borderColor: REPAIRS_UI.border, color: REPAIRS_UI.textPrimary }}>New</Button>
            </Stack>

            {form.selectedClient && (
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ p: 1.5, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, backgroundColor: REPAIRS_UI.bgCard }}>
                <Avatar src={form.selectedClient.image || undefined} sx={{ bgcolor: REPAIRS_UI.bgTertiary }}>{(clientName(form.selectedClient)[0] || '?').toUpperCase()}</Avatar>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 600, color: REPAIRS_UI.textPrimary }} noWrap>{clientName(form.selectedClient) || '—'}</Typography>
                  <Typography variant="caption" sx={{ color: REPAIRS_UI.textSecondary }}>
                    {[form.selectedClient.email, form.selectedClient.phoneNumber || form.selectedClient.phone].filter(Boolean).join(' · ') || form.selectedClient.userID}
                  </Typography>
                </Box>
              </Stack>
            )}

          </Stack>
        )}

        {step === 1 && (
          <Stack spacing={2}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField select label="Jewelry type" value={form.jewelryType} onChange={(e) => set('jewelryType', e.target.value)} fullWidth>
                  {JEWELRY_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Size" placeholder="ring size / chain length" value={form.size} onChange={(e) => set('size', e.target.value)} fullWidth />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField select label="Metal type" value={form.metalType}
                  onChange={(e) => setForm((f) => ({ ...f, metalType: e.target.value, karat: '', goldColor: '' }))} fullWidth>
                  {METAL_TYPES.map((m) => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
                </TextField>
              </Grid>
              {getKaratOptions(form.metalType).length > 0 && (
                <Grid item xs={12} sm={6}>
                  <TextField select label="Karat / purity" value={form.karat} onChange={(e) => set('karat', e.target.value)} fullWidth>
                    {getKaratOptions(form.metalType).map((k) => <MenuItem key={k} value={k}>{k}</MenuItem>)}
                  </TextField>
                </Grid>
              )}
              {form.metalType === 'gold' && (
                <Grid item xs={12} sm={6}>
                  <TextField select label="Gold color" value={form.goldColor} onChange={(e) => set('goldColor', e.target.value)} fullWidth>
                    {GOLD_COLORS.map((c) => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
                  </TextField>
                </Grid>
              )}
              <Grid item xs={12} sm={6}>
                <TextField select label="Budget" value={form.budget} onChange={(e) => set('budget', e.target.value)} fullWidth>
                  {BUDGET_RANGES.map((b) => <MenuItem key={b} value={b}>{b}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField select label="Timeline" value={form.timeline} onChange={(e) => set('timeline', e.target.value)} fullWidth>
                  {TIMELINE_OPTIONS.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <Autocomplete
                  multiple freeSolo options={GEMSTONE_OPTIONS} value={form.gemstones}
                  onChange={(_, v) => set('gemstones', v)}
                  renderInput={(params) => <TextField {...params} label="Gemstones" placeholder="add stone…" />}
                />
              </Grid>
            </Grid>
            <FormControlLabel control={<Switch checked={form.isRush} onChange={(e) => set('isRush', e.target.checked)} />} label="Rush order" />
            <TextField label="Description" value={form.description} onChange={(e) => set('description', e.target.value)} fullWidth multiline minRows={2} />
            <TextField label="Special requests" value={form.specialRequests} onChange={(e) => set('specialRequests', e.target.value)} fullWidth multiline minRows={2} />
          </Stack>
        )}

        {step === 2 && (
          <Box>
            {!hasClient && <Alert severity="warning" sx={{ mb: 2 }}>Select or create a client before creating.</Alert>}
            <Stack spacing={0.75} sx={{ '& .row': { display: 'flex', justifyContent: 'space-between', gap: 2 } }}>
              {[
                ['Client', clientName(form.selectedClient) || '—'],
                ['Contact', [form.selectedClient?.email, form.selectedClient?.phoneNumber || form.selectedClient?.phone].filter(Boolean).join(' · ') || '—'],
                ['Jewelry', [form.jewelryType, metalDisplay(form.metalType, form.goldColor), form.karat, form.size && `sz ${form.size}`].filter(Boolean).join(' · ') || '—'],
                ['Gemstones', form.gemstones.length ? form.gemstones.join(', ') : '—'],
                ['Budget', form.budget || '—'],
                ['Timeline', (form.timeline || '—') + ((form.isRush || isRushTimeline(form.timeline)) ? ' · RUSH' : '')],
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
          ? <Button variant="contained" onClick={() => setStep((s) => s + 1)} disabled={step === 0 && !hasClient} sx={goldBtn}>Next</Button>
          : <Button variant="contained" onClick={create} disabled={saving || !hasClient} sx={goldBtn}>{saving ? 'Creating…' : 'Create'}</Button>}
      </DialogActions>

      <NewClientForm open={addClientOpen} onClose={() => setAddClientOpen(false)} onClientCreated={onClientCreated} />
    </Dialog>
  );
}
