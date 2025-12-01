/**
 * Artisan Custom Tickets Page
 * Shows only tickets assigned to the current artisan
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Chip, 
  Grid, 
  CircularProgress,
  Alert,
  Tab,
  Tabs,
  Badge
} from '@mui/material';
import { 
  Assignment,
  Schedule,
  CheckCircle,
  PriorityHigh
} from '@mui/icons-material';
import { PageContainer } from '@toolpad/core/PageContainer';
import { useSession } from 'next-auth/react';

export default function ArtisanCustomTicketsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);

  // Fetch tickets assigned to this artisan
  const fetchArtisanTickets = useCallback(async () => {
    try {
      setLoading(true);
      
      if (!session?.user?.id) {
        console.log('❌ No session found:', session);
        setError('User session not found');
        setLoading(false);
        return;
      }

      const url = `/api/custom-tickets/artisan?artisanUserId=${session.user.id}`;
      console.log('🚀 Fetching tickets for user:', session.user.id);
      console.log('🔗 API URL:', url);
      
      // Add timeout to prevent infinite loading
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('⏰ Request timed out after 30 seconds');
        controller.abort();
      }, 30000); // 30 second timeout
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      console.log('📡 Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('📊 API response data:', {
        success: data.success,
        ticketCount: data.tickets?.length || 0,
        totalCount: data.totalCount,
        error: data.error,
        hasTickets: Array.isArray(data.tickets)
      });

      if (data.success) {
        const ticketsArray = Array.isArray(data.tickets) ? data.tickets : [];
        setTickets(ticketsArray);
        setError(null);
        console.log('✅ Successfully loaded tickets:', ticketsArray.length);
      } else {
        console.error('❌ API returned error:', data.error);
        setError(data.error || 'Failed to fetch tickets');
        setTickets([]);
      }
    } catch (err) {
      console.error('❌ Error fetching artisan tickets:', err);
      
      if (err.name === 'AbortError') {
        setError('Request timed out. Please try again.');
      } else if (err.message.includes('fetch')) {
        setError('Network error. Please check your connection and try again.');
      } else {
        setError(`Failed to load tickets: ${err.message}`);
      }
      
      setTickets([]);
    } finally {
      setLoading(false);
      console.log('🏁 fetchArtisanTickets completed');
    }
  }, [session]);

  useEffect(() => {
    console.log('🔄 useEffect triggered with session status:', {
      sessionStatus,
      hasSession: !!session,
      hasUserId: !!session?.user?.id,
      userId: session?.user?.id,
      role: session?.user?.role
    });
    
    // Don't try to fetch if session is still loading
    if (sessionStatus === 'loading') {
      console.log('⏳ Session still loading, waiting...');
      return;
    }
    
    if (sessionStatus === 'unauthenticated') {
      console.log('❌ User not authenticated');
      setError('Authentication required');
      setLoading(false);
      return;
    }
    
    if (session?.user?.id) {
      console.log('🚀 Calling fetchArtisanTickets for user:', session.user.id);
      fetchArtisanTickets();
    } else {
      console.log('⚠️ No user ID found in session');
      setError('User ID not found in session');
      setLoading(false);
    }
  }, [sessionStatus, session, fetchArtisanTickets]);

  // Filter tickets by status
  const getTicketsByStatus = (status) => {
    return tickets.filter(ticket => {
      switch (status) {
        case 'active':
          return !['completed', 'cancelled', 'on-hold'].includes(ticket.status);
        case 'completed':
          return ticket.status === 'completed';
        case 'all':
        default:
          return true;
      }
    });
  };

  const activeTickets = getTicketsByStatus('active');
  const completedTickets = getTicketsByStatus('completed');
  const allTickets = getTicketsByStatus('all');

  const getStatusColor = (status) => {
    const statusColors = {
      'new': 'default',
      'in-progress': 'primary',
      'waiting-approval': 'warning',
      'completed': 'success',
      'on-hold': 'secondary',
      'cancelled': 'error'
    };
    return statusColors[status] || 'default';
  };

  const getPriorityColor = (priority) => {
    const priorityColors = {
      'low': 'default',
      'normal': 'primary',
      'high': 'warning',
      'urgent': 'error'
    };
    return priorityColors[priority] || 'default';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const renderTicketCard = (ticket) => (
    <Card key={ticket._id} sx={{ mb: 2, cursor: 'pointer' }} 
          onClick={() => window.location.href = `/dashboard/custom-tickets/${ticket._id}`}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Typography variant="h6" component="div">
            {ticket.title}
          </Typography>
          <Box display="flex" gap={1}>
            <Chip 
              label={ticket.status} 
              color={getStatusColor(ticket.status)}
              size="small"
            />
            <Chip 
              label={ticket.priority}
              color={getPriorityColor(ticket.priority)}
              size="small"
              icon={<PriorityHigh />}
            />
          </Box>
        </Box>
        
        <Typography color="text.secondary" gutterBottom>
          Customer: {ticket.customerName}
        </Typography>
        
        <Typography color="text.secondary" gutterBottom>
          Type: {ticket.type}
        </Typography>
        
        {ticket.quoteTotal && (
          <Typography color="text.secondary" gutterBottom>
            Value: ${ticket.quoteTotal.toLocaleString()}
          </Typography>
        )}
        
        <Box display="flex" justifyContent="between" alignItems="center" mt={2}>
          <Typography variant="body2" color="text.secondary">
            Created: {formatDate(ticket.createdAt)}
          </Typography>
          
          {ticket.assignedArtisans && ticket.assignedArtisans.length > 1 && (
            <Chip 
              label={`${ticket.assignedArtisans.length} artisans`}
              size="small"
              variant="outlined"
            />
          )}
        </Box>
      </CardContent>
    </Card>
  );

  const renderTicketsList = (ticketsList) => {
    if (ticketsList.length === 0) {
      return (
        <Box textAlign="center" py={4}>
          <Assignment sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No tickets found
          </Typography>
          <Typography color="text.secondary">
            You don&apos;t have any tickets assigned in this category.
          </Typography>
        </Box>
      );
    }

    return (
      <Grid container spacing={2}>
        {ticketsList.map(ticket => (
          <Grid item xs={12} sm={6} lg={4} key={ticket._id}>
            {renderTicketCard(ticket)}
          </Grid>
        ))}
      </Grid>
    );
  };

  if (loading) {
    return (
      <PageContainer title="My Custom Tickets">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
          <CircularProgress />
        </Box>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer title="My Custom Tickets">
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Debug Info:
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Session Status: {sessionStatus} | 
            User ID: {session?.user?.id || 'none'} | 
            Role: {session?.user?.role || 'none'}
          </Typography>
        </Box>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="My Custom Tickets">
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab 
            icon={
              <Badge badgeContent={activeTickets.length} color="primary">
                <Schedule />
              </Badge>
            }
            label="Active"
          />
          <Tab 
            icon={
              <Badge badgeContent={completedTickets.length} color="success">
                <CheckCircle />
              </Badge>
            }
            label="Completed"
          />
          <Tab 
            icon={
              <Badge badgeContent={allTickets.length} color="secondary">
                <Assignment />
              </Badge>
            }
            label="All Tickets"
          />
        </Tabs>
      </Box>

      {/* Tab Panels */}
      {tabValue === 0 && renderTicketsList(activeTickets)}
      {tabValue === 1 && renderTicketsList(completedTickets)}
      {tabValue === 2 && renderTicketsList(allTickets)}
      
      {/* Summary */}
      <Box mt={4} p={2} bgcolor="grey.50" borderRadius={1}>
        <Typography variant="body2" color="text.secondary">
          Total assigned tickets: {allTickets.length} | 
          Active: {activeTickets.length} | 
          Completed: {completedTickets.length}
        </Typography>
      </Box>
    </PageContainer>
  );
}