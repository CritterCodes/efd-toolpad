import React from 'react';
import { Box, Paper, Typography, Button, Divider, CircularProgress } from '@mui/material';
import { useGemstoneCreationForm } from '../../../hooks/products/useGemstoneCreationForm';
import BasicInfoSection from './gemstone-form/BasicInfoSection';
import PricingSection from './gemstone-form/PricingSection';
import SpecificationsSection from './gemstone-form/SpecificationsSection';

export default function GemstoneCreationForm(props) {
    const { 
        formData, errors, isSubmitting, 
        handleInputChange, handleSelectChange, handlePhotoUpload, removePhoto, handleSubmit 
    } = useGemstoneCreationForm(props);

    return (
        <Paper sx={{ p: 4, maxWidth: 1000, mx: 'auto' }}>
            <Typography variant="h5" sx={{ mb: 4 }}>
                {props.initialData ? 'Edit Gemstone' : 'Add New Gemstone'}
            </Typography>

            <form onSubmit={handleSubmit}>
                <BasicInfoSection 
                    formData={formData} 
                    errors={errors} 
                    handleInputChange={handleInputChange} 
                    handleSelectChange={handleSelectChange}
                    handlePhotoUpload={handlePhotoUpload}
                    removePhoto={removePhoto}
                />
                
                <Divider sx={{ my: 4 }} />
                
                <PricingSection 
                    formData={formData} 
                    errors={errors} 
                    handleInputChange={handleInputChange} 
                />
                
                <Divider sx={{ my: 4 }} />
                
                <SpecificationsSection 
                    formData={formData} 
                    errors={errors} 
                    handleInputChange={handleInputChange} 
                    handleSelectChange={handleSelectChange}
                />

                <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                    <Button onClick={props.onCancel} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button 
                        type="submit" 
                        variant="contained" 
                        color="primary"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? <CircularProgress size={24} /> : (props.initialData ? 'Save Changes' : 'Create Gemstone')}
                    </Button>
                </Box>
            </form>
        </Paper>
    );
}
