import React from 'react';
import { Container, Box, Typography, Alert, CircularProgress } from '@mui/material';
import { useCadRequests } from '@/hooks/cad-requests/useCadRequests.js';
import CADRequestList from '@/components/cad-requests/CADRequestList.js';
import CADRequestDetailsDrawer from '@/components/cad-requests/CADRequestDetailsDrawer.js';
import CADApproveDialog from '@/components/cad-requests/CADApproveDialog.js';

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
