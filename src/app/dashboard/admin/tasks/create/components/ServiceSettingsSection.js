import React from 'react';
import {
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  TextField,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

export function ServiceSettingsSection({ formData, setFormData }) {
  return (
<Grid item xs={12}>
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">Service Settings</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={6} md={3}>
                      <TextField
                        fullWidth
                        label="Estimated Days"
                        type="number"
                        value={formData.service.estimatedDays}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          service: {
                            ...prev.service,
                            estimatedDays: parseInt(e.target.value) || 0
                          }
                        }))}
                        inputProps={{ min: 1, max: 30 }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <TextField
                        fullWidth
                        label="Rush Days"
                        type="number"
                        value={formData.service.rushDays}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          service: {
                            ...prev.service,
                            rushDays: parseInt(e.target.value) || 0
                          }
                        }))}
                        inputProps={{ min: 1, max: 10 }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <TextField
                        fullWidth
                        label="Rush Multiplier"
                        type="number"
                        step="0.1"
                        value={formData.service.rushMultiplier}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          service: {
                            ...prev.service,
                            rushMultiplier: parseFloat(e.target.value) || 1.0
                          }
                        }))}
                        inputProps={{ min: 1.0, max: 3.0, step: 0.1 }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={formData.service.requiresApproval}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              service: {
                                ...prev.service,
                                requiresApproval: e.target.checked
                              }
                            }))}
                          />
                        }
                        label="Requires Approval"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={formData.service.requiresInspection}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              service: {
                                ...prev.service,
                                requiresInspection: e.target.checked
                              }
                            }))}
                          />
                        }
                        label="Requires Inspection"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={formData.service.canBeBundled}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              service: {
                                ...prev.service,
                                canBeBundled: e.target.checked
                              }
                            }))}
                          />
                        }
                        label="Can Be Bundled"
                      />
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>
            </Grid>

              );
}
