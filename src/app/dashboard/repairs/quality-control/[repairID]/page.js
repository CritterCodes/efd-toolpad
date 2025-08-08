"use client";
import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Grid,
    Button,
    Breadcrumbs,
    Link,
    Snackbar,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    CircularProgress,
    Alert,
    Fab
} from '@mui/material';
import {
    Save as SaveIcon,
    ArrowBack as BackIcon,
    NavigateNext as NextIcon,
    NavigateBefore as PrevIcon
} from '@mui/icons-material';
import { useParams, useRouter } from 'next/navigation';
import { useRepairs } from '@/app/context/repairs.context';

// Custom hook
import { useQualityControl } from '../hooks/useQualityControl';

// Components
import QcRepairSummary from '../components/QcRepairSummary';
import QcDecisionForm from '../components/QcDecisionForm';
import QcPhotoUploader from '../components/QcPhotoUploader';

// Utils
import { completeQualityControl, uploadQcPhoto } from '../utils/qcUtils';

const QualityControlDetailPage = () => {
    const { repairID } = useParams();
    const router = useRouter();
    const { repairs, setRepairs } = useRepairs();
    
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

    const {
        qcDecision,
        setQcDecision,
        inspector,
        setInspector,
        qcNotes,
        setQcNotes,
        issueCategory,
        setIssueCategory,
        severityLevel,
        setSeverityLevel,
        photos,
        isSubmitting,
        setIsSubmitting,
        validationErrors,
        snackbarOpen,
        snackbarMessage,
        snackbarSeverity,
        showSnackbar,
        closeSnackbar,
        addPhoto,
        removePhoto,
        updatePhotoCaption,
        validateQcForm,
        resetForm,
        getQcFormData
    } = useQualityControl();

    // Find the current repair
    const repair = repairs.find(r => r.repairID === repairID);
    
    // Get all repairs currently in QC for navigation
    const qcRepairs = repairs.filter(r => r.status === "QUALITY CONTROL");
    const currentIndex = qcRepairs.findIndex(r => r.repairID === repairID);
    const hasNext = currentIndex < qcRepairs.length - 1;
    const hasPrevious = currentIndex > 0;

    // Check if repair exists and is in QC
    useEffect(() => {
        if (!repair) {
            showSnackbar('Repair not found', 'error');
            router.push('/dashboard/repairs/quality-control');
            return;
        }

        if (repair.status !== 'QUALITY CONTROL') {
            showSnackbar('This repair is not in quality control', 'warning');
            router.push('/dashboard/repairs/quality-control');
            return;
        }
    }, [repair, router, showSnackbar]);

    const handlePhotoUpload = async (photoData) => {
        try {
            // For now, we'll use the preview URL directly
            // In production, you'd upload to your file storage service
            addPhoto(photoData);
            showSnackbar('Photo added successfully', 'success');
        } catch (error) {
            showSnackbar('Failed to add photo: ' + error.message, 'error');
        }
    };

    const handleSubmitQc = () => {
        if (!validateQcForm()) {
            showSnackbar('Please fix the validation errors', 'error');
            return;
        }
        setConfirmDialogOpen(true);
    };

    const handleConfirmSubmit = async () => {
        setConfirmDialogOpen(false);
        setIsSubmitting(true);

        try {
            const qcData = getQcFormData();
            const result = await completeQualityControl(repairID, qcData);

            if (result.success) {
                // Update the repair in context
                setRepairs(prevRepairs => 
                    prevRepairs.map(r => 
                        r.repairID === repairID 
                            ? { ...r, status: result.newStatus, ...qcData }
                            : r
                    )
                );

                showSnackbar(result.message, 'success');
                
                // Navigate to next repair or back to QC queue
                if (hasNext) {
                    const nextRepair = qcRepairs[currentIndex + 1];
                    router.push(`/dashboard/repairs/quality-control/${nextRepair.repairID}`);
                } else {
                    router.push('/dashboard/repairs/quality-control');
                }
                
                resetForm();
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            showSnackbar('Failed to complete QC: ' + error.message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleNavigation = (direction) => {
        const targetIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
        const targetRepair = qcRepairs[targetIndex];
        if (targetRepair) {
            router.push(`/dashboard/repairs/quality-control/${targetRepair.repairID}`);
        }
    };

    if (!repair) {
        return (
            <Box 
                sx={{
                    minHeight: "100vh",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    textAlign: "center",
                    padding: "16px"
                }}
            >
                <CircularProgress sx={{ mb: 2 }} />
                <Typography variant="h6">Loading repair details...</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ padding: '20px', position: 'relative' }}>
            {/* Breadcrumbs */}
            <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
                <Link 
                    underline="hover" 
                    color="inherit" 
                    onClick={() => router.push('/dashboard')} 
                    sx={{ cursor: 'pointer' }}
                >
                    Dashboard
                </Link>
                <Link 
                    underline="hover" 
                    color="inherit" 
                    onClick={() => router.push('/dashboard/repairs')} 
                    sx={{ cursor: 'pointer' }}
                >
                    Repairs
                </Link>
                <Link 
                    underline="hover" 
                    color="inherit" 
                    onClick={() => router.push('/dashboard/repairs/quality-control')} 
                    sx={{ cursor: 'pointer' }}
                >
                    Quality Control
                </Link>
                <Typography color="text.primary">{repair.repairID}</Typography>
            </Breadcrumbs>

            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                        Quality Control - {repair.repairID}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {currentIndex + 1} of {qcRepairs.length} repairs in QC queue
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                        variant="outlined"
                        startIcon={<BackIcon />}
                        onClick={() => router.push('/dashboard/repairs/quality-control')}
                    >
                        Back to Queue
                    </Button>
                </Box>
            </Box>

            {/* Navigation between QC items */}
            {qcRepairs.length > 1 && (
                <Alert severity="info" sx={{ mb: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="body2">
                            Use navigation buttons to move between QC items without losing progress
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button
                                size="small"
                                startIcon={<PrevIcon />}
                                onClick={() => handleNavigation('previous')}
                                disabled={!hasPrevious}
                            >
                                Previous
                            </Button>
                            <Button
                                size="small"
                                endIcon={<NextIcon />}
                                onClick={() => handleNavigation('next')}
                                disabled={!hasNext}
                            >
                                Next
                            </Button>
                        </Box>
                    </Box>
                </Alert>
            )}

            {/* Main Content */}
            <Grid container spacing={3}>
                {/* Left Column - Repair Summary */}
                <Grid item xs={12} lg={5}>
                    <QcRepairSummary repair={repair} />
                </Grid>

                {/* Right Column - QC Form */}
                <Grid item xs={12} lg={7}>
                    <Grid container spacing={3}>
                        {/* Photo Upload */}
                        <Grid item xs={12}>
                            <QcPhotoUploader
                                photos={photos}
                                onAddPhoto={handlePhotoUpload}
                                onRemovePhoto={removePhoto}
                                onUpdateCaption={updatePhotoCaption}
                                disabled={isSubmitting}
                            />
                        </Grid>

                        {/* QC Decision Form */}
                        <Grid item xs={12}>
                            <QcDecisionForm
                                qcDecision={qcDecision}
                                onDecisionChange={setQcDecision}
                                inspector={inspector}
                                onInspectorChange={setInspector}
                                qcNotes={qcNotes}
                                onNotesChange={setQcNotes}
                                issueCategory={issueCategory}
                                onIssueCategoryChange={setIssueCategory}
                                severityLevel={severityLevel}
                                onSeverityChange={setSeverityLevel}
                                validationErrors={validationErrors}
                                disabled={isSubmitting}
                            />
                        </Grid>

                        {/* Submit Button */}
                        <Grid item xs={12}>
                            <Box sx={{ textAlign: 'center' }}>
                                <Button
                                    variant="contained"
                                    size="large"
                                    startIcon={isSubmitting ? <CircularProgress size={20} /> : <SaveIcon />}
                                    onClick={handleSubmitQc}
                                    disabled={isSubmitting}
                                    sx={{ minWidth: 200 }}
                                >
                                    {isSubmitting ? 'Processing...' : 'Complete Quality Control'}
                                </Button>
                            </Box>
                        </Grid>
                    </Grid>
                </Grid>
            </Grid>

            {/* Confirmation Dialog */}
            <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)}>
                <DialogTitle>Confirm Quality Control Decision</DialogTitle>
                <DialogContent>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                        Are you sure you want to complete quality control for repair <strong>{repair.repairID}</strong>?
                    </Typography>
                    <Alert 
                        severity={qcDecision === 'APPROVE' ? 'success' : 'warning'}
                        sx={{ mb: 2 }}
                    >
                        <Typography variant="body2">
                            <strong>Decision:</strong> {qcDecision === 'APPROVE' ? 'APPROVED' : 'REJECTED'}
                        </Typography>
                        <Typography variant="body2">
                            <strong>Next Status:</strong> {qcDecision === 'APPROVE' ? 'Ready for Pick-up' : 'Ready for Work'}
                        </Typography>
                        <Typography variant="body2">
                            <strong>Inspector:</strong> {inspector}
                        </Typography>
                    </Alert>
                    <Typography variant="body2" color="text.secondary">
                        This action cannot be undone. The repair status will be updated immediately.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmDialogOpen(false)}>
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleConfirmSubmit} 
                        variant="contained"
                        color={qcDecision === 'APPROVE' ? 'success' : 'warning'}
                    >
                        Confirm {qcDecision === 'APPROVE' ? 'Approval' : 'Rejection'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar Notifications */}
            <Snackbar
                open={snackbarOpen}
                autoHideDuration={6000}
                onClose={closeSnackbar}
                message={snackbarMessage}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
                ContentProps={{
                    sx: {
                        backgroundColor:
                            snackbarSeverity === "success"
                                ? "green"
                                : snackbarSeverity === "error"
                                ? "red"
                                : "orange",
                        color: "white",
                        fontWeight: "bold",
                    },
                }}
            />
        </Box>
    );
};

export default QualityControlDetailPage;
