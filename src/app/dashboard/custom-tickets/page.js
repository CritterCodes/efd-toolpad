'use client';

import * as React from 'react';
import PropTypes from 'prop-types';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Pagination from '@mui/material/Pagination';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import { PageContainer } from '@toolpad/core/PageContainer';
import { useRouter } from 'next/navigation';
import CustomTicketFilters from '@/app/components/custom-tickets/filters.component';
import CustomTicketSummary from '@/app/components/custom-tickets/summary.component';
import NewCustomTicketStepper from '@/app/components/custom-tickets/newCustomTicketStepper.component';

export default function CustomTicketsPage() {
  const [tickets, setTickets] = React.useState([]);
  const [filteredTickets, setFilteredTickets] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [open, setOpen] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [sortOrder, setSortOrder] = React.useState('newest');
  const [filters, setFilters] = React.useState({
    type: '',
    status: '',
    paymentReceived: '',
    cardPaymentStatus: '',
    hasShopifyOrders: false
  });
  const [summary, setSummary] = React.useState(null);
  
  const router = useRouter();
  const rowsPerPage = 6;

  const loadTickets = React.useCallback(async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      if (filters.type) params.append('type', filters.type);
      if (filters.status) params.append('status', filters.status);
      if (filters.paymentReceived !== '') params.append('paymentReceived', filters.paymentReceived);
      if (filters.cardPaymentStatus) params.append('cardPaymentStatus', filters.cardPaymentStatus);
      if (filters.hasShopifyOrders) params.append('hasShopifyOrders', 'true');

      const response = await fetch(`/api/custom-tickets?${params.toString()}`);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      setTickets(result.data);
      setFilteredTickets(result.data);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const loadSummary = async () => {
    try {
      const response = await fetch('/api/custom-tickets/summary');
      const result = await response.json();
      
      if (result.success) {
        setSummary(result.data);
      }
    } catch (error) {
      console.error('Error loading summary:', error);
    }
  };

  React.useEffect(() => {
    loadTickets();
    loadSummary();
  }, [loadTickets]);

  // Handle search, filters, and sorting
  React.useEffect(() => {
    let updatedTickets = [...tickets];

    // Apply search
    if (searchQuery) {
      updatedTickets = updatedTickets.filter(ticket =>
        ticket.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.ticketID?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.clientInfo?.name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply sorting
    updatedTickets.sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

    setFilteredTickets(updatedTickets);
    setPage(1); // Reset to first page when filters change
  }, [searchQuery, tickets, sortOrder]);

  const clearFilters = () => {
    setFilters({
      type: '',
      status: '',
      paymentReceived: '',
      cardPaymentStatus: '',
      hasShopifyOrders: false
    });
    setSearchQuery('');
  };

  const handleAddTicket = async (newTicket) => {
    try {
      const response = await fetch('/api/custom-tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newTicket),
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error);
      }

      // Reload tickets and summary
      loadTickets();
      loadSummary();
    } catch (error) {
      console.error('Failed to add ticket:', error);
      throw error;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in-progress': return 'primary';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  const getCardPaymentStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'success';
      case 'partial': return 'warning';
      case 'unpaid': return 'error';
      default: return 'default';
    }
  };

  const handleTicketClick = (ticketID) => {
    router.push(`/dashboard/custom-tickets/${ticketID}`);
  };

  if (loading) {
    return (
      <PageContainer
        title="Custom Tickets"
        breadcrumbs={[
          { title: 'Dashboard', path: '/dashboard' },
          { title: 'Custom Tickets', path: '/dashboard/custom-tickets' }
        ]}
      >
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <CircularProgress />
        </Box>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer
        title="Custom Tickets"
        breadcrumbs={[
          { title: 'Dashboard', path: '/dashboard' },
          { title: 'Custom Tickets', path: '/dashboard/custom-tickets' }
        ]}
      >
        <Alert severity="error" sx={{ mt: 2 }}>
          Error loading tickets: {error}
        </Alert>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Custom Tickets"
      breadcrumbs={[
        { title: 'Dashboard', path: '/dashboard' },
        { title: 'Custom Tickets', path: '/dashboard/custom-tickets' }
      ]}
    >
      {/* Summary Cards */}
      <CustomTicketSummary summary={summary} />

      {/* Filters */}
      <CustomTicketFilters
        filters={filters}
        setFilters={setFilters}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        onOpenNewTicket={() => setOpen(true)}
        onClearFilters={clearFilters}
      />

      {/* Tickets Grid */}
      <Box 
        sx={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', 
          gap: 3,
          mb: 4
        }}
      >
        {filteredTickets.slice((page - 1) * rowsPerPage, page * rowsPerPage).map((ticket) => (
          <Card 
            key={ticket._id}
            sx={{
              borderRadius: '16px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              overflow: 'hidden',
              transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
              cursor: 'pointer',
              '&:hover': {
                transform: 'scale(1.02)',
                boxShadow: '0 6px 16px rgba(0,0,0,0.15)',
              }
            }}
            onClick={() => handleTicketClick(ticket.ticketID)}
          >
            <CardContent sx={{ p: 3 }}>
              {/* Header */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box>
                  <Typography variant="h6" fontWeight="600" sx={{ mb: 0.5 }}>
                    {ticket.title}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                    ID: {ticket.ticketID}
                  </Typography>
                </Box>
                <Chip 
                  label={ticket.type} 
                  color="secondary" 
                  size="small"
                  sx={{ textTransform: 'capitalize' }}
                />
              </Box>

              {/* Description */}
              <Typography 
                variant="body2" 
                sx={{ 
                  color: 'text.secondary', 
                  mb: 2,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}
              >
                {ticket.description}
              </Typography>

              {/* Client Info */}
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                <strong>Client:</strong> {ticket.clientInfo?.name || 'N/A'}
              </Typography>

              {/* Quote Total */}
              {ticket.quoteTotal && (
                <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 'bold', mb: 2 }}>
                  ${ticket.quoteTotal.toFixed(2)}
                </Typography>
              )}

              {/* Status Chips */}
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                <Chip 
                  label={ticket.status} 
                  color={getStatusColor(ticket.status)}
                  size="small"
                  sx={{ textTransform: 'capitalize' }}
                />
                
                <Chip 
                  label={ticket.paymentReceived ? 'Payment Received' : 'Payment Pending'} 
                  color={ticket.paymentReceived ? 'success' : 'error'}
                  size="small"
                  variant="outlined"
                />

                {ticket.cardPaymentStatus && (
                  <Chip 
                    label={`Card: ${ticket.cardPaymentStatus}`} 
                    color={getCardPaymentStatusColor(ticket.cardPaymentStatus)}
                    size="small"
                    variant="outlined"
                    sx={{ textTransform: 'capitalize' }}
                  />
                )}
              </Box>

              {/* Shopify Orders Status */}
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Deposit:
                  </Typography>
                  <Chip 
                    label={ticket.shopifyDepositOrderId ? 'Created' : 'Pending'}
                    color={ticket.shopifyDepositOrderId ? 'success' : 'default'}
                    size="small"
                    variant="outlined"
                  />
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Final:
                  </Typography>
                  <Chip 
                    label={ticket.shopifyFinalOrderId ? 'Created' : 'Pending'}
                    color={ticket.shopifyFinalOrderId ? 'success' : 'default'}
                    size="small"
                    variant="outlined"
                  />
                </Box>
              </Box>

              {/* Created Date */}
              <Typography 
                variant="caption" 
                sx={{ 
                  color: 'text.secondary', 
                  display: 'block', 
                  mt: 2, 
                  textAlign: 'right' 
                }}
              >
                Created: {new Date(ticket.createdAt).toLocaleDateString()}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* Empty State */}
      {filteredTickets.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" sx={{ color: 'text.secondary', mb: 2 }}>
            No tickets found
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
            {tickets.length === 0 
              ? "Get started by creating your first custom ticket"
              : "Try adjusting your search criteria"
            }
          </Typography>
          <Button 
            variant="contained" 
            onClick={() => setOpen(true)}
          >
            Create New Ticket
          </Button>
        </Box>
      )}

      {/* Pagination */}
      {filteredTickets.length > rowsPerPage && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Pagination
            count={Math.ceil(filteredTickets.length / rowsPerPage)}
            page={page}
            onChange={(event, value) => setPage(value)}
            color="primary"
          />
        </Box>
      )}

      {/* New Ticket Stepper */}
      <NewCustomTicketStepper
        open={open}
        onClose={() => setOpen(false)}
        onSubmit={handleAddTicket}
      />
    </PageContainer>
  );
}

CustomTicketsPage.propTypes = {
  pathname: PropTypes.string,
};
