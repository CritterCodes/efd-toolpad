'use client';

import React from 'react';
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
        checklist,
        isUpdating
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
                    isUpdating={isUpdating}
                />
            </Box>
        </Container>
    );
}
