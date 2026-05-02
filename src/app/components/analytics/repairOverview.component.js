"use client";
import * as React from 'react';
import PropTypes from 'prop-types';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import Divider from '@mui/material/Divider';

/**
 * Cleaned Up Repair Overview Analytics Component (Same Size as Other Cards)
 */
export default function RepairOverviewAnalytics({ summary = {} }) {
    const data = [
        { label: "Go-Live Repairs", value: summary.goLiveRepairCount ?? summary.totalRepairs ?? 0 },
        { label: "Completed Repairs", value: summary.completedRepairs ?? 0 },
        { label: "Pending Repairs", value: summary.pendingRepairs ?? 0 },
        { label: "Avg Completion Time (days)", value: summary.averageCompletionDays ?? "N/A" },
    ];

    return (
        <Card 
            sx={{ 
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                padding: 3,
                textAlign: 'center',
                maxWidth: 400,
                height: 300, // ✅ Fixed height
                mx: 'auto',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
            }}
        >
            <Typography variant="h6" fontWeight="bold">
                Repair Overview
            </Typography>
            <Divider />
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                {data.map((item, index) => (
                    <Box 
                        key={index} 
                        sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}
                    >
                        <Typography variant="body2" color="text.secondary">
                            {item.label}
                        </Typography>
                        <Typography variant="h6" fontWeight="bold">
                            {item.value}
                        </Typography>
                    </Box>
                ))}
            </Box>
        </Card>
    );
}

RepairOverviewAnalytics.propTypes = {
    summary: PropTypes.object
};
