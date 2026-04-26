'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
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
import { ToolsSelectionSection } from '@/app/dashboard/admin/tasks/create/components/ToolsSelectionSection';
import MaterialsSelectionSection from '@/app/dashboard/admin/tasks/create/components/MaterialsSelectionSection';
import { ServiceSettingsSection } from '@/app/dashboard/admin/tasks/create/components/ServiceSettingsSection';
import { DisplaySettingsSection } from '@/app/dashboard/admin/tasks/create/components/DisplaySettingsSection';
import { PriceControlsSection } from '@/app/dashboard/admin/tasks/create/components/PriceControlsSection';
import { MetalSpecificPricePreview } from '@/app/dashboard/admin/tasks/create/components/MetalSpecificPricePreview';
import { AiMetaSection } from '@/app/dashboard/admin/tasks/create/components/AiMetaSection';
import { TASK_UI } from '@/app/dashboard/admin/tasks/create/components/taskBuilderUi';

const DEFAULT_TASK_FORM = {
  title: '',
  description: '',
  category: 'shanks',
  subcategory: '',
  metalType: 'yellow_gold',
  karat: '14k',
  processes: [],
  tools: [],
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
  variantPricingAdjustments: {},
  aiMeta: {
    whenToUse: '',
    symptoms: [],
    requiredInfo: [],
    neverUseWhen: '',
    pairsWith: [],
  }
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
      isCustom: Boolean(item?.isCustom || !normalizedId),
      quantity: Number(item?.quantity) > 0 ? Number(item.quantity) : 1,
      condition: item?.condition || 'new',
      ...(idKey === 'processId'
        ? {
            laborHours: Number(item?.laborHours ?? item?.baseLaborHours) || 0,
            baseLaborHours: Number(item?.baseLaborHours ?? item?.laborHours) || 0,
            skillLevel: item?.skillLevel || '',
            name: item?.name || item?.displayName || item?.processName || '',
            displayName: item?.displayName || item?.processName || item?.name || ''
          }
        : idKey === 'materialId'
        ? {
            materialName: item?.materialName || item?.displayName || '',
            displayName: item?.displayName || item?.materialName || '',
          }
        : {})
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
    availableTools,
    adminSettings,
    dataLoadErrors,
    loading,
    setLoading,
    error,
    setError,
  } = useInitialTaskData();

  const { pricePreview, pricesByMetal } = useTaskPricing({
    formData,
    adminSettings,
    availableProcesses,
    availableMaterials,
    availableTools
  });

  const {
    addCustomProcess,
    removeProcess,
    updateProcess,
    addTool,
    removeTool,
    updateTool,
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
    availableTools,
    pricesByMetal,
    pricePreview,
    mode,
    taskId
  });

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
          tools: normalizeSelections(task.tools || [], 'toolId'),
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
          variantPricingAdjustments: task.variantPricingAdjustments || {},
          aiMeta: task.aiMeta || prev.aiMeta
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
      <Box sx={{ py: 6, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Loading task details...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 10 }}>
      <Box sx={{ maxWidth: 1280, mx: 'auto', pb: 4 }}>
        <Box sx={{ mb: 3, px: { xs: 0.5, sm: 0 } }}>
          <Box
            sx={{
              backgroundColor: { xs: 'transparent', sm: TASK_UI.bgPanel },
              border: { xs: 'none', sm: `1px solid ${TASK_UI.border}` },
              borderRadius: { xs: 0, sm: 3 },
              boxShadow: { xs: 'none', sm: TASK_UI.shadow },
              p: { xs: 0.5, sm: 2.5, md: 3 }
            }}
          >
            <Box sx={{ maxWidth: 820 }}>
              <Typography
                sx={{
                  display: 'inline-flex',
                  px: 1.25,
                  py: 0.5,
                  mb: 1.5,
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  color: TASK_UI.textPrimary,
                  backgroundColor: TASK_UI.bgCard,
                  border: `1px solid ${TASK_UI.border}`,
                  borderRadius: 2,
                  textTransform: 'uppercase'
                }}
              >
                {mode === 'edit' ? 'Task maintenance' : 'Task builder'}
              </Typography>
              <Typography sx={{ fontSize: { xs: 28, md: 36 }, fontWeight: 600, color: TASK_UI.textHeader, mb: 1 }}>
                {mode === 'edit' ? 'Update task configuration' : 'Create a new task'}
              </Typography>
              <Typography sx={{ color: TASK_UI.textSecondary, lineHeight: 1.6, mb: 2 }}>
                Define labor, tools, materials, pricing controls, and AI guidance in one place. This workflow now follows the same dark operational system as the repair builder.
              </Typography>
              <Button
                variant="outlined"
                startIcon={<ArrowBackIcon />}
                onClick={() => router.push('/dashboard/admin/tasks')}
                sx={{
                  color: TASK_UI.textPrimary,
                  borderColor: TASK_UI.border,
                  backgroundColor: TASK_UI.bgCard,
                  textTransform: 'none',
                  fontWeight: 600,
                  '&:hover': {
                    borderColor: TASK_UI.accent,
                    backgroundColor: TASK_UI.bgTertiary
                  }
                }}
              >
                Back to Tasks
              </Button>
            </Box>
          </Box>
        </Box>

        <Box
          sx={{
            px: { xs: 0.5, sm: 0 },
            '& .MuiAlert-root': {
              backgroundColor: TASK_UI.bgCard,
              color: TASK_UI.textPrimary,
              border: `1px solid ${TASK_UI.border}`
            },
            '& .MuiPaper-root': {
              backgroundImage: 'none'
            },
            '& .MuiFormLabel-root, & .MuiInputLabel-root, & .MuiFormHelperText-root, & .MuiTypography-caption': {
              color: `${TASK_UI.textSecondary} !important`
            },
            '& .MuiTypography-body1, & .MuiTypography-body2': {
              color: TASK_UI.textPrimary
            },
            '& .MuiTypography-overline': {
              color: `${TASK_UI.textHeader} !important`
            },
            '& .MuiTypography-h6, & .MuiTypography-subtitle1, & .MuiTypography-subtitle2': {
              color: TASK_UI.textHeader
            },
            '& .MuiFormControlLabel-label': {
              color: TASK_UI.textPrimary
            },
            '& .MuiOutlinedInput-root, & .MuiSelect-select, & .MuiAutocomplete-inputRoot': {
              backgroundColor: TASK_UI.bgCard,
              color: TASK_UI.textPrimary
            },
            '& .MuiOutlinedInput-root fieldset': {
              borderColor: TASK_UI.border
            },
            '& .MuiOutlinedInput-root:hover fieldset': {
              borderColor: TASK_UI.textSecondary
            },
            '& .MuiOutlinedInput-root.Mui-focused fieldset': {
              borderColor: TASK_UI.accent
            },
            '& .MuiInputBase-input::placeholder': {
              color: TASK_UI.textMuted,
              opacity: 1
            },
            '& .MuiChip-root': {
              borderRadius: 2
            },
            '& .MuiChip-outlined': {
              color: TASK_UI.textPrimary,
              borderColor: TASK_UI.border,
              backgroundColor: TASK_UI.bgCard
            },
            '& .MuiChip-filled': {
              color: TASK_UI.textPrimary,
              backgroundColor: TASK_UI.bgTertiary
            },
            '& .MuiButton-outlined': {
              color: TASK_UI.textPrimary,
              borderColor: TASK_UI.border,
              backgroundColor: TASK_UI.bgCard
            },
            '& .MuiButton-text': {
              color: TASK_UI.accent
            },
            '& .MuiCheckbox-root, & .MuiCheckbox-root.Mui-checked': {
              color: TASK_UI.accent
            },
            '& .MuiDivider-root': {
              borderColor: TASK_UI.border
            }
          }}
        >
          <Box sx={{ px: { xs: 0.5, sm: 0 }, mb: 2 }}>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
            {(dataLoadErrors.processes || dataLoadErrors.materials || dataLoadErrors.settings) && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Some supporting data failed to load. You can continue, but pricing or selectors may be incomplete.
              </Alert>
            )}
          </Box>

          <form onSubmit={handleSubmit}>
            <Grid container spacing={{ xs: 0, sm: 2, md: 3 }}>
              <BasicInformationSection formData={formData} setFormData={setFormData} categories={TASK_CATEGORIES} />

              <ProcessSelectionSection
                formData={formData}
                addCustomProcess={addCustomProcess}
                updateProcess={updateProcess}
                removeProcess={removeProcess}
              />

              <ToolsSelectionSection
                formData={formData}
                availableTools={availableTools}
                addTool={addTool}
                updateTool={updateTool}
                removeTool={removeTool}
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
              <AiMetaSection formData={formData} setFormData={setFormData} />

              <Grid item xs={12}>
                <Box
                  sx={{
                    position: { xs: 'fixed', sm: 'static' },
                    bottom: { xs: 0, sm: 'auto' },
                    left: { xs: 0, sm: 'auto' },
                    right: { xs: 0, sm: 'auto' },
                    zIndex: { xs: 1100, sm: 'auto' },
                    p: { xs: 1.5, sm: 0 },
                    mt: { xs: 0, sm: 4 },
                    bgcolor: { xs: TASK_UI.bgPanel, sm: 'transparent' },
                    borderTop: { xs: '1px solid', sm: 'none' },
                    borderColor: TASK_UI.border,
                    boxShadow: { xs: TASK_UI.shadow, sm: 'none' },
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: 2
                  }}
                >
                  <Button
                    variant="outlined"
                    onClick={() => router.push('/dashboard/admin/tasks')}
                    sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="outlined"
                    startIcon={<SaveIcon />}
                    disabled={loading}
                    fullWidth
                    sx={{
                      maxWidth: { xs: '100%', sm: 280 },
                      py: 1.5,
                      fontSize: { xs: '1rem', sm: '1rem' },
                      fontWeight: 700,
                      borderColor: TASK_UI.border,
                      color: TASK_UI.textPrimary,
                      backgroundColor: TASK_UI.bgCard
                    }}
                  >
                    {loading ? 'Saving...' : mode === 'edit' ? 'Update Task' : 'Create Task'}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </form>
        </Box>
      </Box>
    </Box>
  );
}
