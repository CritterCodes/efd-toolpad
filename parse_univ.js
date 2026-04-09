const fs = require('fs');
let content = fs.readFileSync('univ.txt', 'utf8');

let hookStart = content.indexOf('export default function UniversalTaskBuilder');
let returnStart = content.indexOf('return (', hookStart);

let hookCode = content.substring(hookStart, returnStart);
hookCode = hookCode.replace('export default function UniversalTaskBuilder({', 'export function useUniversalTaskBuilder({');

// Find end of destructuring inside hookCode or create it based on vars
let returnObj = "    return { activeTab, setActiveTab, taskDetails, setTaskDetails, selectedMetals, setSelectedMetals, materials, setMaterials, handleTabChange, handleTaskDetailsChange, handleMetalToggle, handleMaterialChange, calculatePrice };\n";

hookCode += returnObj;

// Now for tabs. We search for value={0}
let tab0Start = content.indexOf('<Box sx={{ p: 3 }}>', content.indexOf('value={0}'));
let tab0End = content.indexOf('</TabPanel>', tab0Start);
let tab0 = content.substring(tab0Start, tab0End);

let tab1Start = content.indexOf('<Box sx={{ p: 3 }}>', content.indexOf('value={1}'));
let tab1End = content.indexOf('</TabPanel>', tab1Start);
let tab1 = content.substring(tab1Start, tab1End);

let tab2Start = content.indexOf('<Box sx={{ p: 3 }}>', content.indexOf('value={2}'));
let tab2End = content.indexOf('</TabPanel>', tab2Start);
let tab2 = content.substring(tab2Start, tab2End);

fs.mkdirSync('src/hooks/tasks', { recursive: true });
fs.writeFileSync('src/hooks/tasks/useUniversalTaskBuilder.js', `import { useState, useEffect } from 'react';\n${hookCode}`);

fs.mkdirSync('src/components/tasks/builder-sections', { recursive: true });
fs.writeFileSync('src/components/tasks/builder-sections/GeneralDetailsTab.js', 
`import React from 'react';
import { Box, Grid, TextField, FormControl, InputLabel, Select, MenuItem, Typography } from '@mui/material';
export default function GeneralDetailsTab({ taskDetails, handleTaskDetailsChange }) {
    return ${tab0};
}`);

fs.writeFileSync('src/components/tasks/builder-sections/MaterialsTab.js', 
`import React from 'react';
import { Box, Typography, Grid, FormControlLabel, Checkbox } from '@mui/material';
export default function MaterialsTab({ selectedMetals, handleMetalToggle, materials, handleMaterialChange }) {
    return ${tab1};
}`);

fs.writeFileSync('src/components/tasks/builder-sections/PricingCalculationsTab.js', 
`import React from 'react';
import { Box, Typography, Grid, Paper, Divider } from '@mui/material';
export default function PricingCalculationsTab({ calculatePrice }) {
    return ${tab2};
}`);

let orchestrator = `import React from 'react';
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
`;

fs.writeFileSync('src/components/tasks/UniversalTaskBuilder.js', orchestrator);
console.log('Universal Done!');
