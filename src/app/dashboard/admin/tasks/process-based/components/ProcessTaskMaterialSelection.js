import {
  Grid,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Box,
  Card,
  CardContent,
  IconButton,
  Alert
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon, Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';

export default function ProcessTaskMaterialSelection({
  formData,
  availableMaterials,
  getCompatibleMaterials,
  addMaterial,
  updateMaterial,
  removeMaterial
}) {
  return (
    <Accordion defaultExpanded>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="h6">🧪 Material Selection</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Add materials that will be consumed during this task. Materials are optional - you can create process-only tasks.
        </Typography>
        <Box sx={{ mb: 2 }}>
          <Button
            startIcon={<AddIcon />}
            onClick={addMaterial}
            variant="outlined"
            size="small"
          >
            Add Material
          </Button>
        </Box>

        {formData.materials.map((material, index) => (
          <Card key={index} sx={{ mb: 2 }}>
            <CardContent>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Material</InputLabel>
                    <Select
                      value={material.materialId}
                      onChange={(e) => updateMaterial(index, 'materialId', e.target.value)}
                      label="Material"
                    >
                      {getCompatibleMaterials().map((mat) => (
                        <MenuItem key={mat._id} value={mat._id}>
                          <Box>
                            <Typography variant="body2" fontWeight="bold">
                              {mat.displayName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              ${mat.unitCost} per {mat.unitType} • {mat.category}
                            </Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Quantity"
                    type="number"
                    value={material.quantity}
                    onChange={(e) => updateMaterial(index, 'quantity', parseFloat(e.target.value) || 1)}
                    inputProps={{ min: 0.1, max: 10, step: 0.1 }}
                  />
                </Grid>

                <Grid item xs={12} md={2}>
                  {material.materialId && (
                    <Box>
                      {(() => {
                        const mat = availableMaterials.find(m => m._id === material.materialId);
                        const totalCost = mat ? mat.unitCost * material.quantity : 0;
                        return (
                          <Typography variant="caption" color="primary">
                            ${Math.round(totalCost * 100) / 100}
                          </Typography>
                        );
                      })()}
                    </Box>
                  )}
                </Grid>

                <Grid item xs={12} md={1}>
                  <IconButton
                    onClick={() => removeMaterial(index)}
                    color="error"
                    size="small"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        ))}

        {formData.materials.length === 0 && (
          <Alert severity="info">
            No materials selected - this will be a process-only task.
          </Alert>
        )}
      </AccordionDetails>
    </Accordion>
  );
}