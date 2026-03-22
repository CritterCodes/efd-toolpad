import * as React from 'react';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import { VALID_SKILL_LEVELS } from '@/constants/pricing.constants.mjs';
import { RISK_LEVELS } from './TaskConstants';

export default function ServiceSettingsInputs({ 
  formData, 
  handleNestedChange, 
  handleToggle, 
  handleNestedToggle 
}) {
  return (
    <>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          type="number"
          label="Estimated Days"
          value={formData.service.estimatedDays}
          onChange={handleNestedChange('service', 'estimatedDays')}
          inputProps={{
            min: 1,
            step: 1
          }}
          helperText="Standard turnaround time"
        />
      </Grid>

      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          type="number"
          label="Rush Days"
          value={formData.service.rushDays}
          onChange={handleNestedChange('service', 'rushDays')}
          inputProps={{
            min: 1,
            step: 1
          }}
          helperText="Rush turnaround time"
        />
      </Grid>

      <Grid item xs={12} sm={6}>
        <FormControl fullWidth>
          <InputLabel>Skill Level Required</InputLabel>
          <Select
            value={formData.service.skillLevel}
            label="Skill Level Required"
            onChange={handleNestedChange('service', 'skillLevel')}
          >
            {VALID_SKILL_LEVELS.map((level) => (
              <MenuItem key={level} value={level}>
                {level.toUpperCase()}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>

      <Grid item xs={12} sm={6}>
        <FormControl fullWidth>
          <InputLabel>Risk Level</InputLabel>
          <Select
            value={formData.service.riskLevel}
            label="Risk Level"
            onChange={handleNestedChange('service', 'riskLevel')}
          >
            {RISK_LEVELS.map((level) => (
              <MenuItem key={level} value={level}>
                {level.toUpperCase()}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>

      <Grid item xs={12} sm={6}>
        <FormControlLabel
          control={
            <Switch
              checked={formData.requiresMetalType}
              onChange={handleToggle('requiresMetalType')}
            />
          }
          label="Requires Specific Metal Type"
        />
      </Grid>

      <Grid item xs={12} sm={6}>
        <FormControlLabel
          control={
            <Switch
              checked={formData.service.requiresApproval}
              onChange={handleNestedToggle('service', 'requiresApproval')}
            />
          }
          label="Requires Customer Approval"
        />
      </Grid>

      <Grid item xs={12} sm={6}>
        <FormControlLabel
          control={
            <Switch
              checked={formData.service.canBeBundled}
              onChange={handleNestedToggle('service', 'canBeBundled')}
            />
          }
          label="Can Be Bundled"
        />
      </Grid>
    </>
  );
}
