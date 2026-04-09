const fs = require('fs');

let content = fs.readFileSync('gem.txt', 'utf8');

// The file GemstonCreationForm.js
let hookCode = content.substring(
    content.indexOf('export default function GemstoneCreationForm'),
    content.indexOf('return (')
).replace('export default function GemstoneCreationForm({', 'export function useGemstoneCreationForm({');

let returns = "    return { formData, setFormData, errors, isSubmitting, handleInputChange, handleSelectChange, handlePhotoUpload, handleSubmit, removePhoto, calculateCalculatedPrice };\n";
hookCode += returns;

let basicStart = content.indexOf('<Grid item xs={12} md={8}>');
// The basic info grid ends right before pricing grid: "Pricing & Inventory"
let basicEnd = content.indexOf('<Typography variant="h6" sx={{ mb: 2, mt: 4 }}>'); 
let basic = content.substring(basicStart, basicEnd);

let pricingStart = content.indexOf('<Grid container spacing={3}>', content.indexOf('Pricing & Inventory'));
let pricingEnd = content.indexOf('</Grid>', pricingStart) + 7;
let pricing = content.substring(pricingStart, pricingEnd);

// Specs
let specStart = content.indexOf('<Grid container spacing={3}>', content.indexOf('Specifications'));
let specEnd = content.indexOf('</Grid>', specStart) + 7;
let spec = content.substring(specStart, specEnd);

fs.mkdirSync('src/hooks/products', { recursive: true });
fs.writeFileSync('src/hooks/products/useGemstoneCreationForm.js', "import { useState, useCallback } from 'react';\n" + hookCode);

fs.mkdirSync('src/app/components/products/gemstone-form', { recursive: true });

fs.writeFileSync('src/app/components/products/gemstone-form/BasicInfoSection.js', 
`import React from 'react';
import { Grid, TextField, FormControl, InputLabel, Select, MenuItem, Box, Typography, Button, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import FileUploadIcon from '@mui/icons-material/FileUpload';

export default function BasicInfoSection({ formData, errors, handleInputChange, handleSelectChange, handlePhotoUpload, removePhoto }) {
    return (
        <Grid container spacing={3}>
            ${basic}
    );
}`);

fs.writeFileSync('src/app/components/products/gemstone-form/PricingSection.js', 
`import React from 'react';
import { Grid, TextField, InputAdornment, Typography } from '@mui/material';
export default function PricingSection({ formData, errors, handleInputChange }) {
    return (
        <>
            <Typography variant="h6" sx={{ mb: 2, mt: 4 }}>Pricing & Inventory</Typography>
            ${pricing}
        </>
    );
}`);

fs.writeFileSync('src/app/components/products/gemstone-form/SpecificationsSection.js', 
`import React from 'react';
import { Grid, TextField, FormControl, InputLabel, Select, MenuItem, Typography } from '@mui/material';
export default function SpecificationsSection({ formData, errors, handleInputChange, handleSelectChange }) {
    return (
        <>
            <Typography variant="h6" sx={{ mb: 2, mt: 4 }}>Specifications</Typography>
            ${spec}
        </>
    );
}`);

let orchestrator = `import React from 'react';
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
`;

fs.writeFileSync('src/app/components/products/GemstonCreationForm.js', orchestrator);
console.log('Gemstone Refactor Done!');
