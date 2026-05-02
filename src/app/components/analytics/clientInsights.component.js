"use client";
import * as React from 'react';
import PropTypes from 'prop-types';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import Divider from '@mui/material/Divider';

export default function CustomerInsightsAnalytics({ summary = {} }) {
  return (
    <Card
      sx={{
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        padding: 3,
        textAlign: 'center',
        maxWidth: 400,
        height: 300,
        mx: 'auto',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-evenly',
      }}
    >
      <Typography variant="h6" fontWeight="bold">
        Customer Insights
      </Typography>
      <Divider sx={{ mb: 2 }} />

      <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
        <Typography variant="body2" color="text.secondary">
          Total Clients
        </Typography>
        <Typography variant="h6" fontWeight="bold">{summary.totalClients ?? 0}</Typography>
      </Box>

      <Box sx={{ textAlign: 'left' }}>
        <Typography variant="body2" color="text.secondary" mb={1}>Top Clients</Typography>
        {(summary.topClients || []).length > 0 ? (
          (summary.topClients || []).map((client) => (
            <Typography key={client.clientName} variant="body2">
              {client.clientName}: <strong>{client.repairCount} repairs</strong>
            </Typography>
          ))
        ) : (
          <Typography>No data available</Typography>
        )}
      </Box>

      <Box sx={{ textAlign: 'left' }}>
        <Typography variant="body2" color="text.secondary" mt={2}>
          Recent Clients
        </Typography>
        {(summary.recentClients || []).length > 0 ? (
          (summary.recentClients || []).map((client, index) => (
            <Typography key={`${client}-${index}`} variant="body2">
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
  summary: PropTypes.object,
};
