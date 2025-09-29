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
import Image from 'next/image';
import CustomTicketFilters from '@/app/components/custom-tickets/filters.component';
import CustomTicketSummary from '@/app/components/custom-tickets/summary.component';
import NewCustomTicketStepper from '@/app/components/custom-tickets/newCustomTicketStepper.component';
import { 
  getInternalStatusInfo, 
  getClientStatusInfo 
} from '@/config/customTicketStatuses';

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
    const statusInfo = getInternalStatusInfo(status);
    return statusInfo.color || 'default';
  };

  const getStatusIcon = (status) => {
    const statusInfo = getInternalStatusInfo(status);
    return statusInfo.icon || '📋';
  };

  const getClientStatusDisplay = (internalStatus) => {
    const clientStatusInfo = getClientStatusInfo(internalStatus);
    return {
      label: clientStatusInfo.label,
      description: clientStatusInfo.description,
      color: clientStatusInfo.color,
      icon: clientStatusInfo.icon
    };
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

              {/* Request Details Preview */}
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                  {ticket.requestDetails?.jewelryType && (
                    <Chip 
                      label={ticket.requestDetails.jewelryType} 
                      size="small" 
                      variant="outlined"
                      sx={{ fontSize: '0.75rem' }}
                    />
                  )}
                  {ticket.requestDetails?.metalType && (
                    <Chip 
                      label={ticket.requestDetails.metalType} 
                      size="small" 
                      variant="outlined" 
                      color="primary"
                      sx={{ fontSize: '0.75rem' }}
                    />
                  )}
                  {ticket.requestDetails?.size && (
                    <Chip 
                      label={`Size ${ticket.requestDetails.size}`} 
                      size="small" 
                      variant="outlined"
                      sx={{ fontSize: '0.75rem' }}
                    />
                  )}
                </Box>
                
                {/* Gemstones */}
                {ticket.requestDetails?.gemstones && ticket.requestDetails.gemstones.length > 0 && (
                  <Box sx={{ display: 'flex', gap: 0.5, mb: 1, flexWrap: 'wrap' }}>
                    {ticket.requestDetails.gemstones.map((gem, index) => (
                      <Chip 
                        key={index}
                        label={gem} 
                        size="small" 
                        color="secondary" 
                        variant="filled"
                        sx={{ fontSize: '0.7rem' }}
                      />
                    ))}
                  </Box>
                )}

                {/* Budget & Timeline */}
                <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
                  {ticket.requestDetails?.budget && (
                    <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 500 }}>
                      💰 {ticket.requestDetails.budget}
                    </Typography>
                  )}
                  {ticket.requestDetails?.timeline && (
                    <Typography variant="caption" sx={{ color: 'info.main', fontWeight: 500 }}>
                      ⏱️ {ticket.requestDetails.timeline}
                    </Typography>
                  )}
                </Box>
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
                  overflow: 'hidden',
                  fontStyle: ticket.description ? 'normal' : 'italic'
                }}
              >
                {ticket.description || 'No description provided'}
              </Typography>

              {/* Reference Images Preview */}
              {ticket.requestDetails?.referenceImages && ticket.requestDetails.referenceImages.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', mb: 1, display: 'block' }}>
                    Reference Images ({ticket.requestDetails.referenceImages.length})
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, overflow: 'hidden' }}>
                    {ticket.requestDetails.referenceImages.slice(0, 3).map((image, index) => (
                      <Box
                        key={index}
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: 1,
                          overflow: 'hidden',
                          border: '1px solid',
                          borderColor: 'divider'
                        }}
                      >
                        <Image
                          src={image}
                          alt={`Reference ${index + 1}`}
                          fill
                          style={{
                            objectFit: 'cover'
                          }}
                        />
                      </Box>
                    ))}
                    {ticket.requestDetails.referenceImages.length > 3 && (
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: 1,
                          border: '1px solid',
                          borderColor: 'divider',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: 'grey.100'
                        }}
                      >
                        <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                          +{ticket.requestDetails.referenceImages.length - 3}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Box>
              )}

              {/* Files Preview */}
              {((ticket.files?.moodBoard && ticket.files.moodBoard.length > 0) || 
                (ticket.files?.designFiles && ticket.files.designFiles.length > 0)) && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', mb: 1, display: 'block' }}>
                    Attached Files
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {ticket.files.moodBoard?.length > 0 && (
                      <Chip 
                        label={`📋 Mood Board (${ticket.files.moodBoard.length})`} 
                        size="small" 
                        variant="outlined"
                        sx={{ fontSize: '0.7rem' }}
                      />
                    )}
                    {ticket.files.designFiles?.length > 0 && (
                      <Chip 
                        label={`📐 Design Files (${ticket.files.designFiles.length})`} 
                        size="small" 
                        variant="outlined"
                        sx={{ fontSize: '0.7rem' }}
                      />
                    )}
                  </Box>
                </Box>
              )}

              {/* Client Info */}
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                <strong>Client:</strong> {ticket.clientInfo?.name || ticket.userID || 'N/A'}
              </Typography>

              {/* Priority */}
              {ticket.priority && ticket.priority !== 'normal' && (
                <Box sx={{ mb: 1 }}>
                  <Chip 
                    label={`${ticket.priority.toUpperCase()} PRIORITY`} 
                    color={ticket.priority === 'high' ? 'error' : ticket.priority === 'urgent' ? 'error' : 'warning'}
                    size="small"
                    sx={{ fontWeight: 'bold', fontSize: '0.7rem' }}
                  />
                </Box>
              )}

              {/* Quote Total */}
              {ticket.quoteTotal && (
                <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 'bold', mb: 2 }}>
                  ${ticket.quoteTotal.toFixed(2)}
                </Typography>
              )}

              {/* Special Requests */}
              {ticket.requestDetails?.specialRequests && (
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: 'warning.main', 
                    display: 'block', 
                    mb: 2,
                    fontStyle: 'italic',
                    p: 1,
                    bgcolor: 'warning.light',
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'warning.main'
                  }}
                >
                  <strong>Special Request:</strong> {ticket.requestDetails.specialRequests}
                </Typography>
              )}

              {/* Communications Count */}
              {ticket.communications && ticket.communications.length > 0 && (
                <Typography variant="caption" sx={{ color: 'info.main', mb: 1, display: 'block' }}>
                  💬 {ticket.communications.length} communication{ticket.communications.length !== 1 ? 's' : ''}
                </Typography>
              )}

              {/* Admin Notes Count */}
              {ticket.adminNotes && ticket.adminNotes.length > 0 && (
                <Typography variant="caption" sx={{ color: 'secondary.main', mb: 1, display: 'block' }}>
                  📝 {ticket.adminNotes.length} admin note{ticket.adminNotes.length !== 1 ? 's' : ''}
                </Typography>
              )}

              {/* Assigned To */}
              {ticket.assignedTo && (
                <Typography variant="caption" sx={{ color: 'primary.main', mb: 1, display: 'block' }}>
                  👤 Assigned to: {ticket.assignedTo}
                </Typography>
              )}

              {/* Estimated Completion */}
              {ticket.estimatedCompletion && (
                <Typography variant="caption" sx={{ color: 'success.main', mb: 1, display: 'block' }}>
                  🎯 Est. Completion: {new Date(ticket.estimatedCompletion).toLocaleDateString()}
                </Typography>
              )}

              {/* Status */}
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2, alignItems: 'center' }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <Chip 
                    label={`${getStatusIcon(ticket.status)} ${getInternalStatusInfo(ticket.status).label}`} 
                    color={getStatusColor(ticket.status)}
                    size="medium"
                    sx={{ fontWeight: 'bold' }}
                  />
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                      Client sees:
                    </Typography>
                    <Chip 
                      label={getClientStatusDisplay(ticket.status).label}
                      color={getClientStatusDisplay(ticket.status).color}
                      size="small"
                      variant="outlined"
                      sx={{ height: '20px', fontSize: '0.65rem', '& .MuiChip-label': { px: 1 } }}
                    />
                  </Box>
                </Box>
                
                {/* Last Communication Indicator */}
                {ticket.communications && ticket.communications.length > 0 && (
                  <Typography variant="caption" sx={{ color: 'info.main', ml: 'auto' }}>
                    Last contact: {new Date(ticket.communications[ticket.communications.length - 1].date || ticket.updatedAt).toLocaleDateString()}
                  </Typography>
                )}
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
