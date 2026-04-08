'use client';
import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Alert,
  Chip,
  CircularProgress
} from '@mui/material';
import {
  Save as SaveIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { useInitialTaskData } from '../../create/hooks/useInitialTaskData';
import { useTaskPricing } from '../../create/hooks/useTaskPricing';
import { useTaskFormHandlers } from '../../create/hooks/useTaskFormHandlers';
import { TASK_CATEGORIES } from '../components/TaskConstants';
import { MetalSpecificPricePreview } from '../../create/components/MetalSpecificPricePreview';
import { BasicInformationSection } from '../../create/components/BasicInformationSection';
import { ProcessSelectionSection } from '../../create/components/ProcessSelectionSection';
import MaterialsSelectionSection from '../../create/components/MaterialsSelectionSection';
import { ServiceSettingsSection } from '../../create/components/ServiceSettingsSection';
import { DisplaySettingsSection } from '../../create/components/DisplaySettingsSection';
import { PriceControlsSection } from '../../create/components/PriceControlsSection';

const defaultFormData = {
  title: '',
  description: '',
  category: 'shanks',
  subcategory: '',
  metalType: 'yellow_gold',
  karat: '14k',
  requiresMetalType: true,
  processes: [],
  materials: [],
  service: {
    estimatedDays: 3,
    rushDays: 1,
    rushMultiplier: 1.5,
    requiresApproval: true,
    requiresInspection: true,
    canBeBundled: true
  },
  display: {
    isActive: true,
    isFeatured: false,
    sortOrder: 0
  },
  minimumPrice: '',
  priceOverride: '',
  minimumWholesalePrice: '',
  minimumLaborPrice: '',
  variantPricingAdjustments: {}
};

export default function EditTaskPage() {
  const router = useRouter();
  const params = useParams();
  const taskId = params?.id;

  const [formData, setFormData] = useState(defaultFormData);
  const [taskLoading, setTaskLoading] = useState(true);

  const {
    availableProcesses,
    availableMaterials,
    adminSettings,
    dataLoadErrors,
    loading,
    setLoading,
    error,
    setError,
    loadInitialData
  } = useInitialTaskData();

  const [success, setSuccess] = useState('');

  useEffect(() => {
    const loadTask = async () => {
      if (!taskId) return;

      try {
        setTaskLoading(true);
        setError('');

        const response = await fetch(`/api/tasks?taskId=${taskId}`);
        if (!response.ok) {
          throw new Error('Failed to load task');
        }

        const payload = await response.json();
        if (!payload?.success || !payload?.task) {
          throw new Error('Task not found');
        }

        const task = payload.task;

        setFormData({
          title: task.title || '',
          description: task.description || '',
          category: task.category || 'shanks',
          subcategory: task.subcategory || '',
          metalType: task.baseMetal || task.metalType || 'yellow_gold',
          karat: task.baseKarat || task.karat || '14k',
          requiresMetalType: task.requiresMetalType !== false,
          processes: Array.isArray(task.processes)
            ? task.processes.map((p) => ({
                processId: String(p.processId || p.process?._id || p._id || ''),
                quantity: Number(p.quantity) > 0 ? Number(p.quantity) : 1
              }))
            : [],
          materials: Array.isArray(task.materials)
            ? task.materials.map((m) => ({
                materialId: String(m.materialId || m.material?._id || m._id || ''),
                quantity: Number(m.quantity) > 0 ? Number(m.quantity) : 1
              }))
            : [],
          service: {
            estimatedDays: task.service?.estimatedDays ?? 3,
            rushDays: task.service?.rushDays ?? 1,
            rushMultiplier: task.service?.rushMultiplier ?? 1.5,
            requiresApproval: task.service?.requiresApproval !== false,
            requiresInspection: task.service?.requiresInspection !== false,
            canBeBundled: task.service?.canBeBundled !== false
          },
          display: {
            isActive: task.display?.isActive !== false && task.isActive !== false,
            isFeatured: task.display?.isFeatured || false,
            sortOrder: Number(task.display?.sortOrder || 0)
          },
          minimumPrice: task.minimumPrice != null ? String(task.minimumPrice) : '',
          priceOverride: task.priceOverride != null ? String(task.priceOverride) : '',
          minimumWholesalePrice: task.minimumWholesalePrice != null ? String(task.minimumWholesalePrice) : '',
          minimumLaborPrice: task.minimumLaborPrice != null ? String(task.minimumLaborPrice) : '',
          variantPricingAdjustments: Object.entries(task.variantPricingAdjustments || {}).reduce((acc, [variantKey, config]) => {
            acc[variantKey] = {
              retailMultiplier: config?.retailMultiplier != null ? String(config.retailMultiplier) : '1'
            };
            return acc;
          }, {})
        });
      } catch (loadError) {
        setError(loadError.message || 'Failed to load task');
      } finally {
        setTaskLoading(false);
      }
    };

    loadTask();
  }, [taskId, setError]);

  const { pricePreview, pricesByMetal } = useTaskPricing({
    formData,
    adminSettings,
    availableProcesses,
    availableMaterials
  });

  const {
    addProcess,
    removeProcess,
    updateProcess,
    addMaterial,
    removeMaterial,
    updateMaterial,
    handleSubmit
  } = useTaskFormHandlers({
    formData,
    setFormData,
    setError,
    setSuccess,
    setLoading,
    availableProcesses,
    availableMaterials,
    pricesByMetal,
    pricePreview,
    mode: 'edit',
    taskId
  });

  if (taskLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}><CircularProgress /></Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <SettingsIcon sx={{ mr: 2, color: 'primary.main' }} />
          <Typography variant="h4" component="h1">
            Universal Task Builder
          </Typography>
          <Chip label="Edit Mode" color="info" size="small" sx={{ ml: 2 }} />
        </Box>

        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Update universal task details using the same process-based builder used for creation.
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 3 }}>{typeof error === 'string' ? error : JSON.stringify(error, null, 2)}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}

        {(dataLoadErrors.processes || dataLoadErrors.materials || dataLoadErrors.settings) && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            <strong>Data Loading Issues:</strong>
            {dataLoadErrors.processes && <div>• Processes could not be loaded</div>}
            {dataLoadErrors.materials && <div>• Materials could not be loaded</div>}
            {dataLoadErrors.settings && <div>• Admin settings could not be loaded</div>}
            <Button color="inherit" size="small" onClick={loadInitialData} sx={{ mt: 1 }}>
              Retry Loading
            </Button>
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <BasicInformationSection formData={formData} setFormData={setFormData} categories={TASK_CATEGORIES} />

            <ProcessSelectionSection
              formData={formData}
              availableProcesses={availableProcesses}
              addProcess={addProcess}
              updateProcess={updateProcess}
              removeProcess={removeProcess}
            />

            <MaterialsSelectionSection formData={formData} availableMaterials={availableMaterials} addMaterial={addMaterial} updateMaterial={updateMaterial} removeMaterial={removeMaterial} />

            {pricePreview && (
              <Grid item xs={12}>
                <MetalSpecificPricePreview
                  pricesByMetal={pricesByMetal}
                  formData={formData}
                  setFormData={setFormData}
                />
              </Grid>
            )}

            <PriceControlsSection formData={formData} setFormData={setFormData} pricePreview={pricePreview} />

            <ServiceSettingsSection formData={formData} setFormData={setFormData} />
            <DisplaySettingsSection formData={formData} setFormData={setFormData} />

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, pt: 2 }}>
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={loading || formData.processes.length === 0}
                  startIcon={loading ? null : <SaveIcon />}
                >
                  {loading ? 'Updating Universal Task...' : 'Update Universal Task'}
                </Button>

                <Button
                  variant="outlined"
                  size="large"
                  onClick={() => router.push('/dashboard/admin/tasks')}
                >
                  Cancel
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Box>
  );
}
