/**
 * Material Variants Manager Component
 * Handles creation, editing, and management of material variants
 */

import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Warning as WarningIcon
} from '@mui/icons-material';

import useMaterialVariants from '@/hooks/materials/useMaterialVariants';
import MaterialVariantsTable from './variants/MaterialVariantsTable';
import MaterialVariantDialog from './variants/MaterialVariantDialog';

export function MaterialVariantsManager({ 
  material, 
  onUpdate,
  disabled = false 
}) {
  const {
    editingVariant,
    showAddDialog,
    variantFormData,
    setVariantFormData,
    getAvailableKarats,
    handleAddVariant,
    handleEditVariant,
    handleSaveVariant,
    handleDeleteVariant,
    handleCloseDialog,
    handleToggleVariantActive,
    handleConvertToSingle,
    enableVariants,
    isValidVariant,
    isDuplicateVariant
  } = useMaterialVariants({ material, onUpdate });

  if (!material.hasVariants) {
    return (
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Material Variants</Typography>
            <Button
              startIcon={<AddIcon />}
              onClick={enableVariants}
              disabled={disabled}
            >
              Enable Variants
            </Button>
          </Box>
          <Alert severity="info" sx={{ mt: 2 }}>
            This material currently uses the single-material format. 
            Enable variants to support multiple metal types and karats for the same material.
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              Material Variants ({material.variants ? material.variants.length : 0})
            </Typography>
            <Box>
              <Button
                startIcon={<AddIcon />}
                onClick={handleAddVariant}
                disabled={disabled}
                sx={{ mr: 1 }}
              >
                Add Variant
              </Button>
              {material.variants && material.variants.length <= 1 && (
                <Button
                  startIcon={<WarningIcon />}
                  onClick={handleConvertToSingle}
                  disabled={disabled}
                  color="warning"
                  size="small"
                >
                  Convert to Single
                </Button>
              )}
            </Box>
          </Box>

          {!material.variants || material.variants.length === 0 ? (
            <Alert severity="warning">
              No variants defined. Add at least one variant or convert to single material format.
            </Alert>
          ) : (
            <MaterialVariantsTable
              variants={material.variants}
              handleToggleVariantActive={handleToggleVariantActive}
              handleEditVariant={handleEditVariant}
              handleDeleteVariant={handleDeleteVariant}
              disabled={disabled}
            />
          )}
        </CardContent>
      </Card>

      <MaterialVariantDialog
        showAddDialog={showAddDialog}
        handleCloseDialog={handleCloseDialog}
        editingVariant={editingVariant}
        variantFormData={variantFormData}
        setVariantFormData={setVariantFormData}
        getAvailableKarats={getAvailableKarats}
        isDuplicateVariant={isDuplicateVariant}
        isValidVariant={isValidVariant}
        handleSaveVariant={handleSaveVariant}
      />
    </>
  );
}

export default MaterialVariantsManager;

