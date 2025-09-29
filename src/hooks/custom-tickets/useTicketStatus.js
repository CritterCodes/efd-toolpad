/**
 * Custom Ticket Status Management Hook
 * Handles status transitions and workflow logic
 */

import { useState } from 'react';
import { 
  getNextPossibleStatuses,
  isStatusTransitionAllowed,
  getInternalStatusInfo
} from '@/config/statuses';

export function useTicketStatus(ticket, onStatusUpdate) {
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState(null);

  const availableStatuses = ticket ? getNextPossibleStatuses(ticket.status) : [];
  const currentStatusInfo = ticket ? getInternalStatusInfo(ticket.status) : null;

  const updateStatus = async (newStatus) => {
    if (!ticket || !isStatusTransitionAllowed(ticket.status, newStatus)) {
      setStatusError('Invalid status transition');
      return { success: false };
    }

    try {
      setStatusLoading(true);
      setStatusError(null);

      const result = await onStatusUpdate(newStatus);
      
      if (!result.success) {
        setStatusError(result.error || 'Failed to update status');
      }

      return result;
    } catch (error) {
      const errorMessage = error.message || 'Unknown error occurred';
      setStatusError(errorMessage);
      console.error('Error updating status:', error);
      return { success: false, error: errorMessage };
    } finally {
      setStatusLoading(false);
    }
  };

  const canTransitionTo = (newStatus) => {
    return ticket && isStatusTransitionAllowed(ticket.status, newStatus);
  };

  const clearStatusError = () => {
    setStatusError(null);
  };

  return {
    availableStatuses,
    currentStatusInfo,
    statusLoading,
    statusError,
    updateStatus,
    canTransitionTo,
    clearStatusError,
    // Helper computed values
    requiresAction: currentStatusInfo?.requiresAction || false,
    isBlocking: currentStatusInfo?.isBlocking || false,
    statusColor: currentStatusInfo?.color || 'default'
  };
}

export default useTicketStatus;