/**
 * useTicketCommunications Hook
 * Manages ticket communications state and operations
 * Constitutional Architecture - Under 100 lines
 */

'use client';

import { useState } from 'react';

export function useTicketCommunications(ticket, onTicketUpdate) {
  const [communicationsLoading, setCommunicationsLoading] = useState(false);
  const [communicationsError, setCommunicationsError] = useState(null);

  const addCommunication = async (communicationData) => {
    if (!ticket?.ticketID) {
      const error = 'No ticket ID available';
      setCommunicationsError(error);
      return { success: false, error };
    }

    setCommunicationsLoading(true);
    setCommunicationsError(null);

    try {
      const response = await fetch(`/api/custom-tickets/${ticket.ticketID}/communications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...communicationData,
          ticketId: ticket.ticketID
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `HTTP error! status: ${response.status}`);
      }

      // Update the ticket data if callback provided
      if (onTicketUpdate && result.ticket) {
        onTicketUpdate(result.ticket);
      }

      return { success: true, data: result };
    } catch (error) {
      console.error('Error adding communication:', error);
      setCommunicationsError(error.message);
      return { success: false, error: error.message };
    } finally {
      setCommunicationsLoading(false);
    }
  };

  const communicationsCount = ticket?.communications?.length || 0;
  const hasCommunications = communicationsCount > 0;

  return {
    // State
    communicationsLoading,
    communicationsError,
    communicationsCount,
    hasCommunications,

    // Actions
    addCommunication,

    // Utilities
    clearCommunicationsError: () => setCommunicationsError(null),
  };
}

export default useTicketCommunications;