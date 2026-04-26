'use client';
import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Button, Typography, Alert, Snackbar, Divider, Paper,
  TextField, FormControl, InputLabel, Select, MenuItem, Grid,
  CircularProgress, Checkbox, FormControlLabel, Stack
} from '@mui/material';
import { AutoAwesome as AutoAwesomeIcon, ArrowBack as ArrowBackIcon, Save as SaveIcon } from '@mui/icons-material';
import { useInitialTaskData } from '../create/hooks/useInitialTaskData';
import { useTaskFormHandlers } from '../create/hooks/useTaskFormHandlers';
import { TASK_CATEGORIES } from '../edit/components/TaskConstants';
import AiTaskInputPanel from './components/AiTaskInputPanel';

const DEFAULT_TASK_FORM = {
  title: '',
  description: '',
  category: 'shanks',
  subcategory: '',
  metalType: 'yellow_gold',
  karat: '14k',
  requiresMetalType: true,
  processes: [],
  materials: [],
  service: { estimatedDays: 3, rushDays: 1, rushMultiplier: 1.5, requiresApproval: true, requiresInspection: true, canBeBundled: true },
  display: { isActive: true, isFeatured: false, sortOrder: 0 }
};

export default function AiTaskBuilderPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ ...DEFAULT_TASK_FORM });
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const {
    availableProcesses,
    availableMaterials,
    adminSettings,
    loading,
    setLoading,
    error,
    loadInitialData
  } = useInitialTaskData();

  const { handleSaveTask } = useTaskFormHandlers({
    formData,
    availableProcesses,
    availableMaterials,
    adminSettings,
    setLoading,
    router
  });

  useEffect(() => { loadInitialData(); }, []);

  const handleApplySuggestions = useCallback((suggestions) => {
    if (!suggestions) return;

    const matchedProcessObjs = (suggestions.matchedProcesses || [])
      .map(mp => {
        const found = availableProcesses.find(p => p._id === mp.processId || p.displayName === mp.processName);
        return found ? { processId: found._id, quantity: mp.quantity || 1 } : null;
      })
      .filter(Boolean);

    setFormData(prev => ({
      ...prev,
      title: suggestions.title || prev.title,
      description: suggestions.description || prev.description,
      category: suggestions.category || prev.category,
      processes: matchedProcessObjs.length > 0 ? matchedProcessObjs : prev.processes
    }));
    setSnackbar({ open: true, message: 'AI suggestions applied — review the form below', severity: 'info' });
  }, [availableProcesses]);

  const handleSave = useCallback(async () => {
    if (!(formData.title || '').trim()) {
      setSnackbar({ open: true, message: 'Task title is required', severity: 'error' });
      return;
    }
    setSaving(true);
    try {
      await handleSaveTask();
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Failed to save task', severity: 'error' });
    } finally {
      setSaving(false);
    }
  }, [formData, handleSaveTask]);

  const setField = (field) => (e) => {
    const val = e.target ? e.target.value : e;
    setFormData(prev => ({ ...prev, [field]: val }));
  };

  return (
    <Box sx={{ pb: 10 }}>
      <Box sx={{ maxWidth: 960, mx: 'auto' }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => router.push('/dashboard/admin/tasks')} variant="text" sx={{ mb: 2 }}>
          Back to Tasks
        </Button>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <AutoAwesomeIcon color="primary" />
          <Typography variant="h5" fontWeight="bold">AI Task Builder</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Describe the repair task in plain language. AI will match existing processes, flag gaps, and pre-fill the form.
        </Typography>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <AiTaskInputPanel
              availableProcesses={availableProcesses}
              onApplySuggestions={handleApplySuggestions}
            />

            <Divider sx={{ my: 4 }}>
              <Typography variant="caption" color="text.secondary">Task Details</Typography>
            </Divider>

            <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Task Form</Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                Fields pre-filled by AI — review and adjust before saving.
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Task Title *"
                    value={formData.title}
                    onChange={setField('title')}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    minRows={2}
                    label="Description"
                    value={formData.description}
                    onChange={setField('description')}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Category *</InputLabel>
                    <Select value={formData.category} onChange={setField('category')} label="Category *">
                      {TASK_CATEGORIES.map(c => (
                        <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Subcategory"
                    value={formData.subcategory}
                    onChange={setField('subcategory')}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Matched Processes ({formData.processes.length})
                  </Typography>
                  {formData.processes.length === 0 ? (
                    <Typography variant="caption" color="text.secondary">
                      No processes linked — apply AI suggestions above or add processes on the standard create task page.
                    </Typography>
                  ) : (
                    <Stack spacing={0.5}>
                      {formData.processes.map((p, i) => {
                        const found = availableProcesses.find(ap => ap._id === p.processId);
                        return (
                          <Box key={i} sx={{ p: 1, bgcolor: 'action.hover', borderRadius: 1, display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2">{found?.displayName || found?.name || p.processId}</Typography>
                            {p.quantity > 1 && <Typography variant="caption">×{p.quantity}</Typography>}
                          </Box>
                        );
                      })}
                    </Stack>
                  )}
                </Grid>

                <Grid item xs={12}>
                  <FormControlLabel
                    control={<Checkbox checked={formData.display?.isActive ?? true} onChange={(e) => setFormData(prev => ({ ...prev, display: { ...prev.display, isActive: e.target.checked } }))} />}
                    label="Active (visible to staff)"
                  />
                </Grid>
              </Grid>
            </Paper>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <Button onClick={() => router.push('/dashboard/admin/tasks')} disabled={saving}>Cancel</Button>
              <Button
                variant="outlined"
                onClick={() => router.push('/dashboard/admin/tasks/create')}
                disabled={saving}
              >
                Full Task Builder
              </Button>
              <Button
                variant="contained"
                startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Task'}
              </Button>
            </Box>
          </>
        )}
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

