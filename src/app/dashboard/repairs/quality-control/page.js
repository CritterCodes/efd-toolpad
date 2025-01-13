"use client";
import React, { useState } from 'react';
import { Box, Typography, Button, List, ListItem, ListItemText, Snackbar, Divider } from '@mui/material';
import { useRouter } from 'next/navigation';
import { useRepairs } from '@/app/context/repairs.context';

const QualityControlPage = () => {
    const { repairs } = useRepairs();
    const router = useRouter();
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState('info');

    // Filter repairs for jobs in "QUALITY CONTROL"
    const qcRepairs = repairs.filter(repair => repair.status === "QUALITY CONTROL");

    // ✅ Start the QC process for the first available job
    const handleStartQC = () => {
        if (qcRepairs.length === 0) {
            setSnackbarMessage("No repairs in Quality Control.");
            setSnackbarSeverity("error");
            setSnackbarOpen(true);
            return;
        }
        // Navigate to the first job in the QC queue for inspection
        router.push(`/dashboard/repairs/quality-control/${qcRepairs[0].repairID}`);
    };

    return (
        <Box sx={{ padding: '20px' }}>
            <Typography variant="h4" sx={{ mb: 2 }}>
                Quality Control Queue
            </Typography>

            <Button
                variant="contained"
                color="primary"
                onClick={handleStartQC}
                sx={{ mb: 3 }}
                disabled={qcRepairs.length === 0}
            >
                Start Quality Control
            </Button>

            <Divider sx={{ mb: 3 }} />

            {/* ✅ Display List of Jobs in QC */}
            <List>
                {qcRepairs.map((repair) => (
                    <ListItem
                        key={repair.repairID}
                        sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            border: '1px solid #ddd',
                            borderRadius: '8px',
                            mb: 1,
                            padding: '10px',
                        }}
                    >
                        <ListItemText
                            primary={repair.clientName}
                            secondary={`Due: ${repair.promiseDate || "N/A"}`}
                        />
                        <Button
                            variant="outlined"
                            color="success"
                            onClick={() => router.push(`/dashboard/repairs/quality-control/${repair.repairID}`)}
                        >
                            Start QC
                        </Button>
                    </ListItem>
                ))}
            </List>

            {/* ✅ Snackbar for Notifications */}
            <Snackbar
                open={snackbarOpen}
                autoHideDuration={5000}
                onClose={() => setSnackbarOpen(false)}
                message={snackbarMessage}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                ContentProps={{
                    sx: {
                        backgroundColor:
                            snackbarSeverity === 'success' ? 'green' :
                            snackbarSeverity === 'error' ? 'red' : 'orange',
                        color: 'white',
                        fontWeight: 'bold',
                    }
                }}
            />
        </Box>
    );
};

export default QualityControlPage;
