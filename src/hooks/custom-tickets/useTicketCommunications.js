/**
 * useTicketCommunications Hook
 * Manages ticket communications state and operations with smart polling
 * Constitutional Architecture - Under 150 lines
 */

'use client';

import { useState, useRef, useEffect } from 'react';

// Polling configuration
const POLLING_INTERVAL = 3000; // 3 seconds
const POLLING_DURATION = 30000; // Poll for 30 seconds after message sent

export function useTicketCommunications(ticket, onTicketUpdate) {
  const [communicationsLoading, setCommunicationsLoading] = useState(false);
  const [communicationsError, setCommunicationsError] = useState(null);
  const pollingTimerRef = useRef(null);
  const pollStopTimerRef = useRef(null);

  // Start smart polling for new messages (doesn't cause full page refresh)
  const startPolling = () => {
    // Clear any existing timers
    if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
    if (pollStopTimerRef.current) clearTimeout(pollStopTimerRef.current);

    console.log('🔄 [POLLING] Starting communication polling...');

    // Poll for new messages
    pollingTimerRef.current = setInterval(async () => {
      try {
        if (!ticket?.ticketID) return;

        const response = await fetch(`/api/custom-tickets/${ticket.ticketID}?ts=${Date.now()}`);
        if (response.ok) {
          const updatedTicket = await response.json();
          
          // Only refresh if communications actually changed
          const oldCommsCount = ticket?.communications?.length || 0;
          const newCommsCount = updatedTicket?.communications?.length || 0;
          
          if (newCommsCount > oldCommsCount) {
            console.log(`📬 [POLLING] New messages detected: ${oldCommsCount} → ${newCommsCount}`);
            // Call onTicketUpdate to refresh with minimal page impact
            if (onTicketUpdate) {
              await onTicketUpdate();
            }
          }
        }
      } catch (error) {
        console.error('🔴 [POLLING] Error polling for updates:', error);
      }
    }, POLLING_INTERVAL);

    // Stop polling after timeout to save resources
    pollStopTimerRef.current = setTimeout(() => {
      stopPolling();
    }, POLLING_DURATION);
  };

  // Stop polling
  const stopPolling = () => {
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
      console.log('⏹️ [POLLING] Polling stopped');
    }
    if (pollStopTimerRef.current) {
      clearTimeout(pollStopTimerRef.current);
      pollStopTimerRef.current = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, []);

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

      // Start smart polling instead of immediate full refresh
      console.log('📤 [COMMS] Message sent, starting polling for updates...');
      startPolling();

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
    startPolling,
    stopPolling,

    // Utilities
    clearCommunicationsError: () => setCommunicationsError(null),
  };
}

export default useTicketCommunications;