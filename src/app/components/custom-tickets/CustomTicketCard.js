/**
 * Custom Ticket Card Component
 * Individual ticket card display following constitutional component standards
 */

import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Chip,
  Box,
  Button,
  Avatar
} from '@mui/material';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { getClientStatusInfo } from '@/config/statuses';

const CustomTicketCard = ({ ticket }) => {
  const router = useRouter();
  
  const statusInfo = getClientStatusInfo(ticket.status);
  const hasImages = ticket.files?.moodBoard && ticket.files.moodBoard.length > 0;
  
  const handleViewDetails = () => {
    router.push(`/dashboard/custom-tickets/${ticket.ticketID}`);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    if (!amount) return 'TBD';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <Card 
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        cursor: 'pointer',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: 3
        }
      }}
      onClick={handleViewDetails}
    >
      <CardContent sx={{ flexGrow: 1 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Typography variant="h6" component="h3" sx={{ fontWeight: 600 }}>
            {ticket.title || 'Custom Jewelry Request'}
          </Typography>
          <Chip
            label={statusInfo.label}
            color={statusInfo.color}
            size="small"
            variant="outlined"
          />
        </Box>

        {/* Client Info */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Avatar sx={{ width: 32, height: 32, mr: 1, fontSize: '0.875rem' }}>
            {ticket.firstName?.[0]}{ticket.lastName?.[0]}
          </Avatar>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {ticket.firstName} {ticket.lastName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {ticket.email}
            </Typography>
          </Box>
        </Box>

        {/* Description */}
        {ticket.description && (
          <Typography 
            variant="body2" 
            color="text.secondary" 
            sx={{ 
              mb: 2,
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}
          >
            {ticket.description}
          </Typography>
        )}

        {/* Images Preview */}
        {hasImages && (
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {ticket.files.moodBoard.slice(0, 3).map((image, index) => (
                <Box
                  key={index}
                  sx={{
                    position: 'relative',
                    width: 60,
                    height: 60,
                    borderRadius: 1,
                    overflow: 'hidden',
                    border: '1px solid',
                    borderColor: 'divider'
                  }}
                >
                  <Image
                    src={image.url || image}
                    alt={`Reference ${index + 1}`}
                    fill
                    style={{ objectFit: 'cover' }}
                  />
                </Box>
              ))}
              {ticket.files.moodBoard.length > 3 && (
                <Box
                  sx={{
                    width: 60,
                    height: 60,
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'grey.100'
                  }}
                >
                  <Typography variant="caption" color="text.secondary">
                    +{ticket.files.moodBoard.length - 3}
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        )}

        {/* Metadata */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 'auto' }}>
          <Typography variant="caption" color="text.secondary">
            {formatDate(ticket.createdAt)}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {formatCurrency(ticket.estimatedCost || ticket.quotedPrice)}
          </Typography>
        </Box>

        {/* Payment Status */}
        {(ticket.depositRequired || ticket.finalPaymentRequired) && (
          <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {ticket.depositRequired && (
              <Chip
                label="Deposit Required"
                size="small"
                color="warning"
                variant="outlined"
              />
            )}
            {ticket.finalPaymentRequired && (
              <Chip
                label="Final Payment Required"
                size="small"
                color="error"
                variant="outlined"
              />
            )}
          </Box>
        )}

        {/* Assigned Artisans */}
        {ticket.assignedArtisans && ticket.assignedArtisans.length > 0 && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
              Assigned Artisans:
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {ticket.assignedArtisans.map((artisan, index) => (
                <Chip
                  key={index}
                  label={`${artisan.userName} (${artisan.artisanType})`}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              ))}
            </Box>
          </Box>
        )}
      </CardContent>

      {/* Actions */}
      <Box sx={{ p: 2, pt: 0 }}>
        <Button
          variant="outlined"
          fullWidth
          onClick={(e) => {
            e.stopPropagation();
            handleViewDetails();
          }}
        >
          View Details
        </Button>
      </Box>
    </Card>
  );
};

export default CustomTicketCard;