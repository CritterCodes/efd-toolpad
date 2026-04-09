const fs = require('fs');

let wrf = fs.readFileSync('WholesaleRepairForm.txt', 'utf8');

let tab0Start = wrf.indexOf('<Grid container spacing={2}>', wrf.indexOf('value={0}'));
let tab0End = wrf.indexOf('</Box>', tab0Start);
let tab0 = wrf.substring(tab0Start, tab0End);

let tab1Start = wrf.indexOf('<Grid container spacing={2}>', wrf.indexOf('value={1}'));
let tab1End = wrf.indexOf('</Box>', tab1Start);
let tab1 = wrf.substring(tab1Start, tab1End);

let tab2Start = wrf.indexOf('<Box', wrf.indexOf('value={2}'));
let tab2End = wrf.lastIndexOf('</Box>', wrf.indexOf('</TabPanel>', tab2Start));
let tab2 = wrf.substring(tab2Start, tab2End) + '</Box>';

fs.writeFileSync('src/app/components/wholesale/form-sections/ClientInfoSection.js', 
`import React from 'react';
import { Grid, TextField, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
export default function ClientInfoSection({ formData, errors, handleInputChange }) { 
    return (
        ${tab0}
    );
}
`);

fs.writeFileSync('src/app/components/wholesale/form-sections/RepairDetailsSection.js', 
`import React from 'react';
import { Grid, TextField, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
export default function RepairDetailsSection({ formData, errors, handleInputChange }) { 
    return (
        ${tab1}
    );
}
`);

fs.writeFileSync('src/app/components/wholesale/form-sections/PhotoUploadSection.js', 
`import React from 'react';
import { Box, Typography, Grid, IconButton } from '@mui/material';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import DeleteIcon from '@mui/icons-material/Delete';

export default function PhotoUploadSection({ photos, handlePhotoUpload, removePhoto }) { 
    return (
        ${tab2}
    );
}
`);

// The hook
let hookStart = wrf.indexOf('export default function WholesaleRepairForm({');
let hookEnd = wrf.indexOf('return (', hookStart);
let hookBody = wrf.substring(hookStart, hookEnd).replace('export default function WholesaleRepairForm({', 'export function useWholesaleRepairForm({').replace(/$/, '\n    return { formData, errors, isSubmitting, activeTab, setActiveTab, handleInputChange, handlePhotoUpload, removePhoto, handleSubmit };\n');

fs.writeFileSync('src/hooks/wholesale/useWholesaleRepairForm.js', "import { useState } from 'react';\n" + hookBody);

let orchestrator = `import React from 'react';
import { Box, Paper, Tabs, Tab, Button, CircularProgress, Typography } from '@mui/material';
import { useWholesaleRepairForm } from '../../../hooks/wholesale/useWholesaleRepairForm';
import ClientInfoSection from './form-sections/ClientInfoSection';
import RepairDetailsSection from './form-sections/RepairDetailsSection';
import PhotoUploadSection from './form-sections/PhotoUploadSection';

export default function WholesaleRepairForm(props) {
    const { formData, errors, isSubmitting, activeTab, setActiveTab, handleInputChange, handlePhotoUpload, removePhoto, handleSubmit } = useWholesaleRepairForm(props);

    function a11yProps(index) {
        return {
            id: \`simple-tab-\${index}\`,
            'aria-controls': \`simple-tabpanel-\${index}\`,
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
`;

fs.writeFileSync('src/app/components/wholesale/WholesaleRepairForm.js', orchestrator);

console.log('Wholesale Split Done!');
