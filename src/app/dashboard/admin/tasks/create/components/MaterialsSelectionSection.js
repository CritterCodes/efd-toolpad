import React from 'react';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Grid,
  Box,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  IconButton
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
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
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Required Materials</Typography>
        </AccordionSummary>
        <AccordionDetails>
          {formData.materials.map((material, index) => (
            <Box key={index} sx={{ mb: 2, p: 2, border: '1px solid #eee', borderRadius: 1 }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Material</InputLabel>
                    <Select
                      value={material.materialId}
                      onChange={(e) => updateMaterial(index, 'materialId', e.target.value)}
                      label="Material"
                    >
                      {availableMaterials.map((m) => (
                        <MenuItem key={m._id} value={m._id}>
                          {m.name || m.title}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={2}>
                  <TextField
                    fullWidth
                    label="Quantity"
                    type="number"
                    value={material.quantity}
                    onChange={(e) => updateMaterial(index, 'quantity', parseFloat(e.target.value))}
                    inputProps={{ min: 0, step: 0.1 }}
                  />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <FormControl fullWidth>
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
                <Grid item xs={12} sm={1}>
                  <IconButton color="error" onClick={() => removeMaterial(index)}>
                    <DeleteIcon />
                  </IconButton>
                </Grid>
              </Grid>
            </Box>
          ))}
          <Button
            startIcon={<AddIcon />}
            onClick={addMaterial}
            variant="outlined"
            sx={{ mt: 1 }}
          >
            Add Material
          </Button>
        </AccordionDetails>
      </Accordion>
    </Grid>
  );
}
