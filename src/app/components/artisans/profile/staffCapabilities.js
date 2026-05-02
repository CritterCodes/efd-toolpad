"use client";
import React from 'react';
import PropTypes from 'prop-types';
import {
  Box, Typography, Switch, FormControlLabel, TextField,
  Divider, Card, CardContent, Select, MenuItem, FormControl, InputLabel, Chip,
} from '@mui/material';
import HandymanIcon from '@mui/icons-material/Handyman';
import WorkIcon from '@mui/icons-material/Work';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';

const CAPABILITIES = [
  { key: 'repairOps', label: 'Repair Ops', description: 'Core access to the jeweler repair workflow' },
  { key: 'receiving', label: 'Receiving', description: 'Can receive repairs at intake and move to Ready for Work' },
  { key: 'benchWork', label: 'Bench Work', description: 'Can claim repairs, perform bench work, and move jobs into QC' },
  { key: 'parts', label: 'Parts', description: 'Can manage needs-parts and parts-ordered workflow' },
  { key: 'qualityControl', label: 'Quality Control', description: 'Can review jobs in QC and mark them completed or return them to bench work' },
  { key: 'closeoutBilling', label: 'Closeout & Billing', description: 'Can handle after photos, invoice batching, and payment & pickup closeout' },
];

export default function ArtisanStaffCapabilities({ artisan, onFieldChange }) {
  const employment = artisan?.employment || {};
  const caps = artisan?.staffCapabilities || {};
  const compensationProfile = artisan?.compensationProfile || {};

  const isOnsite = employment.isOnsite === true;

  const setEmployment = (field, value) => {
    onFieldChange('employment', { ...employment, [field]: value });
  };

  const setCap = (key, value) => {
    onFieldChange('staffCapabilities', { ...caps, [key]: value });
  };

  const setCompensation = (field, value) => {
    onFieldChange('compensationProfile', { ...compensationProfile, [field]: value });
  };

  const setOnsite = (value) => {
    onFieldChange('employment', { ...employment, isOnsite: value });
    if (!value) {
      onFieldChange('staffCapabilities', {});
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <HandymanIcon color="primary" />
        <Box>
          <Typography variant="h6" fontWeight={600}>Staff &amp; Repair Operations</Typography>
          <Typography variant="body2" color="text.secondary">
            Controls whether this artisan has access to the on-site jeweler workflow.
            Offsite artisans are not affected.
          </Typography>
        </Box>
      </Box>

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <FormControlLabel
            control={(
              <Switch
                checked={isOnsite}
                onChange={(e) => setOnsite(e.target.checked)}
                color="primary"
              />
            )}
            label={(
              <Box>
                <Typography fontWeight={600}>On-site staff member</Typography>
                <Typography variant="caption" color="text.secondary">
                  Enables the jeweler repair workflow for this artisan
                </Typography>
              </Box>
            )}
          />

          {isOnsite && (
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 2 }}>
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel>Staff Type</InputLabel>
                <Select
                  value={employment.staffType || 'jeweler'}
                  label="Staff Type"
                  onChange={(e) => setEmployment('staffType', e.target.value)}
                >
                  <MenuItem value="jeweler">Jeweler</MenuItem>
                  <MenuItem value="apprentice">Apprentice</MenuItem>
                  <MenuItem value="polisher">Polisher</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel>Pay Type</InputLabel>
                <Select
                  value={employment.payType || 'hourly'}
                  label="Pay Type"
                  onChange={(e) => setEmployment('payType', e.target.value)}
                >
                  <MenuItem value="hourly">Hourly</MenuItem>
                  <MenuItem value="salary">Salary</MenuItem>
                  <MenuItem value="commission">Commission</MenuItem>
                </Select>
              </FormControl>

              <TextField
                size="small"
                label="Hourly Rate ($)"
                type="number"
                value={employment.hourlyRate ?? ''}
                onChange={(e) => setEmployment('hourlyRate', parseFloat(e.target.value) || 0)}
                sx={{ width: 140 }}
                inputProps={{ min: 0, step: 0.5 }}
              />
            </Box>
          )}
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <AccountBalanceWalletIcon fontSize="small" color="action" />
            <Typography variant="subtitle2" fontWeight={600}>Compensation Profile</Typography>
          </Box>

          <FormControlLabel
            control={(
              <Switch
                checked={compensationProfile.isOwnerOperator === true}
                onChange={(e) => setCompensation('isOwnerOperator', e.target.checked)}
                color="primary"
              />
            )}
            label={(
              <Box>
                <Typography fontWeight={600}>Owner / operator</Typography>
                <Typography variant="caption" color="text.secondary">
                  Keeps this user in labor payroll, but tracks owner draws separately from repair pay.
                </Typography>
              </Box>
            )}
          />
        </CardContent>
      </Card>

      {isOnsite && (
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <WorkIcon fontSize="small" color="action" />
            <Typography variant="subtitle2" fontWeight={600}>Capabilities</Typography>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {CAPABILITIES.map(({ key, label, description }) => (
              <Card key={key} variant="outlined" sx={{ opacity: key === 'repairOps' || caps.repairOps ? 1 : 0.5 }}>
                <CardContent sx={{ py: '10px !important', px: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" fontWeight={600}>{label}</Typography>
                        {key === 'repairOps' && (
                          <Chip label="Required" size="small" color="primary" sx={{ height: 18, fontSize: '0.65rem' }} />
                        )}
                      </Box>
                      <Typography variant="caption" color="text.secondary">{description}</Typography>
                    </Box>
                    <Switch
                      size="small"
                      checked={caps[key] === true}
                      disabled={key !== 'repairOps' && !caps.repairOps}
                      onChange={(e) => setCap(key, e.target.checked)}
                      color="primary"
                    />
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>

          <Divider sx={{ my: 2 }} />
          <Typography variant="caption" color="text.secondary">
            Changes take effect on the jeweler&apos;s next login. Save changes at the top of the page to persist.
          </Typography>
        </>
      )}
    </Box>
  );
}

ArtisanStaffCapabilities.propTypes = {
  artisan: PropTypes.object,
  onFieldChange: PropTypes.func.isRequired,
};
