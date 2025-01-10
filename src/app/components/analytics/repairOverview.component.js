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
export default function RepairOverviewAnalytics({ repairs = [] }) {
    const validRepairs = Array.isArray(repairs) ? repairs : [];

    const totalRepairs = validRepairs.length;
    const completedRepairs = validRepairs.filter(repair => repair.completed).length;
    const pendingRepairs = validRepairs.filter(repair => !repair.completed).length;

    const completedWithDates = validRepairs.filter(
        (repair) => repair.completed && repair.completedAt && repair.createdAt
    );
    const averageCompletionTime = completedWithDates.length
        ? (
            completedWithDates.reduce((sum, repair) => {
                const createdAt = new Date(repair.createdAt);
                const completedAt = new Date(repair.completedAt);
                return sum + (completedAt - createdAt) / (1000 * 60 * 60 * 24);
            }, 0) / completedWithDates.length
        ).toFixed(1)
        : "N/A";

    const data = [
        { label: "Total Repairs", value: totalRepairs },
        { label: "Completed Repairs", value: completedRepairs },
        { label: "Pending Repairs", value: pendingRepairs },
        { label: "Avg Completion Time (days)", value: averageCompletionTime },
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
    repairs: PropTypes.array
};
