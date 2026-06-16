'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Button, Chip, Table, TableHead, TableRow, TableCell, TableBody,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, CircularProgress, Stack, Paper,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useRouter } from 'next/navigation';

const STATUS_COLOR = {
  pending: 'default', consultation: 'info', design: 'info', quote: 'warning',
  deposit: 'warning', in_production: 'primary', qc: 'secondary',
  completed: 'success', delivered: 'success', cancelled: 'error',
};

export default function CustomsPage() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ customerName: '', title: '', description: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/custom-orders');
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to load custom orders');
      setOrders(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/custom-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to create');
      const created = await res.json();
      setOpen(false);
      setForm({ customerName: '', title: '', description: '' });
      router.push(`/dashboard/customs/${created.customID}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4">Customs</Typography>
          <Typography variant="body2" color="text.secondary">
            New custom orders (legacy custom tickets live under &ldquo;Custom Tickets (Legacy)&rdquo;).
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>New Custom</Button>
      </Stack>

      {error && <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>}

      {loading ? (
        <CircularProgress />
      ) : orders.length === 0 ? (
        <Typography color="text.secondary">No custom orders yet. Create one to get started.</Typography>
      ) : (
        <Paper variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Title</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Quote</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {orders.map((o) => (
                <TableRow
                  key={o.customID}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => router.push(`/dashboard/customs/${o.customID}`)}
                >
                  <TableCell>{o.customID}</TableCell>
                  <TableCell>{o.customerName || o.clientID || '—'}</TableCell>
                  <TableCell>{o.title || '—'}</TableCell>
                  <TableCell><Chip size="small" label={o.status} color={STATUS_COLOR[o.status] || 'default'} /></TableCell>
                  <TableCell align="right">${(o.quote?.quoteTotal || 0).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>New Custom Order</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Customer name" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} fullWidth />
            <TextField label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} fullWidth />
            <TextField label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} fullWidth multiline rows={3} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={create} disabled={saving || (!form.customerName && !form.title)}>Create</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
