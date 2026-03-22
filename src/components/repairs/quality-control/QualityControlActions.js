import React from 'react';
import { Box, Button, CircularProgress } from '@mui/material';

export default function QualityControlActions({ repair, handleStatusUpdate, isUpdating }) {
    // using generic buttons since exact states depend on hook
    return "use client";
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
            </Box>;
}