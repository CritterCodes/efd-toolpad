"use client";
import * as React from 'react';
import PropTypes from 'prop-types';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import Divider from '@mui/material/Divider';

/**
 * Revenue Analytics Component
 * - Provides a compact summary of revenue-related data.
 * - Consistent card size with other analytics components.
 */
export default function RevenueAnalytics({ repairs = [] }) {
    const validRepairs = Array.isArray(repairs) ? repairs : [];

    // ✅ Calculate revenue-related metrics
    console.log(validRepairs);
    
    const totalRevenue = validRepairs.reduce((sum, repair) => sum + (parseInt(repair.totalCost) || 0), 0);
    const averageRepairCost = validRepairs.length 
        ? (totalRevenue / validRepairs.length).toFixed(2)
        : "N/A";
    
    const highestRevenueRepair = validRepairs.length 
        ? Math.max(...validRepairs.map(repair => repair.totalCost || 0)) 
        : "N/A";

    const lowestRevenueRepair = validRepairs.length 
        ? Math.min(...validRepairs.map(repair => repair.totalCost || 0)) 
        : "N/A";

    const data = [
        { label: "Total Revenue", value: `$${totalRevenue}` },
        { label: "Average Repair Cost", value: `$${averageRepairCost}` },
        { label: "Highest Revenue Repair", value: `$${highestRevenueRepair}` },
        { label: "Lowest Revenue Repair", value: `$${lowestRevenueRepair}` },
    ];

    return (
        <Card 
            sx={{ 
                borderRadius: '12px', 
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)', 
                padding: 3, 
                textAlign: 'center',
                maxWidth: 350,
                height: 320, // ✅ Consistent with other cards
                mx: 'auto',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-evenly'
            }}
        >
            <Typography variant="h6" fontWeight="bold" mb={2}>
                Revenue Analytics
            </Typography>
            <Divider sx={{ mb: 2 }} />

            {/* ✅ Revenue Metrics Display */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {data.map((item, index) => (
                    <Box 
                        key={index}
                        sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            py: 1
                        }}
                    >
                        <Typography variant="body2" color="text.secondary">
                            {item.label}
                        </Typography>
                        <Typography 
                            variant="h6" 
                            fontWeight="bold" 
                            sx={{ color: item.value === "N/A" ? 'gray' : 'primary.main' }}
                        >
                            {item.value}
                        </Typography>
                    </Box>
                ))}
            </Box>
        </Card>
    );
}

RevenueAnalytics.propTypes = {
    repairs: PropTypes.array
};
