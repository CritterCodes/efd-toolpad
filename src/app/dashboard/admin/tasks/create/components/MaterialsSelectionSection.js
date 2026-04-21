import React from 'react';
import {
  Grid,
  Typography,
  Box,
  Button,
  Card,
  CardContent,
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

export default function MaterialsSelectionSection({
  formData,
  availableMaterials,
  addMaterial,
  updateMaterial,
  removeMaterial
}) {
  return (
    <Grid item xs={12}>
      <Box sx={{ px: { xs: 2, sm: 0 }, borderTop: '1px solid', borderColor: 'divider', pt: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700, lineHeight: 1 }}>
            🪨 Materials
          </Typography>
          <Button startIcon={<AddIcon />} onClick={addMaterial} variant="outlined" size="small">
            Add Material
          </Button>
        </Box>

        {formData.materials.map((material, index) => (
          <Card key={index} sx={{ mb: 1.5, borderLeft: '3px solid', borderLeftColor: 'info.main' }} elevation={0} variant="outlined">
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Grid container spacing={1.5} alignItems="center">
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Material</InputLabel>
                    <Select
                      value={material.materialId}
                      onChange={(e) => updateMaterial(index, 'materialId', e.target.value)}
                      label="Material"
                    >
                      {availableMaterials.map((m) => (
                        <MenuItem key={m._id} value={m._id}>
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
                      value={material.condition}
                      onChange={(e) => updateMaterial(index, 'condition', e.target.value)}
                      label="Condition"
                    >
                      <MenuItem value="new">New</MenuItem>
                      <MenuItem value="customer_provided">Customer Provided</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={2} sm={1} sx={{ display: 'flex', justifyContent: 'center' }}>
                  <IconButton color="error" size="small" onClick={() => removeMaterial(index)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        ))}

        {formData.materials.length === 0 && (
          <Alert severity="info" sx={{ py: 0.5 }}>
            Add materials needed for this task.
          </Alert>
        )}
      </Box>
    </Grid>
  );
}
