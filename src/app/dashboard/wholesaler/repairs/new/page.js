'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Typography, Paper, Alert, Snackbar } from '@mui/material';
import { useWholesaleRepairs } from '@/hooks/wholesale/useWholesaleRepairs';
import WholesaleRepairForm from '@/app/components/wholesale/WholesaleRepairForm';

export default function CreateWholesaleRepairPage() {
    const router = useRouter();
    const { createRepair } = useWholesaleRepairs();
    const [submitError, setSubmitError] = useState(null);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    const handleCreateRepair = async (formData) => {
        try {
            setSubmitError(null);
            await createRepair(formData);
            setSnackbar({ open: true, message: 'Repair submitted successfully!', severity: 'success' });
            setTimeout(() => router.push('/dashboard/wholesaler/repairs/current'), 1000);
        } catch (err) {
            setSubmitError(err.message);
        }
    };

    return (
        <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
            <Typography variant="h4" sx={{ mb: 3 }}>Submit New Repair</Typography>
            <Paper sx={{ p: 3 }}>
                {submitError && <Alert severity="error" sx={{ mb: 2 }}>{submitError}</Alert>}
                <WholesaleRepairForm
                    onSubmit={handleCreateRepair}
                    onCancel={() => router.push('/dashboard/wholesaler/repairs/current')}
                />
            </Paper>

            <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar(p => ({ ...p, open: false }))}>
                <Alert severity={snackbar.severity} onClose={() => setSnackbar(p => ({ ...p, open: false }))}>{snackbar.message}</Alert>
            </Snackbar>
        </Box>
    );
}
