"use client";
import * as React from 'react';
import PropTypes from 'prop-types';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import Divider from '@mui/material/Divider';

/**
 * Customer Insights Analytics Component
 * - Provides a compact summary of customer-related data.
 * - Uniform card size matching other analytics cards.
 */
export default function CustomerInsightsAnalytics({ repairs = [] }) {
    const validRepairs = Array.isArray(repairs) ? repairs : [];

    // ✅ Extract unique clients and their repair counts
    const clientCounts = validRepairs.reduce((acc, repair) => {
        acc[repair.clientName] = (acc[repair.clientName] || 0) + 1;
        return acc;
    }, {});

    const totalClients = Object.keys(clientCounts).length;

    // ✅ Sort clients by repair count (most frequent)
    const sortedClients = Object.entries(clientCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3); // Top 3 clients only for display

    // ✅ Recent Clients (Based on creation date)
    const recentClients = validRepairs
        .slice()
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 3)
        .map(repair => repair.clientName);

    return (
        <Card 
            sx={{ 
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                padding: 3,
                textAlign: 'center',
                maxWidth: 400,
                height: 300, // ✅ Consistent with other cards
                mx: 'auto',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-evenly'
            }}
        >
            <Typography variant="h6" fontWeight="bold">
                Customer Insights
            </Typography>
            <Divider sx={{ mb: 2 }} />

            {/* ✅ Total Clients */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                <Typography variant="body2" color="text.secondary">
                    Total Clients
                </Typography>
                <Typography variant="h6" fontWeight="bold">{totalClients}</Typography>
            </Box>

            {/* ✅ Most Frequent Clients */}
            <Box sx={{ textAlign: 'left' }}>
                <Typography variant="body2" color="text.secondary" mb={1}>Top Clients</Typography>
                {sortedClients.length > 0 ? (
                    sortedClients.map(([client, count], index) => (
                        <Typography key={index} variant="body2">
                            {client}: <strong>{count} repairs</strong>
                        </Typography>
                    ))
                ) : (
                    <Typography>No data available</Typography>
                )}
            </Box>

            {/* ✅ Recent Clients */}
            <Box sx={{ textAlign: 'left' }}>
                <Typography variant="body2" color="text.secondary" mt={2}>
                    Recent Clients
                </Typography>
                {recentClients.length > 0 ? (
                    recentClients.map((client, index) => (
                        <Typography key={index} variant="body2">
                            {client}
                        </Typography>
                    ))
                ) : (
                    <Typography>No recent clients available</Typography>
                )}
            </Box>
        </Card>
    );
}

CustomerInsightsAnalytics.propTypes = {
    repairs: PropTypes.array
};
