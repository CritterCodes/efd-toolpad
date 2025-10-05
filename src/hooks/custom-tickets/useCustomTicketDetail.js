/**
 * Custom Ticket Detail Data Hook - Constitutional Architecture
 * Manages state and side effects for ticket detail view
 */

import { useState, useEffect } from 'react';
import CustomTicketAPIClient from '../../api-clients/customTicket.client.js';

export function useCustomTicketDetail(ticketId) {
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  // Fetch ticket data
  useEffect(() => {
    if (!ticketId) return;

    const fetchTicket = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Use constitutional API client
        const result = await CustomTicketAPIClient.fetchById(ticketId);
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch ticket');
        }
        
        setTicket(result.ticket);
      } catch (err) {
        console.error('useCustomTicketDetail.fetchTicket error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTicket();
  }, [ticketId]);

  // Update ticket status
  const updateStatus = async (newStatus) => {
    try {
      setSaving(true);
      setError(null);
      
      // Use constitutional API client for status updates
      const result = await CustomTicketAPIClient.updateStatus(ticketId, newStatus);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to update status');
      }
      
      setTicket(result.ticket);
      return { success: true };
    } catch (err) {
      console.error('useCustomTicketDetail.updateStatus error:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setSaving(false);
    }
  };

  // Update ticket financials
  const updateFinancials = async (financialData) => {
    try {
      setSaving(true);
      setError(null);
      
      console.log('🔄 useCustomTicketDetail.updateFinancials - Starting update:', {
        ticketId,
        financialData,
        dataKeys: Object.keys(financialData),
        centerstone: financialData.centerstone,
        accentStones: financialData.accentStones,
        quoteTotal: financialData.quoteTotal
      });
      
      // Use constitutional API client for updates
      const result = await CustomTicketAPIClient.update(ticketId, financialData);
      
      console.log('✅ useCustomTicketDetail.updateFinancials - API result:', result);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to update financials');
      }
      
      setTicket(result.ticket);
      
      console.log('✅ useCustomTicketDetail.updateFinancials - Ticket state updated:', result.ticket);
      
      return { success: true };
    } catch (err) {
      console.error('❌ useCustomTicketDetail.updateFinancials error:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setSaving(false);
    }
  };

  // Refresh ticket data
  const refreshTicket = async () => {
    if (!ticketId) return;

    try {
      setLoading(true);
      
      // Use constitutional API client for refresh
      const result = await CustomTicketAPIClient.fetchById(ticketId);
      
      if (result.success) {
        setTicket(result.ticket);
      } else {
        throw new Error(result.error || 'Failed to refresh ticket');
      }
    } catch (err) {
      console.error('useCustomTicketDetail.refreshTicket error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return {
    ticket,
    loading,
    error,
    saving,
    updateStatus,
    updateFinancials,
    refreshTicket,
    // Helper computed values
    hasFinancials: ticket && (ticket.materialCosts || ticket.laborCost || ticket.quoteTotal),
    hasImages: ticket && ticket.files?.moodBoard && ticket.files.moodBoard.length > 0,
    hasNotes: ticket && ticket.notes && ticket.notes.length > 0
  };
}

export default useCustomTicketDetail;