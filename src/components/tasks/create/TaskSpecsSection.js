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


export default function TaskSpecsSection({ formData, handleInputChange, handleArrayChange }) {
    return (
        <Grid container spacing={3}>
                      <Grid item xs={12} md={6}>
                    <FormControl fullWidth required>
                      <InputLabel>Category</InputLabel>
                      <Select
                        value={formData.category}
                        onChange={(e) => handleInputChange('category', e.target.value)}
                        label="Category"
                      >
                        <MenuItem value="shank">🔄 Shank & Sizing</MenuItem>
                        <MenuItem value="prongs">📌 Prong Repair</MenuItem>
                        <MenuItem value="stone_setting">💎 Stone Setting</MenuItem>
                        <MenuItem value="engraving">✏️ Engraving</MenuItem>
                        <MenuItem value="chains">🔗 Chain Repair</MenuItem>
                        <MenuItem value="bracelet">⭕ Bracelet Repair</MenuItem>
                        <MenuItem value="watch">⏰ Watch Repair</MenuItem>
                        <MenuItem value="misc">🔧 Miscellaneous</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Subcategory"
                      value={formData.subcategory}
                      onChange={(e) => handleInputChange('subcategory', e.target.value)}
                      placeholder="e.g., ring_sizing, prong_tips"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Metal Type</InputLabel>
                      <Select
                        value={formData.metalType}
                        onChange={(e) => handleInputChange('metalType', e.target.value)}
                        label="Metal Type"
                      >
                        <MenuItem value="">Any Metal</MenuItem>
                        <MenuItem value="gold">Gold</MenuItem>
                        <MenuItem value="silver">Silver</MenuItem>
                        <MenuItem value="platinum">Platinum</MenuItem>
                        <MenuItem value="mixed">Mixed Metals</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
       
        </Grid>
    );
}
