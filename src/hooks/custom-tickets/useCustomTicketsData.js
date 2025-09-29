/**
 * Custom Tickets Data Management Hook - Constitutional Architecture
 * Handles data fetching, filtering, and state management for custom tickets
 */

import CustomTicketAPIClient from '../../api-clients/customTicket.client.js';
import { useState, useEffect, useCallback } from 'react';

export const useCustomTicketsData = () => {
  const [tickets, setTickets] = useState([]);
  const [filteredTickets, setFilteredTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState(null);
  const [filters, setFilters] = useState({
    type: '',
    status: '',
    paymentReceived: '',
    cardPaymentStatus: '',
    hasShopifyOrders: false
  });

  const loadTickets = useCallback(async () => {
    try {
      setLoading(true);
      
      // Use constitutional API client instead of direct fetch
      const response = await CustomTicketAPIClient.fetchAll(filters);
      
      if (!response.success) {
        throw new Error(response.error);
      }
      
      setTickets(response.tickets || []);
      setFilteredTickets(response.tickets || []);
    } catch (error) {
      console.error('useCustomTicketsData.loadTickets error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const loadSummary = async () => {
    try {
      // Use constitutional API client for summary endpoint
      const response = await CustomTicketAPIClient.fetchSummary();
      
      if (response.success) {
        setSummary(response.data || response.summary);
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('useCustomTicketsData.loadSummary error:', error);
      setError(error.message);
    }
  };

  const applySearchAndSort = useCallback((searchQuery, sortOrder) => {
    let updatedTickets = [...tickets];

    // Apply search
    if (searchQuery) {
      updatedTickets = updatedTickets.filter(ticket =>
        ticket.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.ticketID?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.email?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply sorting
    updatedTickets.sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

    setFilteredTickets(updatedTickets);
  }, [tickets]);

  const refreshData = useCallback(() => {
    loadTickets();
    loadSummary();
  }, [loadTickets]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  return {
    tickets: filteredTickets,
    loading,
    error,
    summary,
    filters,
    setFilters,
    refreshData,
    applySearchAndSort
  };
};