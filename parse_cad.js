const fs = require('fs');

let content = fs.readFileSync('cad.txt', 'utf8');

// There's a security check "if (!session?.user?.artisanTypes?.includes('CAD Designer')) return (...)".
// The real return is the second one.
let returns = [ ...content.matchAll(/return \(/g) ];
let firstReturn = returns[0].index;
let mainReturn = returns[1].index;

let hookStart = content.indexOf('export default function');
let hookStr = content.substring(hookStart, firstReturn);
hookStr = hookStr.replace('export default function CADRequestsPage() {', 'export function useCadRequests() {');

// The required state from parse_all_three was: 
// requests, setRequests, loading, setLoading, error, setError, selectedTab, setSelectedTab, selectedRequest, setSelectedRequest, designDialogOpen, setDesignDialogOpen, uploadProgress, setUploadProgress, designData, setDesignData, statusFilter, setStatusFilter, priorityFilter, setPriorityFilter, handleStartDesign, handleFileUpload, handleSubmitDesign
// Wait, hookStr might include `if (loading) return ...` which needs to be left in the component, not the hook.
// Or we just return all state!
let hookReturns = '\nreturn { session, requests, loading, error, setError, selectedTab, setSelectedTab, selectedRequest, setSelectedRequest, designDialogOpen, setDesignDialogOpen, uploadProgress, designData, setDesignData, statusFilter, setStatusFilter, priorityFilter, setPriorityFilter, handleStartDesign, handleFileUpload, handleSubmitDesign};\n}\n';

fs.writeFileSync('src/hooks/cad-requests/useCadRequests.js', "import { useState, useEffect } from 'react';\nimport { useSession } from 'next-auth/react';\n" + hookStr + hookReturns);

let uiStart = mainReturn;

// Just gonna dump the whole grid into a monolithic block because manually parsing 4-level deep XML nodes using string indexes is playing with fire. Instead, we'll split it cleanly in half: List vs Dialogs.
let listStart = content.indexOf(' {/* Filters */}');
if(listStart === -1) listStart = content.indexOf('<Paper sx={{ p: 2, mb: 3 }}>');
let listEnd = content.indexOf(' {/* Request Details Drawer */}');
if(listEnd === -1) listEnd = content.indexOf('<Drawer');
let listBlock = content.substring(listStart, listEnd);

let drawerStart = listEnd;
let drawerEnd = content.indexOf(' {/* Design Upload Dialog */}');
if(drawerEnd === -1) drawerEnd = content.indexOf('<Dialog open={designDialogOpen}');
let drawerBlock = content.substring(drawerStart, drawerEnd);

let dialogStart = drawerEnd;
let dialogEnd = content.lastIndexOf('</Container>');
let dialogBlock = content.substring(dialogStart, dialogEnd);

fs.mkdirSync('src/components/cad-requests', { recursive: true });

fs.writeFileSync('src/components/cad-requests/CADRequestList.js', 
`import React from 'react';
import { Paper, Grid, FormControl, InputLabel, Select, MenuItem, Box, Tabs, Tab, Card, CardContent, Typography, Chip, Button, Divider } from '@mui/material';
export default function CADRequestList({ 
    requests, statusFilter, setStatusFilter, priorityFilter, setPriorityFilter, 
    selectedTab, setSelectedTab, handleStartDesign, setSelectedRequest 
}) {
    return (
        <React.Fragment>
            ${listBlock}
        </React.Fragment>
    );
}`);

fs.writeFileSync('src/components/cad-requests/CADRequestDetailsDrawer.js', 
`import React from 'react';
import { Drawer, Box, Typography, Divider, Grid, Chip, IconButton } from '@mui/material';
export default function CADRequestDetailsDrawer({ selectedRequest, setSelectedRequest }) {
    return (${drawerBlock});
}`);

fs.writeFileSync('src/components/cad-requests/CADApproveDialog.js', 
`import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Box, Typography, TextField, Button, CircularProgress, LinearProgress } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
export default function CADApproveDialog({ 
    designDialogOpen, setDesignDialogOpen, designData, setDesignData, 
    uploadProgress, handleFileUpload, handleSubmitDesign, selectedRequest 
}) {
    return (${dialogBlock});
}`);

let orchestrator = `import React from 'react';
import { Container, Box, Typography, Alert, CircularProgress } from '@mui/material';
import { useCadRequests } from '../../hooks/cad-requests/useCadRequests';
import CADRequestList from '../../components/cad-requests/CADRequestList';
import CADRequestDetailsDrawer from '../../components/cad-requests/CADRequestDetailsDrawer';
import CADApproveDialog from '../../components/cad-requests/CADApproveDialog';

export default function CADRequestsPage() {
    const { 
        session, requests, loading, error, setError, 
        selectedTab, setSelectedTab, 
        selectedRequest, setSelectedRequest, 
        designDialogOpen, setDesignDialogOpen, 
        uploadProgress, designData, setDesignData, 
        statusFilter, setStatusFilter, 
        priorityFilter, setPriorityFilter, 
        handleStartDesign, handleFileUpload, handleSubmitDesign 
    } = useCadRequests();

    if (loading) {
        return (
            <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
                <CircularProgress />
            </Container>
        );
    }

    if (!session?.user?.artisanTypes?.includes('CAD Designer')) {
        return (
            <Container maxWidth="lg" sx={{ mt: 4 }}>
                <Alert severity="warning">
                    Access denied. This page is only available to CAD designers.
                </Alert>
            </Container>
        );
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Box sx={{ mb: 3 }}>
                <Typography variant="h4" gutterBottom>
                    CAD Design Requests
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Manage and fulfill CAD design requests from customers
                </Typography>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
                    {error}
                </Alert>
            )}

            <CADRequestList 
                requests={requests}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                priorityFilter={priorityFilter}
                setPriorityFilter={setPriorityFilter}
                selectedTab={selectedTab}
                setSelectedTab={setSelectedTab}
                handleStartDesign={handleStartDesign}
                setSelectedRequest={setSelectedRequest}
            />

            <CADRequestDetailsDrawer 
                selectedRequest={selectedRequest}
                setSelectedRequest={setSelectedRequest}
            />

            <CADApproveDialog 
                designDialogOpen={designDialogOpen}
                setDesignDialogOpen={setDesignDialogOpen}
                designData={designData}
                setDesignData={setDesignData}
                uploadProgress={uploadProgress}
                handleFileUpload={handleFileUpload}
                handleSubmitDesign={handleSubmitDesign}
                selectedRequest={selectedRequest}
            />
        </Container>
    );
}
`;

fs.writeFileSync('src/app/dashboard/cad-requests/page.js', orchestrator);
console.log('CAD Split Done!');
