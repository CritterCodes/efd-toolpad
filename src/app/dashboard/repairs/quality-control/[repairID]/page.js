"use client";
import React from 'react';
import { useParams } from 'next/navigation';
import { useRepairs } from '@/app/context/repairs.context';
import QCStepper from '@/app/components/repairs/quality-control/stepper';
import { Box, Typography, Button, CircularProgress } from "@mui/material";

const QualityControlDetailPage = () => {
    const { repairID } = useParams();
    const { repairs } = useRepairs();

    // ✅ Find the current repair
    const repair = repairs.find(r => r.repairID === repairID);

    // ✅ Get all repairs currently in QC
    const qcRepairs = repairs.filter(r => r.status === "QUALITY CONTROL");

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
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                    Repair Not Found
                </Typography>
                <Typography color="text.secondary" sx={{ mb: 3 }}>
                    The repair you are looking for doesn&apos;t exist or has been completed.
                </Typography>
                <Button 
                    variant="contained" 
                    onClick={() => window.history.back()} 
                    sx={{ width: "100%", maxWidth: "300px" }}
                >
                    Go Back
                </Button>
            </Box>
        );
    }

    return (
        <Box 
            sx={{
                padding: { xs: "16px", md: "32px" },
                maxWidth: "600px",
                margin: "auto"
            }}
        >
            <Typography 
                variant="h4" 
                fontWeight="bold" 
                textAlign="center"
                sx={{ marginBottom: "16px" }}
            >
                Quality Control
            </Typography>

            <Typography 
                variant="body1" 
                textAlign="center" 
                color="text.secondary"
                sx={{ marginBottom: "32px" }}
            >
                Carefully follow the steps to complete the quality control process for <strong>{repair.clientName}</strong>.
            </Typography>

            {/* ✅ Pass all repairs in QC to the stepper */}
            <QCStepper repair={repair} qcRepairs={qcRepairs} />
        </Box>
    );
};

export default QualityControlDetailPage;
