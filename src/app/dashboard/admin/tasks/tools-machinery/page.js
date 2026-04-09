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
  Paper,
  IconButton,
  Chip,
  Alert,
  CircularProgress
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import { PageContainer } from '@toolpad/core/PageContainer';
import toolsMachineryService from '@/services/toolsMachinery.service';

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

  useEffect(() => {
    loadItems();
  }, []);

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
    <PageContainer title="Tools and Machinery">
      <Box sx={{ pb: 4 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>Tools and Machinery</Typography>
            <Typography variant="body2" color="text.secondary">
              Define amortized usage cost (for example, laser welder = $10 per weld).
            </Typography>
          </Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            Add Tool or Machine
          </Button>
        </Box>

        <Box sx={{ mb: 2 }}>
          <Chip color="info" label={`Active cost per use pool: $${totalAmortizedPerUse.toFixed(2)}`} />
        </Box>

        <Paper variant="outlined">
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
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
                  <TableRow key={item._id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.name}</Typography>
                      {item.notes && (
                        <Typography variant="caption" color="text.secondary">{item.notes}</Typography>
                      )}
                    </TableCell>
                    <TableCell>{item.category || 'machinery'}</TableCell>
                    <TableCell align="right">${Number(item.purchasePrice || 0).toFixed(2)}</TableCell>
                    <TableCell align="right">{Number(item.expectedUses || 0)}</TableCell>
                    <TableCell align="right">${Number(item.costPerUse || 0).toFixed(2)}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        color={item.isActive ? 'success' : 'default'}
                        label={item.isActive ? 'Active' : 'Inactive'}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => openEdit(item)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDelete(item._id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                        No tools or machinery yet. Add your first machine to start amortizing usage costs.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </Paper>

        <Dialog open={open} onClose={closeDialog} maxWidth="sm" fullWidth>
          <DialogTitle>{editing ? 'Edit Tool or Machine' : 'Add Tool or Machine'}</DialogTitle>
          <DialogContent sx={{ pt: 1 }}>
            <TextField margin="dense" fullWidth label="Name" value={formData.name} onChange={setField('name')} />
            <TextField margin="dense" fullWidth label="Category" value={formData.category} onChange={setField('category')} placeholder="machinery, tooling, laser" />
            <TextField margin="dense" fullWidth type="number" label="Purchase Price" value={formData.purchasePrice} onChange={setField('purchasePrice')} inputProps={{ min: 0, step: 0.01 }} />
            <TextField margin="dense" fullWidth type="number" label="Expected Lifetime Uses" value={formData.expectedUses} onChange={setField('expectedUses')} inputProps={{ min: 0, step: 1 }} />
            <TextField margin="dense" fullWidth type="number" label="Cost Per Use (override)" value={formData.costPerUse} onChange={setField('costPerUse')} inputProps={{ min: 0, step: 0.01 }} helperText="If expected uses is set, cost per use is auto-calculated from purchase price / expected uses." />
            <TextField margin="dense" fullWidth multiline minRows={2} label="Notes" value={formData.notes} onChange={setField('notes')} />
          </DialogContent>
          <DialogActions>
            <Button onClick={closeDialog}>Cancel</Button>
            <Button onClick={handleSubmit} variant="contained" disabled={saving}>
              {saving ? 'Saving...' : (editing ? 'Update' : 'Create')}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </PageContainer>
  );
}
