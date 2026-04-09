"use client";
import React from 'react';
import { Box, Typography, Grid, CircularProgress, Snackbar } from '@mui/material';

// Custom hook
import { useQualityControlPage } from '@/hooks/repairs/useQualityControlPage';

// Components
import QcRepairSummary from '../components/QcRepairSummary';
import QcDecisionForm from '../components/QcDecisionForm';
import QcPhotoUploader from '../components/QcPhotoUploader';

// Wrapper Domain Components
import QcPageHeader from '@/components/business/repairs/qc/QcPageHeader';
import QcPageFooterActions from '@/components/business/repairs/qc/QcPageFooterActions';
import QcConfirmationDialog from '@/components/business/repairs/qc/QcConfirmationDialog';

const QualityControlDetailPage = () => {
    const {
        repair,
        repairID,
        router,
        confirmDialogOpen,
        setConfirmDialogOpen,
        qcControlProps,
        handlePhotoUpload,
        handleSubmitQc,
        handleConfirmSubmit,
        handleNavigation,
        qcRepairs,
        currentIndex,
        hasNext,
        hasPrevious,
        submitProps
    } = useQualityControlPage();

    if (!repair) {
        return (
            <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", p: 2 }}>
                <CircularProgress sx={{ mb: 2 }} />
                <Typography variant="h6">Loading repair details...</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ padding: '20px', position: 'relative' }}>
            <QcPageHeader 
                repairID={repairID} 
                currentIndex={currentIndex} 
                totalRepairs={qcRepairs.length} 
                hasNext={hasNext} 
                hasPrevious={hasPrevious} 
                handleNavigation={handleNavigation} 
                router={router} 
            />

            <Grid container spacing={3}>
                <Grid item xs={12} lg={5}>
                    <QcRepairSummary repair={repair} />
                </Grid>

                <Grid item xs={12} lg={7}>
                    <Grid container spacing={3}>
                        <Grid item xs={12}>
                            <QcPhotoUploader
                                photos={qcControlProps.photos}
                                onAddPhoto={handlePhotoUpload}
                                onRemovePhoto={qcControlProps.removePhoto}
                                onUpdateCaption={qcControlProps.updatePhotoCaption}
                                disabled={submitProps.isSubmitting}
                            />
                        </Grid>

                        <Grid item xs={12}>
                            <QcDecisionForm
                                qcDecision={qcControlProps.qcDecision}
                                onDecisionChange={qcControlProps.setQcDecision}
                                inspector={qcControlProps.inspector}
                                onInspectorChange={qcControlProps.setInspector}
                                qcNotes={qcControlProps.qcNotes}
                                onNotesChange={qcControlProps.setQcNotes}
                                issueCategory={qcControlProps.issueCategory}
                                onIssueCategoryChange={qcControlProps.setIssueCategory}
                                severityLevel={qcControlProps.severityLevel}
                                onSeverityChange={qcControlProps.setSeverityLevel}
                                validationErrors={qcControlProps.validationErrors}
                                disabled={submitProps.isSubmitting}
                            />
                        </Grid>

                        <Grid item xs={12}>
                            <QcPageFooterActions 
                                isSubmitting={submitProps.isSubmitting} 
                                handleSubmitQc={handleSubmitQc} 
                            />
                        </Grid>
                    </Grid>
                </Grid>
            </Grid>

            <QcConfirmationDialog
                open={confirmDialogOpen}
                onClose={() => setConfirmDialogOpen(false)}
                onConfirm={handleConfirmSubmit}
                repairID={repairID}
                qcDecision={submitProps.qcDecision}
                inspector={submitProps.inspector}
            />

            <Snackbar
                open={qcControlProps.snackbarOpen}
                autoHideDuration={6000}
                onClose={qcControlProps.closeSnackbar}
                message={qcControlProps.snackbarMessage}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
                ContentProps={{
                    sx: {
                        backgroundColor: qcControlProps.snackbarSeverity === "success" ? "green" 
                            : qcControlProps.snackbarSeverity === "error" ? "red" : "orange",
                        color: "white",
                        fontWeight: "bold",
                    },
                }}
            />
        </Box>
    );
};

export default QualityControlDetailPage;
