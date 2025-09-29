/**
 * Custom Ticket Communications Component
 * Handles customer communications and messaging
 * Constitutional Architecture - Under 300 lines
 */

'use client';

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Alert,
  CircularProgress,
  Card,
  CardContent
} from '@mui/material';
import MessageInterface from '@/components/MessageInterface';

export default function CustomTicketCommunications({
  ticket,
  onAddCommunication,
  loading = false,
  error = null
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddCommunication = async (communicationData) => {
    if (!onAddCommunication) {
      console.error('No onAddCommunication handler provided');
      return { success: false, error: 'No handler provided' };
    }

    setIsSubmitting(true);
    try {
      const result = await onAddCommunication(communicationData);
      return result;
    } catch (error) {
      console.error('Error adding communication:', error);
      return { success: false, error: error.message };
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!ticket) {
    return (
      <Alert severity="warning">
        No ticket data available
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        💬 Customer Communications
        {ticket.communications?.length > 0 && (
          <Typography variant="body2" color="text.secondary">
            ({ticket.communications.length} message{ticket.communications.length !== 1 ? 's' : ''})
          </Typography>
        )}
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Communicate with your customer directly. Messages sent here will be visible on their 
        customer portal in the efd-shop website.
      </Typography>

      <Card elevation={1}>
        <CardContent sx={{ p: 2 }}>
          <MessageInterface
            ticket={ticket}
            onAddCommunication={handleAddCommunication}
            isSubmitting={isSubmitting}
          />
        </CardContent>
      </Card>

      {/* Communication Summary */}
      {ticket.communications?.length === 0 && (
        <Box sx={{ mt: 3, p: 3, bgcolor: 'grey.50', borderRadius: 2, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
            📞 No communications yet
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Start a conversation with your customer using the message interface above.
            They&apos;ll be able to see and respond through their customer portal.
          </Typography>
        </Box>
      )}
    </Box>
  );
}