'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import InputAdornment from '@mui/material/InputAdornment';
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  Add as AddIcon,
  AttachMoney as MoneyIcon,
  Schedule as TimeIcon,
  Category as CategoryIcon,
  Build as BuildIcon,
  Security as SecurityIcon
} from '@mui/icons-material';
import { PageContainer } from '@toolpad/core/PageContainer';
import { useRouter, useParams } from 'next/navigation';
import { SKILL_LEVEL } from '@/constants/pricing.constants.mjs';


export default function TaskAdvancedSection({ formData, handleInputChange }) {
    return (
        <Grid container spacing={3}>
                      <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      label="Description"
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      placeholder="Detailed description of the repair task..."
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.requiresMetalType}
                          onChange={(e) => handleInputChange('requiresMetalType', e.target.checked)}
                        />
                      }
                      label="Requires specific metal type"
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Pricing Information */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <MoneyIcon />
                  Pricing Components
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      required
                      type="number"
                      label="Labor Hours"
                      value={formData.laborHours}
                      onChange={(e) => handleInputChange('laborHours', parseFloat(e.target.value) || 0)}
                      inputProps={{ min: 0, max: 8, step: 0.25 }}
                      InputProps={{
                        endAdornment: <InputAdornment position="end">hours</InputAdornment>
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      required
                      type="number"
                      label="Material Cost"
                      value={formData.materialCost}
                      onChange={(e) => handleInputChange('materialCost', parseFloat(e.target.value) || 0)}
                      inputProps={{ min: 0, max: 500, step: 0.01 }}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">$</InputAdornment>
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Box sx={{ p: 2, bgcolor: 'primary.50', borderRadius: 1, border: 1, borderColor: 'primary.200' }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Estimated Base Price:
                      </Typography>
                      <Typography variant="h5" color="primary.main" fontWeight="bold">
                        ${calculatedPrice.toFixed(2)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Includes labor, materials markup, and business fees
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Service Details */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TimeIcon />
                  Service Details
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Estimated Days"
                      value={formData.service.estimatedDays}
                      onChange={(e) => handleInputChange('service.estimatedDays', parseInt(e.target.value) || 1)}
                      inputProps={{ min: 1, max: 30 }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Rush Days"
                      value={formData.service.rushDays}
                      onChange={(e) => handleInputChange('service.rushDays', parseInt(e.target.value) || 1)}
                      inputProps={{ min: 1, max: 10 }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <FormControl fullWidth>
                      <InputLabel>Skill Level</InputLabel>
                      <Select
                        value={formData.service.skillLevel}
                        onChange={(e) => handleInputChange('service.skillLevel', e.target.value)}
                        label="Skill Level"
                      >
                        <MenuItem value={SKILL_LEVEL.BASIC}>Basic</MenuItem>
                        <MenuItem value={SKILL_LEVEL.STANDARD}>Standard</MenuItem>
                        <MenuItem value={SKILL_LEVEL.ADVANCED}>Advanced</MenuItem>
                        <MenuItem value={SKILL_LEVEL.EXPERT}>Expert</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={6}>
                    <FormControl fullWidth>
                      <InputLabel>Risk Level</InputLabel>
                      <Select
                        value={formData.service.riskLevel}
                        onChange={(e) => handleInputChange('service.riskLevel', e.target.value)}
                        label="Risk Level"
                      >
                        <MenuItem value="low">Low</MenuItem>
                        <MenuItem value="medium">Medium</MenuItem>
                        <MenuItem value="high">High</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.service.requiresApproval}
                          onChange={(e) => handleInputChange('service.requiresApproval', e.target.checked)}
                        />
                      }
                      label="Requires customer approval"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.service.requiresInspection}
                          onChange={(e) => handleInputChange('service.requiresInspection', e.target.checked)}
                        />
                      }
                      label="Requires quality inspection"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.service.canBeBundled}
                          onChange={(e) => handleInputChange('service.canBeBundled', e.target.checked)}
                        />
                      }
                      label="Can be bundled with other tasks"
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Display Settings */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SecurityIcon />
                  Display & Status Settings
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.display.isActive}
                          onChange={(e) => handleInputChange('display.isActive', e.target.checked)}
                        />
                      }
                      label="Active (visible to users)"
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.display.isFeatured}
                          onChange={(e) => handleInputChange('display.isFeatured', e.target.checked)}
                        />
                      }
                      label="Featured task"
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Sort Order"
                      value={formData.display.sortOrder}
                      onChange={(e) => handleInputChange('display.sortOrder', parseInt(e.target.value) || 100)}
                      inputProps={{ min: 1, max: 1000 }}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

        </Grid>
    );
}
