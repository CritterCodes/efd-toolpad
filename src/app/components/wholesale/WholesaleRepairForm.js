import React from 'react';
import { Box, Paper, Tabs, Tab, Button, CircularProgress, Typography } from '@mui/material';
import { useWholesaleRepairForm } from '../../../hooks/wholesale/useWholesaleRepairForm';
import ClientInfoSection from './form-sections/ClientInfoSection';
import RepairDetailsSection from './form-sections/RepairDetailsSection';
import PhotoUploadSection from './form-sections/PhotoUploadSection';

export default function WholesaleRepairForm(props) {
    const { formData, errors, isSubmitting, activeTab, setActiveTab, handleInputChange, handlePhotoUpload, removePhoto, handleSubmit } = useWholesaleRepairForm(props);

    function a11yProps(index) {
        return {
            id: `simple-tab-${index}`,
            'aria-controls': `simple-tabpanel-${index}`,
        };
    }

    return (
        <Paper sx={{ p: 4, maxWidth: 800, mx: 'auto' }}>
            <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ mb: 4 }}>
                <Tab label="Client Info" {...a11yProps(0)} />
                <Tab label="Repair Details" {...a11yProps(1)} />
                <Tab label="Photos" {...a11yProps(2)} />
            </Tabs>
            <form onSubmit={handleSubmit}>
                {activeTab === 0 && <ClientInfoSection formData={formData} errors={errors} handleInputChange={handleInputChange} />}
                {activeTab === 1 && <RepairDetailsSection formData={formData} errors={errors} handleInputChange={handleInputChange} />}
                {activeTab === 2 && <PhotoUploadSection photos={formData.photos} handlePhotoUpload={handlePhotoUpload} removePhoto={removePhoto} />}
                <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                    <Button onClick={props.onCancel}>Cancel</Button>
                    <Button type="submit" variant="contained" disabled={isSubmitting}>
                        {isSubmitting ? <CircularProgress size={24} /> : 'Submit Repair'}
                    </Button>
                </Box>
            </form>
        </Paper>
    );
}
