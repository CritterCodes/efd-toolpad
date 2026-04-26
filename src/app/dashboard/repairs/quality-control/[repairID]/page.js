"use client";
import React, { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Grid,
    Snackbar,
    Typography,
} from '@mui/material';
import { useRepairs } from '@/app/context/repairs.context';
import { useQualityControl } from '../hooks/useQualityControl';
import RepairsService from '../utils/RepairsService';

// Components
import QcRepairSummary from '../components/QcRepairSummary';
import QcDecisionForm from '../components/QcDecisionForm';
import QcPhotoUploader from '../components/QcPhotoUploader';

const QualityControlDetailPage = () => {
    const params = useParams();
    const router = useRouter();
    const { repairs, updateRepair } = useRepairs();
    const repairID = Array.isArray(params?.repairID) ? params.repairID[0] : params?.repairID;
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
        closeSnackbar,
        showSnackbar,
        addPhoto,
        removePhoto,
        updatePhotoCaption,
        validateQcForm,
        getQcFormData,
    } = useQualityControl();

    const repair = useMemo(
        () => repairs.find((item) => item._id === repairID || item.repairID === repairID),
        [repairs, repairID]
    );

    const qcRepairs = useMemo(
        () => repairs.filter((item) => item.status === 'QUALITY CONTROL'),
        [repairs]
    );

    const currentIndex = useMemo(
        () => qcRepairs.findIndex((item) => item._id === repairID || item.repairID === repairID),
        [qcRepairs, repairID]
    );

    const hasPrevious = currentIndex > 0;
    const hasNext = currentIndex >= 0 && currentIndex < qcRepairs.length - 1;

    const handleNavigation = (direction) => {
        const nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
        const targetRepair = qcRepairs[nextIndex];

        if (!targetRepair) {
            return;
        }

        router.push(`/dashboard/repairs/quality-control/${targetRepair._id || targetRepair.repairID}`);
    };

    const handleSubmitQc = () => {
        if (!validateQcForm()) {
            showSnackbar('Please fix the highlighted QC issues before submitting.', 'error');
            return;
        }

        setConfirmDialogOpen(true);
    };

    const handleConfirmSubmit = async () => {
        if (!repair) {
            return;
        }

        try {
            setIsSubmitting(true);

            const qcData = getQcFormData();
            await RepairsService.completeQualityControl(repair.repairID || repair._id, qcData);

            updateRepair(repair.repairID, {
                status: qcData.decision === 'APPROVE' ? 'READY FOR PICK-UP' : 'READY FOR WORK',
                qcData,
                notes: qcData.notes,
                updatedAt: new Date().toISOString(),
            });

            setConfirmDialogOpen(false);
            showSnackbar('Quality control submitted successfully.', 'success');

            if (hasNext) {
                handleNavigation('next');
            } else {
                router.push('/dashboard/repairs/quality-control');
            }
        } catch (error) {
            console.error('QC submission failed:', error);
            showSnackbar(error.message || 'Failed to submit quality control.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!repair) {
        return (
            <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", p: 2 }}>
                <CircularProgress sx={{ mb: 2 }} />
                <Typography variant="h6">Loading repair details...</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ pb: 10, position: 'relative' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, gap: 2, flexWrap: 'wrap' }}>
                <Box>
                    <Typography variant="h4" fontWeight="bold">
                        Quality Control Review
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Repair {repair.repairID || repairID} • {currentIndex >= 0 ? currentIndex + 1 : 0} of {qcRepairs.length}
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button variant="outlined" onClick={() => router.push('/dashboard/repairs/quality-control')}>
                        Back to Queue
                    </Button>
                    <Button variant="outlined" onClick={() => handleNavigation('previous')} disabled={!hasPrevious}>
                        Previous
                    </Button>
                    <Button variant="outlined" onClick={() => handleNavigation('next')} disabled={!hasNext}>
                        Next
                    </Button>
                </Box>
            </Box>

            <Grid container spacing={3}>
                <Grid item xs={12} lg={5}>
                    <QcRepairSummary repair={repair} />
                </Grid>

                <Grid item xs={12} lg={7}>
                    <Grid container spacing={3}>
                        <Grid item xs={12}>
                            <QcPhotoUploader
                                photos={photos}
                                onAddPhoto={addPhoto}
                                onRemovePhoto={removePhoto}
                                onUpdateCaption={updatePhotoCaption}
                                disabled={isSubmitting}
                            />
                        </Grid>

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

                        <Grid item xs={12}>
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                                <Button variant="outlined" onClick={() => router.push('/dashboard/repairs/quality-control')} disabled={isSubmitting}>
                                    Cancel
                                </Button>
                                <Button variant="contained" onClick={handleSubmitQc} disabled={isSubmitting}>
                                    {isSubmitting ? 'Submitting...' : 'Submit QC'}
                                </Button>
                            </Box>
                        </Grid>
                    </Grid>
                </Grid>
            </Grid>

            <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Confirm Quality Control Submission</DialogTitle>
                <DialogContent>
                    <Typography sx={{ mb: 2 }}>
                        You are about to submit QC for repair {repair.repairID || repairID}.
                    </Typography>
                    <Alert severity={qcDecision === 'APPROVE' ? 'success' : 'warning'}>
                        Decision: {qcDecision || 'Not selected'}
                        <br />
                        Inspector: {inspector || 'Not selected'}
                    </Alert>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
                    <Button onClick={handleConfirmSubmit} variant="contained" disabled={isSubmitting}>
                        Confirm
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={snackbarOpen}
                autoHideDuration={6000}
                onClose={closeSnackbar}
                message={snackbarMessage}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
                ContentProps={{
                    sx: {
                        backgroundColor: snackbarSeverity === "success" ? "green" 
                            : snackbarSeverity === "error" ? "red" : "orange",
                        color: "white",
                        fontWeight: "bold",
                    },
                }}
            />
        </Box>
    );
};

export default QualityControlDetailPage;
