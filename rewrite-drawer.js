const fs = require('fs');

const oldCode = fs.readFileSync('dae8c56-cad.js', 'utf8');

// Find the renderDetailsDrawer function body
const startSearch = 'const renderDetailsDrawer = () => {';
const startIndex = oldCode.indexOf(startSearch);

if (startIndex !== -1) {
    const fnStart = oldCode.indexOf('return (', startIndex);
    
    // Naively extract everything from 'return (' to the end of that Drawer component.
    // It's a bit tricky to parse curly braces, but we know it ends with `</Drawer>` approx.
    const endDrawer = oldCode.indexOf('</Drawer>', fnStart);
    if (fnStart !== -1 && endDrawer !== -1) {
        const drawerCode = oldCode.substring(fnStart + 8, endDrawer + 9); // After "return (" to </Drawer>
        
        const componentCode = `import React from 'react';
import { Drawer, Box, Typography, Divider, Grid, Chip, IconButton, Button, Paper } from '@mui/material';
import { Close as CloseIcon, Download as DownloadIcon, Visibility as ViewIcon } from '@mui/icons-material';

export default function CADRequestDetailsDrawer({ 
    selectedRequest, 
    setSelectedRequest, 
    handleStartDesign, 
    getStatusColor, 
    getPriorityColor,
    formatCurrency
}) {
    if (!selectedRequest) return null;
    return (
        ${drawerCode}
    );
}
`;
        fs.writeFileSync('src/components/cad-requests/CADRequestDetailsDrawer.js', componentCode);
        console.log('Done rewriting CADRequestDetailsDrawer.js');
    } else {
        console.log('Could not find boundaries');
    }
} else {
    // maybe it does not use renderDetailsDrawer? Let me check the file content.
    console.log('Could not find start index');
}
