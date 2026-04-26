'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Alert,
  CircularProgress
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon, PrecisionManufacturing as MachineIcon } from '@mui/icons-material';
import toolsMachineryService from '@/services/toolsMachinery.service';
import { TASKS_UI } from '@/app/dashboard/admin/tasks/components/tasksUi';

const DEFAULT_FORM = {
  name: '',
  category: 'machinery',
  purchasePrice: '',
  expectedUses: '',
  costPerUse: '',
  notes: '',
  isActive: true
};

export default function ToolsMachineryPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({ ...DEFAULT_FORM });

  const loadItems = async () => {
    try {
      setLoading(true);
      const tools = await toolsMachineryService.getTools();
      setItems(Array.isArray(tools) ? tools : []);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load tools and machinery');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadItems(); }, []);

  const totalAmortizedPerUse = useMemo(
    () => items.filter(i => i.isActive).reduce((sum, i) => sum + Number(i.costPerUse || 0), 0),
    [items]
  );

  const openCreate = () => {
    setEditing(null);
    setFormData({ ...DEFAULT_FORM });
    setOpen(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setFormData({
      name: item.name || '',
      category: item.category || 'machinery',
      purchasePrice: item.purchasePrice ?? '',
      expectedUses: item.expectedUses ?? '',
      costPerUse: item.costPerUse ?? '',
      notes: item.notes || '',
      isActive: item.isActive !== false
    });
    setOpen(true);
  };

  const closeDialog = () => {
    setOpen(false);
    setEditing(null);
    setFormData({ ...DEFAULT_FORM });
  };

  const setField = (field) => (e) => {
    const value = e?.target?.type === 'checkbox' ? e.target.checked : e?.target?.value;
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      if (editing?._id) {
        await toolsMachineryService.updateTool(editing._id, formData);
      } else {
        await toolsMachineryService.createTool(formData);
      }
      closeDialog();
      await loadItems();
    } catch (err) {
      setError(err.message || 'Failed to save tool or machinery');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await toolsMachineryService.deleteTool(id);
      await loadItems();
    } catch (err) {
      setError(err.message || 'Failed to delete tool or machinery');
    }
  };

  return (
    <Box sx={{ pb: 4 }}>
      <Box
        sx={{
          backgroundColor: { xs: 'transparent', sm: TASKS_UI.bgPanel },
          border: { xs: 'none', sm: `1px solid ${TASKS_UI.border}` },
          borderRadius: { xs: 0, sm: 3 },
          boxShadow: { xs: 'none', sm: TASKS_UI.shadow },
          p: { xs: 0.5, sm: 2.5, md: 3 },
          mb: 3
        }}
      >
        <Box sx={{ maxWidth: 820, mb: 2 }}>
          <Typography
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1,
              px: 1.25,
              py: 0.5,
              mb: 1.5,
              fontSize: '0.72rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              color: TASKS_UI.textPrimary,
              backgroundColor: TASKS_UI.bgCard,
              border: `1px solid ${TASKS_UI.border}`,
              borderRadius: 2,
              textTransform: 'uppercase'
            }}
          >
            <MachineIcon sx={{ fontSize: 16, color: TASKS_UI.accent }} />
            Equipment
          </Typography>

          <Typography sx={{ fontSize: { xs: 28, md: 36 }, fontWeight: 600, color: TASKS_UI.textHeader, mb: 1 }}>
            Tools and Machinery
          </Typography>
          <Typography sx={{ color: TASKS_UI.textSecondary, lineHeight: 1.6 }}>
            Define amortized usage cost — for example, laser welder = $10 per weld.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={openCreate}
            sx={{ color: TASKS_UI.textPrimary, borderColor: TASKS_UI.border, backgroundColor: TASKS_UI.bgCard }}
          >
            Add Tool or Machine
          </Button>
          <Chip
            label={`Active cost per use pool: $${totalAmortizedPerUse.toFixed(2)}`}
            sx={{
              backgroundColor: TASKS_UI.bgCard,
              color: TASKS_UI.accent,
              border: `1px solid ${TASKS_UI.border}`,
              fontWeight: 600
            }}
          />
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2, backgroundColor: TASKS_UI.bgCard, color: TASKS_UI.textPrimary, border: `1px solid ${TASKS_UI.border}` }}>
          {error}
        </Alert>
      )}

      <Box
        sx={{
          backgroundColor: TASKS_UI.bgPanel,
          border: `1px solid ${TASKS_UI.border}`,
          borderRadius: 3,
          boxShadow: TASKS_UI.shadow,
          overflow: 'hidden'
        }}
      >
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
            <CircularProgress sx={{ color: TASKS_UI.accent }} />
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& .MuiTableCell-root': { color: TASKS_UI.textMuted, borderColor: TASKS_UI.border, fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.06em', textTransform: 'uppercase' } }}>
                <TableCell>Name</TableCell>
                <TableCell>Category</TableCell>
                <TableCell align="right">Purchase Price</TableCell>
                <TableCell align="right">Expected Uses</TableCell>
                <TableCell align="right">Cost Per Use</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item) => (
                <TableRow
                  key={item._id}
                  sx={{
                    '& .MuiTableCell-root': { borderColor: TASKS_UI.border, color: TASKS_UI.textPrimary },
                    '&:hover': { backgroundColor: TASKS_UI.bgCard },
                    '&:last-child .MuiTableCell-root': { borderBottom: 'none' }
                  }}
                >
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: TASKS_UI.textHeader }}>{item.name}</Typography>
                    {item.notes && (
                      <Typography variant="caption" sx={{ color: TASKS_UI.textMuted }}>{item.notes}</Typography>
                    )}
                  </TableCell>
                  <TableCell sx={{ color: TASKS_UI.textSecondary }}>{item.category || 'machinery'}</TableCell>
                  <TableCell align="right">${Number(item.purchasePrice || 0).toFixed(2)}</TableCell>
                  <TableCell align="right">{Number(item.expectedUses || 0)}</TableCell>
                  <TableCell align="right">${Number(item.costPerUse || 0).toFixed(2)}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={item.isActive ? 'Active' : 'Inactive'}
                      sx={{
                        backgroundColor: TASKS_UI.bgCard,
                        color: item.isActive ? '#10B981' : TASKS_UI.textMuted,
                        border: `1px solid ${item.isActive ? '#10B981' : TASKS_UI.border}`,
                        fontWeight: 600,
                        fontSize: '0.68rem'
                      }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => openEdit(item)} sx={{ color: TASKS_UI.textSecondary, '&:hover': { color: TASKS_UI.textPrimary } }}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDelete(item._id)} sx={{ color: TASKS_UI.textMuted, '&:hover': { color: '#EF4444' } }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} sx={{ borderBottom: 'none' }}>
                    <Typography variant="body2" sx={{ color: TASKS_UI.textMuted, py: 3, textAlign: 'center' }}>
                      No tools or machinery yet. Add your first machine to start amortizing usage costs.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Box>

      <Dialog
        open={open}
        onClose={closeDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: TASKS_UI.bgPanel,
            backgroundImage: 'none',
            border: `1px solid ${TASKS_UI.border}`,
            boxShadow: TASKS_UI.shadow
          }
        }}
      >
        <DialogTitle sx={{ color: TASKS_UI.textHeader, borderBottom: `1px solid ${TASKS_UI.border}` }}>
          {editing ? 'Edit Tool or Machine' : 'Add Tool or Machine'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField margin="dense" fullWidth label="Name" value={formData.name} onChange={setField('name')} />
          <TextField margin="dense" fullWidth label="Category" value={formData.category} onChange={setField('category')} placeholder="machinery, tooling, laser" />
          <TextField margin="dense" fullWidth type="number" label="Purchase Price" value={formData.purchasePrice} onChange={setField('purchasePrice')} inputProps={{ min: 0, step: 0.01 }} />
          <TextField margin="dense" fullWidth type="number" label="Expected Lifetime Uses" value={formData.expectedUses} onChange={setField('expectedUses')} inputProps={{ min: 0, step: 1 }} />
          <TextField margin="dense" fullWidth type="number" label="Cost Per Use (override)" value={formData.costPerUse} onChange={setField('costPerUse')} inputProps={{ min: 0, step: 0.01 }} helperText="Auto-calculated from purchase price ÷ expected uses if set." />
          <TextField margin="dense" fullWidth multiline minRows={2} label="Notes" value={formData.notes} onChange={setField('notes')} />
        </DialogContent>
        <DialogActions sx={{ borderTop: `1px solid ${TASKS_UI.border}`, px: 3, py: 2 }}>
          <Button onClick={closeDialog} sx={{ color: TASKS_UI.textSecondary }}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="outlined"
            disabled={saving}
            sx={{ color: TASKS_UI.textPrimary, borderColor: TASKS_UI.border, backgroundColor: TASKS_UI.bgCard }}
          >
            {saving ? 'Saving...' : (editing ? 'Update' : 'Create')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
