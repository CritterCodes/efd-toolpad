'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Chip,
  Card,
  CardContent,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Autocomplete,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  Settings as SettingsIcon,
  Calculate as CalculateIcon
} from '@mui/icons-material';

// Import utility functions for metal variants and pricing
import { 
  METAL_TYPES, 
  KARAT_OPTIONS,
  getMetalVariantsFromMaterials,
  calculateProcessCost,
  parseMetalKey
} from '@/utils/processes.util';
import pricingEngine from '@/services/PricingEngine';
import { DEFAULT_SKILL_LEVEL, SKILL_LEVEL } from '@/constants/pricing.constants.mjs';

// Simple Metal Context Hook (inline implementation)
import { useSimpleMetalContext, MetalContextSelector } from "./components/MetalContextSelector";
import { useTaskPricing } from "./hooks/useTaskPricing";
import { useInitialTaskData } from "./hooks/useInitialTaskData";
import { useTaskFormHandlers } from "./hooks/useTaskFormHandlers";
import { TASK_CATEGORIES } from "../edit/components/TaskConstants";
import { MetalSpecificPricePreview } from "./components/MetalSpecificPricePreview";
import { BasicInformationSection } from "./components/BasicInformationSection";
import { ProcessSelectionSection } from "./components/ProcessSelectionSection";
import MaterialsSelectionSection from "./components/MaterialsSelectionSection";
import { ServiceSettingsSection } from "./components/ServiceSettingsSection";
import { DisplaySettingsSection } from "./components/DisplaySettingsSection";
import { PriceControlsSection } from "./components/PriceControlsSection";

// Main Task Builder Component
export default function CreateTaskPage() {
  const router = useRouter();
  
  // Form state
  const [formData, setFormData] = useState({
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
  });

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
    pricePreview
  });

  

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <SettingsIcon sx={{ mr: 2, color: 'primary.main' }} />
          <Typography variant="h4" component="h1">
            Universal Task Builder
          </Typography>
          <Chip 
            label="New & Improved" 
            color="success" 
            size="small" 
            sx={{ ml: 2 }}
          />
        </Box>

        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Create universal tasks that work with any metal context using our enhanced process-based system.
        </Typography>

        {/* Alerts */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {typeof error === 'string' ? error : JSON.stringify(error, null, 2)}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            {success}
          </Alert>
        )}

        {/* Data Loading Errors */}
        {(dataLoadErrors.processes || dataLoadErrors.materials || dataLoadErrors.settings) && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
              Some data failed to load:
            </Typography>
            <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
              {dataLoadErrors.processes && <li>Processes (required for task creation)</li>}
              {dataLoadErrors.materials && <li>Materials (optional for task creation)</li>}
              {dataLoadErrors.settings && <li>Admin Settings (affects pricing calculations)</li>}
            </ul>
            <Typography variant="body2">
              Please refresh the page or check your authentication status.
            </Typography>
          </Alert>
        )}

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
            
            {/* Basic Information */}
            <BasicInformationSection formData={formData} setFormData={setFormData} categories={TASK_CATEGORIES} />

            {/* Process Selection */}
            <ProcessSelectionSection
              formData={formData}
              availableProcesses={availableProcesses}
              addProcess={addProcess}
              updateProcess={updateProcess}
              removeProcess={removeProcess}
            />

            {/* Materials Selection */}
            <MaterialsSelectionSection formData={formData} availableMaterials={availableMaterials} addMaterial={addMaterial} updateMaterial={updateMaterial} removeMaterial={removeMaterial} />

            {/* Universal Price Preview */}
            {pricePreview && (
              <Grid item xs={12}>
                <MetalSpecificPricePreview 
                  pricesByMetal={pricesByMetal}
                  formData={formData}
                  setFormData={setFormData}
                />
              </Grid>
            )}

            {/* Price Controls */}
            <PriceControlsSection
              formData={formData}
              setFormData={setFormData}
              pricePreview={pricePreview}
            />

            {/* Service Settings */}
            <ServiceSettingsSection formData={formData} setFormData={setFormData} />

            {/* Display Settings */}
            <DisplaySettingsSection formData={formData} setFormData={setFormData} />

            {/* Actions */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, pt: 2 }}>
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={loading || formData.processes.length === 0}
                  startIcon={loading ? null : <AddIcon />}
                >
                  {loading ? 'Creating Universal Task...' : 'Create Universal Task'}
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
