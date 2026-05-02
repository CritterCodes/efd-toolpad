"use client";
import * as React from 'react';
import PropTypes from 'prop-types';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import Divider from '@mui/material/Divider';

const CLOSED_STATUSES = new Set([
  'COMPLETED',
  'READY FOR PICKUP',
  'READY FOR PICK-UP',
  'DELIVERY BATCHED',
  'PAID_CLOSED',
  'cancelled',
  'CANCELLED',
]);

export default function UpcomingDeadlinesAnalytics({ repairs = [] }) {
  const validRepairs = Array.isArray(repairs) ? repairs : [];
  const sortedRepairs = [...validRepairs]
    .filter((repair) => repair.promiseDate && !CLOSED_STATUSES.has(repair.status))
    .sort((a, b) => new Date(a.promiseDate) - new Date(b.promiseDate))
    .slice(0, 5);

  return (
    <Card
      sx={{
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        padding: 3,
        textAlign: 'center',
        maxWidth: 350,
        mx: 'auto',
      }}
    >
      <Typography variant="h6" fontWeight="bold" mb={2}>
        Upcoming Deadlines
      </Typography>
      <Divider sx={{ mb: 2 }} />

      {sortedRepairs.length > 0 ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {sortedRepairs.map((repair) => (
            <Box
              key={repair.repairID}
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 1,
                py: 0.5,
              }}
            >
              <Typography variant="body2" color="text.secondary">
                {repair.description || 'No Description'}
              </Typography>
              <Typography variant="body2" fontWeight="bold" sx={{ color: 'primary.main', flexShrink: 0 }}>
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
  repairs: PropTypes.array,
};
