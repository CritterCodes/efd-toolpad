const fs = require('fs');

let content = fs.readFileSync('qc.txt', 'utf8');

// extracting from page.js
let hookCode = content.substring(
    content.indexOf('export default function QualityControlPage'),
    content.indexOf('return (')
).replace('export default function QualityControlPage({ params }) {', 'export function useQualityControl({ params }) {');

let returns = "    return { repair, loading, error, validationNotes, setValidationNotes, handleStatusUpdate, handleValidationChange, checklist, setChecklist };\n";
hookCode += returns;

let checklistStart = content.indexOf('<Paper sx={{ p: 3, mb: 3 }}>', content.indexOf('Quality Control Checklist'));
let checklistEnd = content.indexOf('</Paper>', checklistStart) + 8;
let checklistCode = content.substring(checklistStart, checklistEnd);

let actionsStart = content.indexOf('<Paper sx={{ p: 3, mb: 3 }}>', content.indexOf('Quality Control Notes'));
let actionsEnd = content.indexOf('</Paper>', actionsStart) + 8; // Actually Notes
let notesCode = content.substring(actionsStart, actionsEnd);

let submitStart = content.indexOf('<Box sx={{ display: \'flex\', gap: 2');
let submitEnd = content.indexOf('</Box>', submitStart) + 6;
let submitCode = content.substring(submitStart, submitEnd);

fs.mkdirSync('src/hooks/repairs', { recursive: true });
fs.writeFileSync('src/hooks/repairs/useQualityControl.js', `import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
\n${hookCode}`);

fs.mkdirSync('src/components/repairs/quality-control', { recursive: true });

fs.writeFileSync('src/components/repairs/quality-control/QualityControlChecklist.js', 
`import React from 'react';
import { Paper, Typography, FormGroup, FormControlLabel, Checkbox, Divider } from '@mui/material';

export default function QualityControlChecklist({ checklist, handleValidationChange }) {
    return ${checklistCode};
}`);

fs.writeFileSync('src/components/repairs/quality-control/ReviewNotes.js', 
`import React from 'react';
import { Paper, Typography, TextField } from '@mui/material';

export default function ReviewNotes({ validationNotes, setValidationNotes }) {
    return ${notesCode};
}`);

fs.writeFileSync('src/components/repairs/quality-control/QualityControlActions.js', 
`import React from 'react';
import { Box, Button, CircularProgress } from '@mui/material';

export default function QualityControlActions({ repair, handleStatusUpdate, isUpdating }) {
    // using generic buttons since exact states depend on hook
    return ${submitCode};
}`);

let page = `import React from 'react';
import { Box, Typography, Alert, CircularProgress, Container } from '@mui/material';
import { useQualityControl } from '../../../../../hooks/repairs/useQualityControl';
import QualityControlChecklist from '../../../../../components/repairs/quality-control/QualityControlChecklist';
import ReviewNotes from '../../../../../components/repairs/quality-control/ReviewNotes';
import QualityControlActions from '../../../../../components/repairs/quality-control/QualityControlActions';

export default function QualityControlPage({ params }) {
    const { 
        repair, loading, error, 
        validationNotes, setValidationNotes, 
        handleStatusUpdate, handleValidationChange, 
        checklist 
    } = useQualityControl({ params });

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
    if (error) return <Alert severity="error" sx={{ m: 3 }}>{error}</Alert>;
    if (!repair) return <Alert severity="warning" sx={{ m: 3 }}>Repair not found.</Alert>;

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Typography variant="h4" sx={{ mb: 4 }}>Quality Control Review</Typography>
            
            <Box sx={{ display: 'grid', gap: 4 }}>
                <QualityControlChecklist 
                    checklist={checklist} 
                    handleValidationChange={handleValidationChange} 
                />
                
                <ReviewNotes 
                    validationNotes={validationNotes} 
                    setValidationNotes={setValidationNotes} 
                />
                
                <QualityControlActions 
                    repair={repair} 
                    handleStatusUpdate={handleStatusUpdate} 
                />
            </Box>
        </Container>
    );
}
`;

fs.writeFileSync('src/app/dashboard/repairs/quality-control/[repairID]/page.js', page);
console.log('QC Refactor Done!');
