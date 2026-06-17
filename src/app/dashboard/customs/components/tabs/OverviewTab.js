import React, { useState } from 'react';
import {
  Grid, Paper, Stack, Typography, Box, Button, Avatar, Divider,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import EditIcon from '@mui/icons-material/Edit';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';

const panelSx = { p: 2.5, height: '100%', backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' };
const dialogPaperProps = { sx: { backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', color: REPAIRS_UI.textPrimary, border: `1px solid ${REPAIRS_UI.border}` } };

function Row({ icon: Icon, label, value }) {
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      {Icon && <Icon sx={{ fontSize: 16, color: REPAIRS_UI.textMuted }} />}
      <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary, minWidth: 110 }}>{label}</Typography>
      <Typography variant="body2" sx={{ color: REPAIRS_UI.textPrimary }}>{value || '—'}</Typography>
    </Stack>
  );
}

const SPEC_FIELDS = [
  ['jewelryType', 'Jewelry type'], ['metalType', 'Metal'], ['karat', 'Karat'], ['size', 'Size'],
  ['budget', 'Budget'], ['dueDate', 'Due date'],
];
const CUSTOMER_FIELDS = [['customerName', 'Name'], ['customerEmail', 'Email'], ['customerPhone', 'Phone']];

export default function OverviewTab({ order, busy, onSave }) {
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({});

  const openEdit = () => {
    setForm({
      customerName: order.customerName || '', customerEmail: order.customerEmail || '', customerPhone: order.customerPhone || '',
      jewelryType: order.jewelryType || '', metalType: order.metalType || '', karat: order.karat || '', size: order.size || '',
      budget: order.budget ?? '', dueDate: order.dueDate ? String(order.dueDate).slice(0, 10) : '',
      description: order.description || '', specialRequests: order.specialRequests || '',
    });
    setEditOpen(true);
  };
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const save = async () => {
    await onSave({ ...form, budget: form.budget === '' ? null : Number(form.budget), dueDate: form.dueDate || null });
    setEditOpen(false);
  };
  const fmt = (k, v) => (k === 'budget' && v != null && v !== '' ? `$${Number(v).toLocaleString()}` : (k === 'dueDate' && v ? new Date(v).toLocaleDateString() : v));

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={6}>
        <Paper sx={panelSx}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
            <Typography sx={{ fontWeight: 600, color: REPAIRS_UI.textHeader }}>Customer</Typography>
            <Button size="small" startIcon={<EditIcon sx={{ fontSize: 16 }} />} onClick={openEdit} sx={{ color: REPAIRS_UI.accent }}>Edit</Button>
          </Stack>
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
            <Avatar sx={{ bgcolor: REPAIRS_UI.bgTertiary }}><PersonIcon sx={{ color: REPAIRS_UI.textSecondary }} /></Avatar>
            <Typography sx={{ fontWeight: 600, color: REPAIRS_UI.textPrimary }}>{order.customerName || order.clientID || '—'}</Typography>
          </Stack>
          <Stack spacing={1}>
            <Row icon={EmailIcon} label="Email" value={order.customerEmail} />
            <Row icon={PhoneIcon} label="Phone" value={order.customerPhone} />
          </Stack>
        </Paper>
      </Grid>

      <Grid item xs={12} md={6}>
        <Paper sx={panelSx}>
          <Typography sx={{ fontWeight: 600, color: REPAIRS_UI.textHeader, mb: 1.5 }}>Specification</Typography>
          <Stack spacing={1}>
            {SPEC_FIELDS.map(([k, label]) => <Row key={k} label={label} value={fmt(k, order[k])} />)}
          </Stack>
        </Paper>
      </Grid>

      <Grid item xs={12}>
        <Paper sx={panelSx}>
          <Typography sx={{ fontWeight: 600, color: REPAIRS_UI.textHeader, mb: 1 }}>Description</Typography>
          <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary, whiteSpace: 'pre-wrap' }}>{order.description || 'No description.'}</Typography>
          {order.specialRequests && (
            <>
              <Divider sx={{ my: 1.5, borderColor: REPAIRS_UI.border }} />
              <Typography sx={{ fontWeight: 600, color: REPAIRS_UI.textHeader, mb: 1 }}>Special requests</Typography>
              <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary, whiteSpace: 'pre-wrap' }}>{order.specialRequests}</Typography>
            </>
          )}
        </Paper>
      </Grid>

      <Dialog open={editOpen} onClose={() => !busy && setEditOpen(false)} fullWidth maxWidth="sm" PaperProps={dialogPaperProps}>
        <DialogTitle>Edit details</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {CUSTOMER_FIELDS.map(([k, label]) => <TextField key={k} label={label} value={form[k] ?? ''} onChange={(e) => set(k, e.target.value)} fullWidth />)}
            <Grid container spacing={2}>
              <Grid item xs={6}><TextField label="Jewelry type" value={form.jewelryType ?? ''} onChange={(e) => set('jewelryType', e.target.value)} fullWidth /></Grid>
              <Grid item xs={6}><TextField label="Metal" value={form.metalType ?? ''} onChange={(e) => set('metalType', e.target.value)} fullWidth /></Grid>
              <Grid item xs={3}><TextField label="Karat" value={form.karat ?? ''} onChange={(e) => set('karat', e.target.value)} fullWidth /></Grid>
              <Grid item xs={3}><TextField label="Size" value={form.size ?? ''} onChange={(e) => set('size', e.target.value)} fullWidth /></Grid>
              <Grid item xs={3}><TextField label="Budget" type="number" value={form.budget ?? ''} onChange={(e) => set('budget', e.target.value)} fullWidth /></Grid>
              <Grid item xs={3}><TextField label="Due" type="date" InputLabelProps={{ shrink: true }} value={form.dueDate ?? ''} onChange={(e) => set('dueDate', e.target.value)} fullWidth /></Grid>
            </Grid>
            <TextField label="Description" value={form.description ?? ''} onChange={(e) => set('description', e.target.value)} fullWidth multiline minRows={2} />
            <TextField label="Special requests" value={form.specialRequests ?? ''} onChange={(e) => set('specialRequests', e.target.value)} fullWidth multiline minRows={2} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)} sx={{ color: REPAIRS_UI.textSecondary }}>Cancel</Button>
          <Button variant="contained" onClick={save} disabled={busy} sx={{ backgroundColor: REPAIRS_UI.accent, color: '#1A1A1A', fontWeight: 600, '&:hover': { backgroundColor: '#C19B2E' } }}>Save</Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
}
