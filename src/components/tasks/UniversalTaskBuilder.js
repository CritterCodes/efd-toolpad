import React from 'react';
import { Box, Tabs, Tab, Button } from '@mui/material';
import { useUniversalTaskBuilder } from '../../hooks/tasks/useUniversalTaskBuilder';
import GeneralDetailsTab from './builder-sections/GeneralDetailsTab';
import MaterialsTab from './builder-sections/MaterialsTab';
import PricingCalculationsTab from './builder-sections/PricingCalculationsTab';

export default function UniversalTaskBuilder(props) {
    const { 
        activeTab, setActiveTab, taskDetails, handleTaskDetailsChange, 
        selectedMetals, handleMetalToggle, materials, handleMaterialChange, calculatePrice 
    } = useUniversalTaskBuilder(props);

    return (
        <Box sx={{ width: '100%', bgcolor: 'background.paper' }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
                    <Tab label="General Details" />
                    <Tab label="Materials & Metals" />
                    <Tab label="Pricing & Labor" />
                </Tabs>
            </Box>
            
            {activeTab === 0 && (
                <GeneralDetailsTab 
                    taskDetails={taskDetails} 
                    handleTaskDetailsChange={handleTaskDetailsChange} 
                />
            )}
            
            {activeTab === 1 && (
                <MaterialsTab 
                    selectedMetals={selectedMetals} 
                    handleMetalToggle={handleMetalToggle} 
                    materials={materials} 
                    handleMaterialChange={handleMaterialChange} 
                />
            )}
            
            {activeTab === 2 && (
                <PricingCalculationsTab 
                    calculatePrice={calculatePrice} 
                />
            )}
            
            <Box sx={{ p: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                <Button onClick={props.onCancel}>Cancel</Button>
                <Button variant="contained" onClick={() => props.onSave({ taskDetails, selectedMetals, materials })}>
                    Save Task
                </Button>
            </Box>
        </Box>
    );
}
