import React, { useState } from 'react';
import {
  Grid, Paper, Stack, Typography, Box, Button, Avatar, Divider, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Autocomplete,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import EditIcon from '@mui/icons-material/Edit';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';
import {
  JEWELRY_TYPES, METAL_TYPES, GOLD_COLORS, getKaratOptions, BUDGET_RANGES, TIMELINE_OPTIONS,
  GEMSTONE_OPTIONS, metalDisplay, karatLabel,
} from '@/constants/customRequest.constants';

const panelSx = { p: { xs: 2, md: 3 }, backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' };
const dialogPaperProps = { sx: { backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', color: REPAIRS_UI.textPrimary, border: `1px solid ${REPAIRS_UI.border}` } };
const money = (n) => `$${(Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Not set');
const titleCase = (s) => String(s || '').replace(/[-_]/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

function SectionHead({ children }) {
  return <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: REPAIRS_UI.textSecondary, mb: 1 }}>{children}</Typography>;
}
function DetailRow({ label, value, chip }) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ py: 0.25 }}>
      <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary }}>{label}</Typography>
      {chip || <Typography variant="body2" sx={{ color: REPAIRS_UI.textPrimary, fontWeight: 500 }}>{value ?? '—'}</Typography>}
    </Stack>
  );
}
function StatBox({ label, value, color }) {
  return (
    <Box sx={{ textAlign: 'center', p: 1.5, backgroundColor: REPAIRS_UI.bgTertiary, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2 }}>
      <Typography variant="caption" sx={{ color: REPAIRS_UI.textSecondary }}>{label}</Typography>
      <Typography sx={{ fontSize: '1.25rem', fontWeight: 700, color: color || REPAIRS_UI.textHeader }}>{value}</Typography>
    </Box>
  );
}

const CUSTOMER_FIELDS = [['customerName', 'Name'], ['customerEmail', 'Email'], ['customerPhone', 'Phone']];

export default function OverviewTab({ order, billing, busy, onSave }) {
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({});

  const openEdit = () => {
    setForm({
      customerName: order.customerName || '', customerEmail: order.customerEmail || '', customerPhone: order.customerPhone || '',
      priority: order.priority || 'normal',
      jewelryType: order.jewelryType || '', metalType: order.metalType || '', karat: order.karat || '', goldColor: order.goldColor || '', size: order.size || '',
      gemstones: Array.isArray(order.gemstones) ? order.gemstones : [],
      budget: order.budget ?? '', timeline: order.timeline || '', dueDate: order.dueDate ? String(order.dueDate).slice(0, 10) : '',
      // Request = flattened description + legacy specialRequests.
      description: [order.description, order.specialRequests].filter((t) => t && t.trim()).join('\n\n'),
    });
    setEditOpen(true);
  };
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const save = async () => {
    // Persist the flattened request into description and clear the legacy field.
    await onSave({ ...form, budget: form.budget || null, timeline: form.timeline || null, dueDate: form.dueDate || null, specialRequests: '' });
    setEditOpen(false);
  };

  const q = order.quote || {};
  const progress = billing?.progress;
  const owed = progress ? Math.max(0, (Number(progress.projectTotal) || 0) - (Number(progress.totalPaid) || 0)) : null;
  // Prefer the requested gemstones (intake spec); fall back to quote-derived stones.
  const gems = (Array.isArray(order.gemstones) && order.gemstones.length)
    ? order.gemstones
    : [
        q.centerstone?.item,
        ...((q.accentStones || []).map((s) => s.description)),
        // legacy fallback: gemstone-tagged generic lines
        ...((q.materialCosts || []).filter((m) => m.category === 'gemstone').map((m) => m.name)),
      ].filter(Boolean);
  const cadAssignees = (order.assignments || []).map((a) => a.name).filter(Boolean);
  // The request is the flattened description + any legacy special requests.
  const requestText = [order.description, order.specialRequests].filter((t) => t && t.trim()).join('\n\n');

  const details = [
    ['Created', fmtDate(order.createdAt)],
    ['Updated', fmtDate(order.updatedAt)],
    ['Jewelry type', titleCase(order.jewelryType)],
    ['Metal', metalDisplay(order.metalType, order.goldColor) || null],
    ['Karat', order.karat ? karatLabel(order.karat) : null],
    ['Size', order.size],
    ['Budget', order.budget || null],
    ['Timeline', order.timeline || null],
    ['Due date', order.dueDate ? fmtDate(order.dueDate) : null],
  ];

  return (
    <Paper sx={panelSx}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography sx={{ fontWeight: 600, fontSize: '1.1rem', color: REPAIRS_UI.textHeader }}>Overview</Typography>
        <Button size="small" startIcon={<EditIcon sx={{ fontSize: 16 }} />} onClick={openEdit} sx={{ color: REPAIRS_UI.accent }}>Edit</Button>
      </Stack>

      <Grid container spacing={3}>
        {/* Customer Information */}
        <Grid item xs={12} md={6}>
          <SectionHead>Customer Information</SectionHead>
          <Stack direction="row" spacing={2} alignItems="flex-start">
            <Avatar sx={{ bgcolor: REPAIRS_UI.accent, color: '#1A1A1A' }}><PersonIcon /></Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 600, color: REPAIRS_UI.textPrimary }}>{order.customerName || 'Unknown customer'}</Typography>
              {order.customerEmail && <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }}><EmailIcon sx={{ fontSize: 15, color: REPAIRS_UI.textMuted }} /><Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary }}>{order.customerEmail}</Typography></Stack>}
              {order.customerPhone && <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }}><PhoneIcon sx={{ fontSize: 15, color: REPAIRS_UI.textMuted }} /><Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary }}>{order.customerPhone}</Typography></Stack>}
              {order.clientID && <Typography variant="body2" sx={{ color: REPAIRS_UI.textMuted, mt: 0.5 }}>Client ID: {order.clientID}</Typography>}
            </Box>
          </Stack>
        </Grid>

        {/* Ticket Details */}
        <Grid item xs={12} md={6}>
          <SectionHead>Order Details</SectionHead>
          <Stack spacing={0.25}>
            <DetailRow label="Priority" chip={<Chip size="small" label={(order.priority || 'normal').toUpperCase()} color={order.priority === 'high' ? 'error' : 'default'} />} />
            {details.filter(([, v]) => v != null && v !== '').map(([label, v]) => <DetailRow key={label} label={label} value={v} />)}
          </Stack>
        </Grid>

        {/* Request */}
        {requestText && (
          <Grid item xs={12}>
            <SectionHead>Request</SectionHead>
            <Typography variant="body2" sx={{ mt: 0.5, p: 2, backgroundColor: REPAIRS_UI.bgCard, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 1, color: REPAIRS_UI.textPrimary, whiteSpace: 'pre-wrap' }}>{requestText}</Typography>
          </Grid>
        )}

        {/* Financial Summary */}
        <Grid item xs={12}>
          <SectionHead>Financial Summary</SectionHead>
          <Grid container spacing={2}>
            <Grid item xs={6} sm={4}><StatBox label="Quote total" value={money(q.quoteTotal)} color={REPAIRS_UI.accent} /></Grid>
            {owed != null && <Grid item xs={6} sm={4}><StatBox label="Owed (outstanding)" value={money(owed)} color={owed > 0 ? '#FFB74D' : '#66BB6A'} /></Grid>}
            {progress && <Grid item xs={6} sm={4}><StatBox label="Paid" value={`${progress.paymentProgress || 0}%`} /></Grid>}
          </Grid>
        </Grid>

        {/* Status & Properties */}
        <Grid item xs={12}>
          <SectionHead>Status &amp; Properties</SectionHead>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {gems.length > 0 && <Chip size="small" variant="outlined" color="info" label={`Gemstones: ${gems.join(', ')}`} />}
            {order.priority === 'high' && <Chip size="small" color="error" label="High priority" />}
            {order.isRush && <Chip size="small" sx={{ bgcolor: '#FF4444', color: '#fff' }} label="Rush" />}
            {cadAssignees.map((n) => <Chip key={n} size="small" variant="outlined" color="primary" label={`Assigned: ${n}`} />)}
            {progress?.isFullyPaid && <Chip size="small" color="success" label="No outstanding balance" />}
            {(order.communications || []).length === 0 && (order.notes || []).length === 0 && <Chip size="small" variant="outlined" label="No communications" />}
          </Stack>
        </Grid>
      </Grid>

      <Dialog open={editOpen} onClose={() => !busy && setEditOpen(false)} fullWidth maxWidth="sm" PaperProps={dialogPaperProps}>
        <DialogTitle>Edit details</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {CUSTOMER_FIELDS.map(([k, label]) => <TextField key={k} label={label} value={form[k] ?? ''} onChange={(e) => set(k, e.target.value)} fullWidth />)}
            <TextField select label="Priority" value={form.priority ?? 'normal'} onChange={(e) => set('priority', e.target.value)} fullWidth>
              <MenuItem value="normal">Normal</MenuItem>
              <MenuItem value="high">High</MenuItem>
            </TextField>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField select label="Jewelry type" value={form.jewelryType ?? ''} onChange={(e) => set('jewelryType', e.target.value)} fullWidth>
                  {JEWELRY_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}><TextField label="Size" placeholder="ring size / chain length" value={form.size ?? ''} onChange={(e) => set('size', e.target.value)} fullWidth /></Grid>
              <Grid item xs={6}>
                <TextField select label="Metal" value={form.metalType ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, metalType: e.target.value, karat: '', goldColor: '' }))} fullWidth>
                  {METAL_TYPES.map((m) => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
                </TextField>
              </Grid>
              {getKaratOptions(form.metalType).length > 0 && (
                <Grid item xs={6}>
                  <TextField select label="Karat / purity" value={form.karat ?? ''} onChange={(e) => set('karat', e.target.value)} fullWidth>
                    {getKaratOptions(form.metalType).map((k) => <MenuItem key={k} value={k}>{k}</MenuItem>)}
                  </TextField>
                </Grid>
              )}
              {form.metalType === 'gold' && (
                <Grid item xs={6}>
                  <TextField select label="Gold color" value={form.goldColor ?? ''} onChange={(e) => set('goldColor', e.target.value)} fullWidth>
                    {GOLD_COLORS.map((c) => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
                  </TextField>
                </Grid>
              )}
              <Grid item xs={6}>
                <TextField select label="Budget" value={form.budget ?? ''} onChange={(e) => set('budget', e.target.value)} fullWidth>
                  {BUDGET_RANGES.map((b) => <MenuItem key={b} value={b}>{b}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField select label="Timeline" value={form.timeline ?? ''} onChange={(e) => set('timeline', e.target.value)} fullWidth>
                  {TIMELINE_OPTIONS.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <Autocomplete
                  multiple freeSolo options={GEMSTONE_OPTIONS} value={form.gemstones ?? []}
                  onChange={(_, v) => set('gemstones', v)}
                  renderInput={(params) => <TextField {...params} label="Gemstones" placeholder="add stone…" />}
                />
              </Grid>
              <Grid item xs={6}><TextField label="Due date" type="date" InputLabelProps={{ shrink: true }} value={form.dueDate ?? ''} onChange={(e) => set('dueDate', e.target.value)} fullWidth /></Grid>
            </Grid>
            <TextField label="Request details" placeholder="Describe the piece, inspiration, engraving, special requests…" value={form.description ?? ''} onChange={(e) => set('description', e.target.value)} fullWidth multiline minRows={4} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)} sx={{ color: REPAIRS_UI.textSecondary }}>Cancel</Button>
          <Button variant="contained" onClick={save} disabled={busy} sx={{ backgroundColor: REPAIRS_UI.accent, color: '#1A1A1A', fontWeight: 600, '&:hover': { backgroundColor: '#C19B2E' } }}>Save</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
