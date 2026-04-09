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

export function DisplaySettingsSection({ formData, setFormData }) {
  return (
<Grid item xs={12}>
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">Display Settings</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={6} md={3}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={formData.display.isActive}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              display: {
                                ...prev.display,
                                isActive: e.target.checked
                              }
                            }))}
                          />
                        }
                        label="Active"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={formData.display.isFeatured}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              display: {
                                ...prev.display,
                                isFeatured: e.target.checked
                              }
                            }))}
                          />
                        }
                        label="Featured"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <TextField
                        fullWidth
                        label="Sort Order"
                        type="number"
                        value={formData.display.sortOrder}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          display: {
                            ...prev.display,
                            sortOrder: parseInt(e.target.value) || 0
                          }
                        }))}
                        inputProps={{ min: 0, max: 999 }}
                      />
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>
            </Grid>

              );
}
