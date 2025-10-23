/**
 * Custom Ticket Details Overview Component
 * Displays ticket basic information and customer details - Constitutional Architecture
 */

import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Box,
  Chip,
  Avatar
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';

export function CustomTicketOverview({ ticket }) {
  if (!ticket) return null;

  const formatCurrency = (amount) => {
    if (!amount) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatJewelryType = (type) => {
    if (!type) return 'Custom Design';
    return type.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Ticket Overview
        </Typography>

        <Grid container spacing={3}>
          {/* Customer Information */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Customer Information
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                <PersonIcon />
              </Avatar>
              <Box>
                <Typography variant="body1" fontWeight="medium">
                  {ticket.customerName || 'Unknown Customer'}
                </Typography>
                {ticket.customerEmail && (
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                    <EmailIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                      {ticket.customerEmail}
                    </Typography>
                  </Box>
                )}
                {ticket.customerPhone && (
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                    <PhoneIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                      {ticket.customerPhone}
                    </Typography>
                  </Box>
                )}
                {ticket.userID && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    User ID: {ticket.userID}
                  </Typography>
                )}
              </Box>
            </Box>
          </Grid>

          {/* Ticket Details */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Ticket Details
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">Type:</Typography>
                <Typography variant="body2" fontWeight="medium">
                  {formatJewelryType(ticket.type)}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">Priority:</Typography>
                <Chip 
                  label={ticket.priority?.toUpperCase() || 'NORMAL'} 
                  size="small" 
                  color={ticket.priority === 'high' ? 'error' : 'default'}
                />
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">Created:</Typography>
                <Typography variant="body2">
                  {formatDate(ticket.createdAt)}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">Updated:</Typography>
                <Typography variant="body2">
                  {formatDate(ticket.updatedAt)}
                </Typography>
              </Box>

              {ticket.requestDetails?.jewelryType && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Jewelry Type:</Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {ticket.requestDetails.jewelryType}
                  </Typography>
                </Box>
              )}

              {ticket.requestDetails?.metalType && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Metal:</Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {ticket.requestDetails.metalType}
                  </Typography>
                </Box>
              )}

              {ticket.requestDetails?.size && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Size:</Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {ticket.requestDetails.size}
                  </Typography>
                </Box>
              )}

              {ticket.requestDetails?.budget && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Budget:</Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {ticket.requestDetails.budget}
                  </Typography>
                </Box>
              )}

              {ticket.dueDate && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Due Date:</Typography>
                  <Typography variant="body2">
                    {formatDate(ticket.dueDate)}
                  </Typography>
                </Box>
              )}

              {ticket.estimatedCompletion && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Est. Completion:</Typography>
                  <Typography variant="body2">
                    {formatDate(ticket.estimatedCompletion)}
                  </Typography>
                </Box>
              )}
            </Box>
          </Grid>

          {/* Description and Special Requests */}
          {(ticket.description || ticket.requestDetails?.specialRequests) && (
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Additional Details
              </Typography>
              
              {ticket.description && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Description:
                  </Typography>
                  <Typography variant="body2" sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1, whiteSpace: 'pre-wrap' }}>
                    {ticket.description}
                  </Typography>
                </Box>
              )}
              
              {ticket.requestDetails?.specialRequests && ticket.requestDetails.specialRequests.trim() && (
                <Box sx={{ mb: 1 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Special Requests:
                  </Typography>
                  <Typography variant="body2" sx={{ p: 2, bgcolor: 'warning.50', borderRadius: 1, whiteSpace: 'pre-wrap' }}>
                    {ticket.requestDetails.specialRequests}
                  </Typography>
                </Box>
              )}
            </Grid>
          )}

          {/* Financial Overview */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Financial Summary
            </Typography>
            
            <Grid container spacing={2}>
              {ticket.quoteTotal && (
                <Grid item xs={6} sm={4}>
                  <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Quote Total
                    </Typography>
                    <Typography variant="h6" color="primary">
                      {formatCurrency(ticket.quoteTotal)}
                    </Typography>
                  </Box>
                </Grid>
              )}

              {ticket.amountOwedToCard !== undefined && (
                <Grid item xs={6} sm={4}>
                  <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Owed to Card
                    </Typography>
                    <Typography variant="h6" color={ticket.amountOwedToCard > 0 ? 'warning.main' : 'success.main'}>
                      {formatCurrency(ticket.amountOwedToCard)}
                    </Typography>
                  </Box>
                </Grid>
              )}

              {ticket.requestDetails?.timeline && (
                <Grid item xs={6} sm={4}>
                  <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Timeline
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {ticket.requestDetails.timeline}
                    </Typography>
                  </Box>
                </Grid>
              )}
            </Grid>
          </Grid>

          {/* Properties & Status Indicators */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Status & Properties
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {ticket.requestDetails?.gemstones?.length > 0 && (
                <Chip 
                  label={`Gemstones: ${ticket.requestDetails.gemstones.join(', ')}`} 
                  color="info" 
                  size="small" 
                  variant="outlined" 
                />
              )}
              
              {ticket.priority === 'high' && (
                <Chip label="High Priority" color="error" size="small" />
              )}
              
              {ticket.assignedTo && (
                <Chip label={`Assigned: ${ticket.assignedTo}`} color="primary" size="small" variant="outlined" />
              )}

              {ticket.amountOwedToCard === 0 && (
                <Chip label="No Outstanding Balance" color="success" size="small" />
              )}

              {ticket.requestDetails?.specialRequests && ticket.requestDetails.specialRequests.trim() && (
                <Chip label="Special Requests" color="warning" size="small" variant="outlined" />
              )}

              {ticket.communications?.length === 0 && ticket.notes?.length === 0 && (
                <Chip label="No Communications" color="default" size="small" variant="outlined" />
              )}
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}

export default CustomTicketOverview;