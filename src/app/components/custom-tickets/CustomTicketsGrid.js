/**
 * Custom Tickets Grid Component
 * Grid layout for displaying custom tickets with constitutional component architecture
 */

import React from 'react';
import { Grid, Box, Typography, CircularProgress, Alert } from '@mui/material';
import CustomTicketCard from './CustomTicketCard';

const CustomTicketsGrid = ({ tickets, loading, error }) => {
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ my: 2 }}>
        Error loading tickets: {error}
      </Alert>
    );
  }

  if (!tickets || tickets.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No tickets found
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Try adjusting your search criteria or create a new custom ticket.
        </Typography>
      </Box>
    );
  }

  return (
    <Grid container spacing={3}>
      {tickets.map((ticket) => (
        <Grid item xs={12} sm={6} lg={4} key={ticket._id || ticket.ticketID}>
          <CustomTicketCard ticket={ticket} />
        </Grid>
      ))}
    </Grid>
  );
};

export default CustomTicketsGrid;