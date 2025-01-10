"use client";
import * as React from 'react';
import PropTypes from 'prop-types';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import Divider from '@mui/material/Divider';

/**
 * Upcoming Deadlines Analytics Component
 * - Displays the next few repairs with the closest deadlines.
 * - Consistent card size with other analytics components.
 */
export default function UpcomingDeadlinesAnalytics({ repairs = [] }) {
    const validRepairs = Array.isArray(repairs) ? repairs : [];

    // ✅ Sort repairs by upcoming deadline
    const sortedRepairs = [...validRepairs]
        .filter(repair => repair.promiseDate)
        .sort((a, b) => new Date(a.promiseDate) - new Date(b.promiseDate))
        .slice(0, 5); // Show top 5 soonest deadlines

    return (
        <Card 
            sx={{ 
                borderRadius: '12px', 
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)', 
                padding: 3, 
                textAlign: 'center',
                maxWidth: 350,
                mx: 'auto'
            }}
        >
            <Typography variant="h6" fontWeight="bold" mb={2}>
                Upcoming Deadlines
            </Typography>
            <Divider sx={{ mb: 2 }} />

            {/* Display Upcoming Repairs */}
            {sortedRepairs.length > 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {sortedRepairs.map((repair, index) => (
                        <Box 
                            key={index}
                            sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                py: 0.5
                            }}
                        >
                            <Typography variant="body2" color="text.secondary">
                                {repair.description || "No Description"}
                            </Typography>
                            <Typography 
                                variant="body2" 
                                fontWeight="bold" 
                                sx={{ color: 'primary.main' }}
                            >
                                {new Date(repair.promiseDate).toLocaleDateString()}
                            </Typography>
                        </Box>
                    ))}
                </Box>
            ) : (
                <Typography variant="body2" color="text.secondary">
                    No upcoming deadlines.
                </Typography>
            )}
        </Card>
    );
}

UpcomingDeadlinesAnalytics.propTypes = {
    repairs: PropTypes.array
};
