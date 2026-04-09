import React from 'react';
import {
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Box,
  Button,
  Card,
  CardContent,
  Autocomplete,
  TextField,
  IconButton,
  Alert,
  Chip
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { SKILL_LEVEL, DEFAULT_SKILL_LEVEL } from '@/constants/pricing.constants.mjs';

export function ProcessSelectionSection({
  formData,
  availableProcesses,
  addProcess,
  updateProcess,
  removeProcess
}) {
  return (
<Grid item xs={12}>
              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">⚙️ Process Selection</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ mb: 2 }}>
                    <Button
                      startIcon={<AddIcon />}
                      onClick={addProcess}
                      variant="outlined"
                      size="small"
                    >
                      Add Process
                    </Button>
                  </Box>

                  {formData.processes.map((process, index) => (
                    <Card key={index} sx={{ mb: 2 }}>
                      <CardContent>
                        <Grid container spacing={2} alignItems="center">
                          <Grid item xs={12} md={6}>
                            <Autocomplete
                              options={availableProcesses}
                              isOptionEqualToValue={(option, value) => option._id === (value?._id || value)}
                              getOptionLabel={(option) => {
                                if (typeof option === 'string') return option;
                                
                                // Fallback to Title Casing the category if everything else is mysteriously stripped by cache/Nextjs
                                const formatCategory = (cat) => {
                                  if (!cat) return 'Unknown Process';
                                  return cat.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                                };

                                return option?.name || option?.displayName || option?.title || formatCategory(option?.category);
                              }}
                              value={availableProcesses.find(p => p._id === process.processId) || null}
                              onChange={(event, newValue) => {
                                updateProcess(index, 'processId', newValue?._id || '');
                              }}
                              renderInput={(params) => (
                                <TextField
                                  {...params}
                                  label="Process"
                                  placeholder="Search processes..."
                                  required
                                />
                              )}
                              renderOption={(props, option) => {
                                const formatCategory = (cat) => {
                                  if (!cat) return 'Unknown Process';
                                  return cat.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                                };
                                return (
                                <Box component="li" {...props} key={option._id || Math.random()}>
                                  <Box>
                                    <Typography variant="body2" fontWeight="bold">
                                      {option?.name || option?.displayName || option?.title || formatCategory(option?.category)}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {option.laborHours || 0}hrs • ${typeof option.pricing?.totalCost === 'number' ? option.pricing.totalCost : 'Multi-Metal'} • {
                                        typeof option.skillLevel === 'string' 
                                          ? option.skillLevel 
                                          : DEFAULT_SKILL_LEVEL
                                      }
                                    </Typography>
                                  </Box>
                                </Box>
                                );
                              }}
                            />
                          </Grid>

                          <Grid item xs={12} md={3}>
                            <TextField
                              fullWidth
                              label="Quantity"
                              type="number"
                              value={process.quantity}
                              onChange={(e) => updateProcess(index, 'quantity', parseFloat(e.target.value) || 1)}
                              inputProps={{ min: 1, max: 10, step: 1 }}
                            />
                          </Grid>

                          <Grid item xs={12} md={2}>
                            <Box textAlign="center">
                              <Typography variant="caption" color="text.secondary">
                                Universal
                              </Typography>
                              <Chip label="✓" size="small" color="success" />
                            </Box>
                          </Grid>

                          <Grid item xs={12} md={1}>
                            <IconButton
                              onClick={() => removeProcess(index)}
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

                  {formData.processes.length === 0 && (
                    <Alert severity="info">
                      Add at least one process to calculate universal pricing.
                    </Alert>
                  )}
                </AccordionDetails>
              </Accordion>
            </Grid>

              );
}
