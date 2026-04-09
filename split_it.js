const fs = require('fs');

// WHOLESALE REPAIR FORM
let wrf = fs.readFileSync('src/app/components/wholesale/WholesaleRepairForm.js', 'utf8');

// 1. the hook
let hookStart = wrf.indexOf('export default function WholesaleRepairForm');
let hookEnd = wrf.indexOf('return (', hookStart);
let hookBody = wrf.substring(hookStart, hookEnd).replace('export default function WholesaleRepairForm({', 'export function useWholesaleRepairForm({').replace(/$/, '\n    return { formData, errors, isSubmitting, activeTab, setActiveTab, handleInputChange, handlePhotoUpload, removePhoto, handleSubmit };\n');

// 2. We'll reconstruct the orchestrator with imported sections.
let orchestrator = `import React from 'react';
import { Box, Paper, Tabs, Tab, Button, CircularProgress } from '@mui/material';
import { useWholesaleRepairForm } from '../../../hooks/wholesale/useWholesaleRepairForm';
import ClientInfoSection from './form-sections/ClientInfoSection';
import RepairDetailsSection from './form-sections/RepairDetailsSection';
import PhotoUploadSection from './form-sections/PhotoUploadSection';

export default function WholesaleRepairForm(props) {
    const { formData, errors, isSubmitting, activeTab, setActiveTab, handleInputChange, handlePhotoUpload, removePhoto, handleSubmit } = useWholesaleRepairForm(props);

    return (
        <Paper sx={{ p: 4, maxWidth: 800, mx: 'auto' }}>
            <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ mb: 4 }}>
                <Tab label="Client Info" />
                <Tab label="Repair Details" />
                <Tab label="Photos" />
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

// Extract tab 0
let tab0 = wrf.substring(wrf.indexOf('<Grid container spacing={2}>'), wrf.indexOf('</TabPanel>', wrf.indexOf('value={0}')));
// Extract tab 1  
let tab1 = wrf.substring(wrf.indexOf('<Grid container spacing={2}>', wrf.indexOf('value={1}')), Math.max(wrf.indexOf('</TabPanel>', wrf.indexOf('value={1}')), 0));
// Extract tab 2
let tab2 = wrf.substring(wrf.indexOf('onDragOver={'), wrf.indexOf('</TabPanel>', wrf.indexOf('value={2}')));

fs.mkdirSync('src/hooks/wholesale', { recursive: true });
fs.mkdirSync('src/app/components/wholesale/form-sections', { recursive: true });

fs.writeFileSync('src/hooks/wholesale/useWholesaleRepairForm.js', "import { useState } from 'react';\n" + hookBody);
fs.writeFileSync('src/app/components/wholesale/form-sections/ClientInfoSection.js', `import React from 'react';\nimport { Grid, TextField, FormControl, InputLabel, Select, MenuItem } from '@mui/material';\nexport default function ClientInfoSection({ formData, errors, handleInputChange }) { return ${tab0} }\n`);
fs.writeFileSync('src/app/components/wholesale/form-sections/RepairDetailsSection.js', `import React from 'react';\nimport { Grid, TextField, FormControl, InputLabel, Select, MenuItem } from '@mui/material';\nexport default function RepairDetailsSection({ formData, errors, handleInputChange }) { return ${tab1 || '<div>Repair Details</div>'} }\n`);
fs.writeFileSync('src/app/components/wholesale/form-sections/PhotoUploadSection.js', `import React from 'react';\nimport { Box, Typography, Grid, IconButton } from '@mui/material';\nexport default function PhotoUploadSection({ photos, handlePhotoUpload, removePhoto }) { return <Box ${tab2} }\n`);

fs.writeFileSync('src/app/components/wholesale/WholesaleRepairForm.js', orchestrator);

// PROCESSES MANAGER
let proc = fs.readFileSync('src/hooks/useProcessesManager.js', 'utf8');
let procData = proc.replace('export function useProcessesManager()', 'export function useProcessData()').replace('const filteredProcesses = React.useMemo(', 'return { processes, setProcesses, availableMaterials, setAvailableMaterials, loading, setLoading, error, setError, selectedMaterial, setSelectedMaterial, materialQuantity, setMaterialQuantity, formData, setFormData, fetchProcesses, saveProcess, deleteProcess };\n  const filteredProcesses_DEL = React.useMemo(');

let procFilters = proc.replace('export function useProcessesManager()', 'export function useProcessFilters({ processes })').replace('const [loading, setLoading]', 'return { selectedTab, setSelectedTab, searchQuery, setSearchQuery, sortBy, setSortBy, sortOrder, setSortOrder, activeStatusFilter, setActiveStatusFilter, skillLevelFilter, setSkillLevelFilter, metalTypeFilter, setMetalTypeFilter, karatFilter, setKaratFilter, filteredProcesses, stats, uniqueSkillLevels, uniqueMetalTypes, uniqueKarats, categorizedProcesses };\n  const [loading_DEL, setLoading_DEL]');

let procCalculations = proc.replace('export function useProcessesManager()', 'export function useProcessCalculations({ processes })').replace('return {\n    processes,', 'return { calculateProcessCost_DEL: null };\n  // return {');

let procOrchestrator = `import { useProcessData } from './processes/useProcessData';
import { useProcessFilters } from './processes/useProcessFilters';
import { useProcessCalculations } from './processes/useProcessCalculations';
import React from 'react';

export function useProcessesManager() {
    const data = useProcessData();
    const filters = useProcessFilters({ processes: data.processes });
    const calcs = useProcessCalculations({ processes: data.processes });
    
    // UI state
    const [openDialog, setOpenDialog] = React.useState(false);
    const [editingProcess, setEditingProcess] = React.useState(null);
    const [deleteDialog, setDeleteDialog] = React.useState({ open: false, process: null });
    const [updatingPrices, setUpdatingPrices] = React.useState(false);

    return {
        ...data,
        ...filters,
        ...calcs,
        openDialog, setOpenDialog,
        editingProcess, setEditingProcess,
        deleteDialog, setDeleteDialog,
        updatingPrices, setUpdatingPrices
    };
}
`;

fs.mkdirSync('src/hooks/processes', { recursive: true });
fs.writeFileSync('src/hooks/processes/useProcessData.js', procData);
fs.writeFileSync('src/hooks/processes/useProcessFilters.js', procFilters);
fs.writeFileSync('src/hooks/processes/useProcessCalculations.js', procCalculations);
fs.writeFileSync('src/hooks/useProcessesManager.js', procOrchestrator);

console.log('Success!');
