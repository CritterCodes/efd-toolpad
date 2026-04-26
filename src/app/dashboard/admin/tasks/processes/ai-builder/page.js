'use client';
import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Button, Typography, Alert, Snackbar, CircularProgress, Divider, Paper
} from '@mui/material';
import {
  AutoAwesome as AutoAwesomeIcon,
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon
} from '@mui/icons-material';
import { DEFAULT_PROCESS_FORM } from '@/constants/processes.constants';
import { ProcessForm } from '@/app/components/processes/ProcessForm';
import AiProcessInputPanel from './components/AiProcessInputPanel';
import StullerMaterialFinder from '@/app/components/materials/StullerMaterialFinder';
import materialsService from '@/services/materials.service';
import processesService from '@/services/processes.service';
import toolsMachineryService from '@/services/toolsMachinery.service';

export default function AiProcessBuilderPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ ...DEFAULT_PROCESS_FORM });
  const [availableMaterials, setAvailableMaterials] = useState([]);
  const [availableTools, setAvailableTools] = useState([]);
  const [loadingMaterials, setLoadingMaterials] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [stullerOpen, setStullerOpen] = useState(false);
  const [stullerQuery, setStullerQuery] = useState('');
  const [pendingMaterialName, setPendingMaterialName] = useState('');

  useEffect(() => {
    Promise.all([
      materialsService.getMaterials().catch(() => []),
      toolsMachineryService.getTools().catch(() => [])
    ])
      .then(([materials, tools]) => {
        setAvailableMaterials(Array.isArray(materials) ? materials : []);
        setAvailableTools(Array.isArray(tools) ? tools : []);
      })
      .finally(() => setLoadingMaterials(false));
  }, []);

  const handleApplySuggestions = useCallback((suggestions) => {
    setFormData(prev => ({
      ...prev,
      displayName: suggestions.displayName || prev.displayName,
      category: suggestions.category || prev.category,
      skillLevel: suggestions.skillLevel || prev.skillLevel,
      laborHours: suggestions.laborHours ?? prev.laborHours,
      description: suggestions.description || prev.description,
    }));
    setSnackbar({ open: true, message: 'AI suggestions applied to form below', severity: 'info' });
  }, []);

  const handleSearchStuller = useCallback((query, materialName = '') => {
    setStullerQuery(query || '');
    setPendingMaterialName(materialName || query || '');
    setStullerOpen(true);
  }, []);

  const handleAddStullerMaterial = useCallback((stullerItem) => {
    const match = availableMaterials.find(m =>
      m.name?.toLowerCase().includes((stullerItem.name || '').toLowerCase().split(' ')[0]) ||
      m.stullerItemNumber === stullerItem.stullerItemNumber
    );
    if (match) {
      const alreadyAdded = (formData.materials || []).some(m => m.materialId === match._id || m.id === match._id);
      if (!alreadyAdded) {
        setFormData(prev => ({
          ...prev,
          materials: [...(prev.materials || []), { materialId: match._id, name: match.name, quantity: 1 }]
        }));
        setSnackbar({ open: true, message: `Added "${match.name}" to process materials`, severity: 'success' });
      }
    } else {
      setSnackbar({ open: true, message: `"${stullerItem.name}" found on Stuller — add it to your materials catalog first`, severity: 'warning' });
    }
  }, [availableMaterials, formData.materials]);

  const handleSave = useCallback(async () => {
    const trimmed = (formData.displayName || '').trim();
    if (!trimmed) {
      setSnackbar({ open: true, message: 'Process name is required', severity: 'error' });
      return;
    }
    if (!formData.category) {
      setSnackbar({ open: true, message: 'Category is required', severity: 'error' });
      return;
    }
    setSaving(true);
    try {
      await processesService.createProcess({ ...formData, displayName: trimmed });
      setSnackbar({ open: true, message: 'Process created successfully!', severity: 'success' });
      setTimeout(() => router.push('/dashboard/admin/tasks/processes'), 1200);
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Failed to save process', severity: 'error' });
    } finally {
      setSaving(false);
    }
  }, [formData, router]);

  return (
    <Box sx={{ pb: 10 }}>
      <Box sx={{ maxWidth: 900, mx: 'auto', pb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
          <Button startIcon={<ArrowBackIcon />} onClick={() => router.push('/dashboard/admin/tasks/processes')} variant="text">
            Back to Processes
          </Button>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <AutoAwesomeIcon color="primary" />
          <Typography variant="h5" fontWeight="bold">AI Process Builder</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Describe a jewelry repair process in plain language and let AI generate the structure for you.
          Review the suggestions, then save the process to your catalog.
        </Typography>

        <AiProcessInputPanel
          onApplySuggestions={handleApplySuggestions}
          onSearchStuller={handleSearchStuller}
        />

        <Divider sx={{ my: 4 }}>
          <Typography variant="caption" color="text.secondary">Process Details</Typography>
        </Divider>

        <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            Process Form
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
            Fields pre-filled by AI — review and adjust before saving.
          </Typography>

          {loadingMaterials ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={32} />
            </Box>
          ) : (
            <ProcessForm
              formData={formData}
              setFormData={setFormData}
              availableMaterials={availableMaterials}
              availableTools={availableTools}
            />
          )}
        </Paper>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button onClick={() => router.push('/dashboard/admin/tasks/processes')} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Process'}
          </Button>
        </Box>
      </Box>

      <StullerMaterialFinder
        open={stullerOpen}
        onClose={() => setStullerOpen(false)}
        initialQuery={stullerQuery}
        onAddMaterial={handleAddStullerMaterial}
      />

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

