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


export default function TaskPricingSection({ formData, handleInputChange, calculatedPrice }) {
    return (
        <Grid container spacing={3}>
                      <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      required
                      label="Task Title"
                      value={formData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      placeholder="e.g., Ring Sizing Up/Down"
                    />
                  </Grid>
       
        </Grid>
    );
}
