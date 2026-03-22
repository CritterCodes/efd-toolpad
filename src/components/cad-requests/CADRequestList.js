import React from 'react';
import { Paper, Grid, FormControl, InputLabel, Select, MenuItem, Box, Tabs, Tab, Card, CardContent, Typography, Chip, Button, Divider } from '@mui/material';
export default function CADRequestList({ 
    requests, statusFilter, setStatusFilter, priorityFilter, setPriorityFilter, 
    selectedTab, setSelectedTab, handleStartDesign, setSelectedRequest 
}) {
    return (
        <React.Fragment>
            'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
    Container, 
    Typography, 
    Card, 
    CardContent, 
    Grid, 
    Chip, 
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Box,
    CircularProgress,
    Alert,
    Tab,
    Tabs,
    IconButton,
    Tooltip,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Avatar,
    Divider,
    Paper
} from '@mui/material';
import { 
    Upload as UploadIcon, 
    Download as DownloadIcon,
    Visibility as ViewIcon,
    Edit as EditIcon,
    Check as ApproveIcon,
    Close as RejectIcon,
    AttachMoney as PriceIcon,
    Assessment as VolumeIcon
} from '@mui/icons-material';

export default function CADRequestsPage() {
    const { data: session } = useSession();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedTab, setSelectedTab] = useState(0);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [designDialogOpen, setDesignDialogOpen] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    
    // Design creation state
    const [designData, setDesignData] = useState({
        title: '',
        description: '',
        stlFile: null,
        glbFile: null,
        printVolume: '',
        estimatedTime: '',
        notes: '',
        status: 'in_progress'
    });

    // Filter states
    const [statusFilter, setStatusFilter] = useState('all');
    const [priorityFilter, setPriorityFilter] = useState('all');

    useEffect(() => {
        if (session?.user?.artisanTypes?.includes('CAD Designer')) {
            fetchCADRequests();
        }
    }, [session]);

    const fetchCADRequests = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/cad-requests/for-designers');
            
            if (!response.ok) {
                throw new Error('Failed to fetch CAD requests');
            }
            
            const data = await response.json();
            setRequests(data.requests || []);
        } catch (err) {
            console.error('Error fetching CAD requests:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleStartDesign = (request) => {
        setSelectedRequest(request);
        setDesignData({
            title: `Design for ${request.mountingType} - ${request.gemstoneTitle}`,
            description: request.styleDescription || '',
            stlFile: null,
            glbFile: null,
            printVolume: '',
            estimatedTime: '',
            notes: '',
            status: 'in_progress'
        });
        setDesignDialogOpen(true);
    };

    const handleFileUpload = (event, fileType) => {
        const file = event.target.files[0];
        if (file) {
            setDesignData(prev => ({
                ...prev,
                [fileType]: file
            }));
        }
    };

    const handleSubmitDesign = async () => {
        try {
            const formData = new FormData();
            
            // Add design data
            Object.keys(designData).forEach(key => {
                if (designData[key] !== null && key !== 'stlFile' && key !== 'glbFile') {
                    formData.append(key, designData[key]);
                }
            });
            
            // Add files
            if (designData.stlFile) {
                formData.append('stlFile', designData.stlFile);
            }
            if (designData.glbFile) {
                formData.append('glbFile', designData.glbFile);
            }
            
            // Add request and gemstone data
            formData.append('cadRequestId', selectedRequest._id);
            formData.append('gemstoneId', selectedRequest.gemstoneId);
            formData.append('designerId', session.user.userID);
            
            const response = await fetch('/api/designs/create', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error('Failed to create design');
            }
            
            const result = await response.json();
            
            // Update the request status
            await updateRequestStatus(selectedRequest._id, 'design_submitted');
            
            setDesignDialogOpen(false);
            setSelectedRequest(null);
            fetchCADRequests(); // Refresh the list
            
        } catch (err) {
            console.error('Error submitting design:', err);
            setError(err.message);
        }
    };

    const updateRequestStatus = async (requestId, status) => {
        try {
            const response = await fetch(`/api/cad-requests/${requestId}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status })
            });
            
            if (!response.ok) {
                throw new Error('Failed to update request status');
            }
            
            fetchCADRequests(); // Refresh the list
        } catch (err) {
            console.error('Error updating request status:', err);
            setError(err.message);
        }
    };

    const getFilteredRequests = () => {
        return requests.filter(request => {
            const statusMatch = statusFilter === 'all' || request.status === statusFilter;
            const priorityMatch = priorityFilter === 'all' || request.priority === priorityFilter;
            return statusMatch && priorityMatch;
        });
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return 'warning';
            case 'assigned': return 'info';
            case 'in_progress': return 'primary';
            case 'design_submitted': return 'success';
            case 'approved': return 'success';
            case 'rejected': return 'error';
            default: return 'default';
        }
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'high': return 'error';
            case 'medium': return 'warning';
            case 'low': return 'success';
            default: return 'default';
        }
    };

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

           
        </React.Fragment>
    );
}