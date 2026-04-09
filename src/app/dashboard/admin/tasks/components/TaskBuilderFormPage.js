'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageContainer } from '@toolpad/core/PageContainer';
import {
  Box,
  Paper,
  Grid,
  Typography,
  Button,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon
} from '@mui/icons-material';

import { TASK_CATEGORIES } from '@/app/dashboard/admin/tasks/edit/components/TaskConstants';
import { useInitialTaskData } from '@/app/dashboard/admin/tasks/create/hooks/useInitialTaskData';
import { useTaskPricing } from '@/app/dashboard/admin/tasks/create/hooks/useTaskPricing';
import { useTaskFormHandlers } from '@/app/dashboard/admin/tasks/create/hooks/useTaskFormHandlers';
import { BasicInformationSection } from '@/app/dashboard/admin/tasks/create/components/BasicInformationSection';
import { ProcessSelectionSection } from '@/app/dashboard/admin/tasks/create/components/ProcessSelectionSection';
import MaterialsSelectionSection from '@/app/dashboard/admin/tasks/create/components/MaterialsSelectionSection';
import { ServiceSettingsSection } from '@/app/dashboard/admin/tasks/create/components/ServiceSettingsSection';
import { DisplaySettingsSection } from '@/app/dashboard/admin/tasks/create/components/DisplaySettingsSection';
import { PriceControlsSection } from '@/app/dashboard/admin/tasks/create/components/PriceControlsSection';
import { MetalSpecificPricePreview } from '@/app/dashboard/admin/tasks/create/components/MetalSpecificPricePreview';

const DEFAULT_TASK_FORM = {
  title: '',
  description: '',
  category: 'shanks',
  subcategory: '',
  metalType: 'yellow_gold',
  karat: '14k',
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

function normalizeSelections(items = [], idKey) {
  return items.map((item) => {
    const rawId = item?.[idKey];
    const normalizedId =
      typeof rawId === 'object'
        ? rawId?._id || rawId?.id || ''
        : rawId || item?._id || '';

    return {
      [idKey]: normalizedId,
      quantity: Number(item?.quantity) > 0 ? Number(item.quantity) : 1,
      condition: item?.condition || 'new'
    };
  });
}

export default function TaskBuilderFormPage({ mode = 'create', taskId = null }) {
  const router = useRouter();
  const [formData, setFormData] = useState(DEFAULT_TASK_FORM);
  const [success, setSuccess] = useState('');
  const [loadingTask, setLoadingTask] = useState(mode === 'edit');

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
    mode,
    taskId
  });

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    const loadTaskForEdit = async () => {
      if (mode !== 'edit' || !taskId) {
        setLoadingTask(false);
        return;
      }

      try {
        const response = await fetch(`/api/tasks?taskId=${taskId}`);
        const payload = await response.json();

        if (!response.ok || !payload?.task) {
          throw new Error(payload?.error || 'Failed to load task details');
        }

        const task = payload.task;
        setFormData((prev) => ({
          ...prev,
          title: task.title || '',
          description: task.description || '',
          category: task.category || prev.category,
          subcategory: task.subcategory || '',
          metalType: task.baseMetal || task.metalType || prev.metalType,
          karat: task.baseKarat || task.karat || prev.karat,
          processes: normalizeSelections(task.processes, 'processId'),
          materials: normalizeSelections(task.materials, 'materialId'),
          service: {
            ...prev.service,
            ...(task.service || {})
          },
          display: {
            ...prev.display,
            ...(task.display || {}),
            isActive: task.display?.isActive ?? task.isActive ?? true
          },
          minimumPrice: task.minimumPrice?.toString() || '',
          priceOverride: task.priceOverride?.toString() || '',
          minimumWholesalePrice: task.minimumWholesalePrice?.toString() || '',
          minimumLaborPrice: task.minimumLaborPrice?.toString() || '',
          variantPricingAdjustments: task.variantPricingAdjustments || {}
        }));
      } catch (loadError) {
        setError(loadError.message || 'Unable to load task for editing');
      } finally {
        setLoadingTask(false);
      }
    };

    loadTaskForEdit();
  }, [mode, taskId, setError]);

  const pageTitle = useMemo(
    () => (mode === 'edit' ? 'Edit Task' : 'Create Task'),
    [mode]
  );

  if (mode === 'edit' && loadingTask) {
    return (
      <PageContainer title="Edit Task">
        <Box sx={{ py: 6, textAlign: 'center' }}>
          <CircularProgress />
          <Typography sx={{ mt: 2 }}>Loading task details...</Typography>
        </Box>
      </PageContainer>
    );
  }

  return (
    <PageContainer title={pageTitle}>
      <Box sx={{ maxWidth: 1200, mx: 'auto', pb: 3 }}>
        <Button
          variant="text"
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push('/dashboard/admin/tasks')}
          sx={{ mb: 2 }}
        >
          Back to Tasks
        </Button>

        <Paper elevation={2} sx={{ p: 3 }}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

          {(dataLoadErrors.processes || dataLoadErrors.materials || dataLoadErrors.settings) && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Some supporting data failed to load. You can continue, but pricing or selectors may be incomplete.
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

              <MaterialsSelectionSection
                formData={formData}
                availableMaterials={availableMaterials}
                addMaterial={addMaterial}
                updateMaterial={updateMaterial}
                removeMaterial={removeMaterial}
              />

              <MetalSpecificPricePreview
                pricesByMetal={pricesByMetal}
                formData={formData}
                setFormData={setFormData}
              />

              <PriceControlsSection
                formData={formData}
                setFormData={setFormData}
                pricePreview={pricePreview}
              />

              <ServiceSettingsSection formData={formData} setFormData={setFormData} />
              <DisplaySettingsSection formData={formData} setFormData={setFormData} />

              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                  <Button variant="outlined" onClick={() => router.push('/dashboard/admin/tasks')}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={<SaveIcon />}
                    disabled={loading}
                  >
                    {loading ? 'Saving...' : mode === 'edit' ? 'Update Task' : 'Create Task'}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </form>
        </Paper>
      </Box>
    </PageContainer>
  );
}
