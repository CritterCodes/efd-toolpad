import React from 'react';
import {
  Grid,
  Box,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  IconButton,
  Alert
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { TaskFormSection, TASK_UI, taskSelectionCardSx, taskSelectMenuProps } from './taskBuilderUi';

export default function MaterialsSelectionSection({
  formData,
  availableMaterials,
  addMaterial,
  updateMaterial,
  removeMaterial
}) {
  return (
    <Grid item xs={12}>
      <TaskFormSection title="Materials" subtitle="Add the materials and conditions that affect cost.">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Box />
          <Button startIcon={<AddIcon />} onClick={addMaterial} variant="outlined" size="small">
            Add Material
          </Button>
        </Box>

        {formData.materials.map((material, index) => {
          const isOrphaned = material.materialId &&
            !availableMaterials.find(m => String(m._id) === String(material.materialId));

          return (
          <Box key={index} sx={taskSelectionCardSx}>
            <Grid container spacing={1.5} alignItems="center">
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Material</InputLabel>
                  <Select
                    MenuProps={taskSelectMenuProps}
                    value={material.materialId || ''}
                    onChange={(e) => updateMaterial(index, 'materialId', e.target.value)}
                    label="Material"
                  >
                    {isOrphaned && (
                      <MenuItem value={material.materialId} disabled>
                        {material.materialName || material.displayName || `Unknown (${String(material.materialId).slice(-8)})`} — deleted
                      </MenuItem>
                    )}
                    {availableMaterials.map((m) => (
                      <MenuItem key={String(m._id)} value={String(m._id)}>
                        {m.displayName || m.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={5} sm={2}>
                <TextField
                  fullWidth
                  size="small"
                  label="Qty"
                  type="number"
                  value={material.quantity}
                  onChange={(e) => updateMaterial(index, 'quantity', parseFloat(e.target.value))}
                  inputProps={{ min: 0, step: 0.1 }}
                />
              </Grid>
              <Grid item xs={5} sm={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Condition</InputLabel>
                  <Select
                    MenuProps={taskSelectMenuProps}
                    value={material.condition || 'new'}
                    onChange={(e) => updateMaterial(index, 'condition', e.target.value)}
                    label="Condition"
                  >
                    <MenuItem value="new">New</MenuItem>
                    <MenuItem value="customer_provided">Customer Provided</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={2} sm={1} sx={{ display: 'flex', justifyContent: 'center' }}>
                <IconButton size="small" onClick={() => removeMaterial(index)} sx={{ color: TASK_UI.textSecondary }}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Grid>
            </Grid>
          </Box>
          );
        })}

        {formData.materials.length === 0 && (
          <Alert severity="info" sx={{ py: 0.5 }}>
            Add materials needed for this task.
          </Alert>
        )}
      </TaskFormSection>
    </Grid>
  );
}
