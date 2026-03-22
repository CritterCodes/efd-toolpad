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


import { useRepairTaskCreator } from '../../../../hooks/tasks/useRepairTaskCreator';
import TaskOverviewSection from '../../../../components/tasks/create/TaskOverviewSection';
import TaskPricingSection from '../../../../components/tasks/create/TaskPricingSection';
import TaskSpecsSection from '../../../../components/tasks/create/TaskSpecsSection';
import TaskAdvancedSection from '../../../../components/tasks/create/TaskAdvancedSection';

export default function RepairTaskFormPage({ params }) {
    const { 
        isEdit, loading, saving, error, success, 
        formData, calculatedPrice, handleInputChange, handleArrayChange, handleSubmit, handleCancel 
    } = useRepairTaskCreator({ params });

    if (loading) {
        return (
            <PageContainer>
                <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
                    <CircularProgress />
                </Box>
            </PageContainer>
        );
    }

    return (
        <PageContainer title={isEdit ? 'Edit Repair Task' : 'Create New Repair Task'}>
            <form onSubmit={handleSubmit}>
                <Box display="flex" flexDirection="column" gap={3}>
                    
                    {error && <Alert severity="error">{error}</Alert>}
                    {success && <Alert severity="success">{isEdit ? 'Task updated successfully' : 'Task created successfully'}</Alert>}
                    
                    <TaskOverviewSection formData={formData} handleInputChange={handleInputChange} />
                    
                    <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                            <TaskPricingSection formData={formData} handleInputChange={handleInputChange} calculatedPrice={calculatedPrice} />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TaskSpecsSection formData={formData} handleInputChange={handleInputChange} handleArrayChange={handleArrayChange} />
                        </Grid>
                    </Grid>
                    
                    <TaskAdvancedSection formData={formData} handleInputChange={handleInputChange} />

                    <Box display="flex" justifyContent="flex-end" gap={2} mt={2} mb={4}>
                        <Button
                            variant="outlined"
                            startIcon={<CancelIcon />}
                            onClick={handleCancel}
                            disabled={saving}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="contained"
                            color="primary"
                            startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
                            disabled={saving}
                        >
                            {saving ? 'Saving...' : isEdit ? 'Update Task' : 'Create Task'}
                        </Button>
                    </Box>
                </Box>
            </form>
        </PageContainer>
    );
}
