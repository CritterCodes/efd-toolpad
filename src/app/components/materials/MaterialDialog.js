/**
 * MaterialDialog Component
 * Modal dialog for creating and editing materials with variant support
 */

import * as React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Tabs,
  Tab,
  Typography,
  Switch,
  FormControlLabel,
  Alert
} from '@mui/material';
import MaterialForm from './MaterialForm';
import MaterialVariantsManager from './MaterialVariantsManager';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`material-tabpanel-${index}`}
      aria-labelledby={`material-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 2 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function MaterialDialog({
  open,
  onClose,
  onSubmit,
  formData,
  setFormData,
  onFetchStullerData,
  loadingStuller = false,
  editingMaterial = null
}) {
  const [activeTab, setActiveTab] = React.useState(0);
  const isEditing = !!editingMaterial;

  // Initialize hasVariants if not set
  React.useEffect(() => {
    if (formData && typeof formData.hasVariants === 'undefined') {
      setFormData(prev => ({ 
        ...prev, 
        hasVariants: false,
        variants: []
      }));
    }
  }, [formData, setFormData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(e);
  };

  const handleToggleVariants = (enabled) => {
    if (enabled) {
      // Convert to variants - create first variant from current material data
      const firstVariant = {
        metalType: formData.metalType || 'other',
        karat: formData.karat || 'na',
        sku: formData.sku || '',
        unitCost: formData.unitCost || 0,
        stullerProductId: formData.stuller_item_number || '',
        compatibleMetals: [formData.metalType || 'other'],
        isActive: true,
        lastUpdated: new Date(),
        notes: ''
      };

      setFormData(prev => ({
        ...prev,
        hasVariants: true,
        variants: [firstVariant],
        // Clear legacy fields for variant materials
        unitCost: null,
        sku: null,
        stuller_item_number: null,
        metalType: null,
        karat: null
      }));
    } else {
      // Convert back to single material
      const variant = formData.variants?.[0];
      setFormData(prev => ({
        ...prev,
        hasVariants: false,
        variants: [],
        // Restore legacy fields from first variant
        unitCost: variant?.unitCost || 0,
        sku: variant?.sku || '',
        stuller_item_number: variant?.stullerProductId || '',
        metalType: variant?.metalType || '',
        karat: variant?.karat || ''
      }));
    }
  };

  const handleVariantsUpdate = (updatedMaterial) => {
    setFormData(updatedMaterial);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{ sx: { height: '90vh' } }}
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              {isEditing ? 'Edit Material' : 'Add New Material'}
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.hasVariants || false}
                  onChange={(e) => handleToggleVariants(e.target.checked)}
                />
              }
              label="Multi-Variant Material"
            />
          </Box>
        </DialogTitle>
        
        <DialogContent dividers>
          {formData.hasVariants && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Multi-variant materials can hold multiple metal types and karats. 
              This reduces the number of material records and simplifies process creation.
            </Alert>
          )}

          <Tabs 
            value={activeTab} 
            onChange={(e, newValue) => setActiveTab(newValue)}
            sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
          >
            <Tab label="Basic Information" />
            {formData.hasVariants && (
              <Tab label={`Variants (${formData.variants?.length || 0})`} />
            )}
          </Tabs>

          <TabPanel value={activeTab} index={0}>
            <MaterialForm
              formData={formData}
              setFormData={setFormData}
              onFetchStullerData={onFetchStullerData}
              loadingStuller={loadingStuller}
              isEditing={isEditing}
              isVariantMode={formData.hasVariants}
            />
          </TabPanel>

          {formData.hasVariants && (
            <TabPanel value={activeTab} index={1}>
              <MaterialVariantsManager
                material={formData}
                onUpdate={handleVariantsUpdate}
              />
            </TabPanel>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button 
            type="submit" 
            variant="contained"
            disabled={formData.hasVariants && (!formData.variants || formData.variants.length === 0)}
          >
            {isEditing ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
