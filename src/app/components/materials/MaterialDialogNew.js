/**
 * MaterialDialog Component
 * Modal dialog for creating/editing materials with separate tabs for general info and Stuller products
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Tabs,
  Tab
} from '@mui/material';
import MaterialFormSimple from './MaterialFormSimple';
import StullerProductsManager from './StullerProductsManager';
import { processFormDataForSubmission } from '../../../utils/materials.util';

const TabPanel = ({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`material-tabpanel-${index}`}
      aria-labelledby={`material-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
};

export default function MaterialDialog({
  open,
  onClose,
  onSubmit,
  formData,
  setFormData,
  onFetchStullerData,
  loadingStuller,
  editingMaterial
}) {
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    if (open && !formData.stullerProducts) {
      // Only reset tab to 0 when dialog first opens
      setTabValue(0);
      
      // Initialize stullerProducts array if not present
      setFormData(prev => ({ ...prev, stullerProducts: [] }));
    }
  }, [open, setFormData, formData.stullerProducts]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Process form data to handle custom types
      const processedFormData = processFormDataForSubmission(formData);
      await onSubmit(processedFormData);
      onClose();
    } catch (error) {
      console.error('Error submitting material:', error);
    }
  };

  const isEditing = !!editingMaterial;
  const dialogTitle = isEditing ? 'Edit Material' : 'Add New Material';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '600px' }
      }}
    >
      <DialogTitle>
        {dialogTitle}
      </DialogTitle>

      <DialogContent>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs
            value={tabValue}
            onChange={(e, newValue) => setTabValue(newValue)}
            aria-label="material tabs"
          >
            <Tab label="General Info" />
            <Tab label="Stuller Products" />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <MaterialFormSimple
            formData={formData}
            setFormData={setFormData}
          />
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <StullerProductsManager
            stullerProducts={formData.stullerProducts || []}
            onProductsChange={(stullerProducts) => {
              setFormData(prev => ({ ...prev, stullerProducts }));
            }}
            onFetchStullerData={onFetchStullerData}
            loadingStuller={loadingStuller}
            formData={formData}
            setFormData={setFormData}
          />
        </TabPanel>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleSubmit}
          variant="contained"
          color="primary"
        >
          {isEditing ? 'Update' : 'Create'} Material
        </Button>
      </DialogActions>
    </Dialog>
  );
}
