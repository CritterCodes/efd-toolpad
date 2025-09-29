/**
 * Custom Ticket Header Component
 * Displays ticket title, status, and primary actions - Constitutional Architecture
 */

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Button,
  Chip,
  IconButton,
  CircularProgress
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import { getClientStatusDisplay } from '@/config/statuses';

export function CustomTicketHeader({ 
  ticket, 
  loading, 
  saving,
  statusColor = 'default',
  requiresAction = false,
  onEdit,
  onSave,
  editMode = false
}) {
  const router = useRouter();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <CircularProgress size={24} />
        <Typography variant="h4">Loading ticket...</Typography>
      </Box>
    );
  }

  if (!ticket) {
    return (
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" color="error">Ticket not found</Typography>
      </Box>
    );
  }

  const displayStatus = getClientStatusDisplay(ticket.status);
  const isPriority = ticket.priority === 'high' || requiresAction;

  return (
    <Box sx={{ mb: 3 }}>
      {/* Back Button */}
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => router.back()}
        sx={{ mb: 2 }}
        variant="outlined"
      >
        Back to Custom Tickets
      </Button>

      {/* Header Content */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: 2 
      }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {/* Ticket ID */}
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Ticket #{ticket.ticketID}
          </Typography>

          {/* Title */}
          <Typography 
            variant="h4" 
            component="h1" 
            gutterBottom
            sx={{ 
              wordBreak: 'break-word',
              fontSize: { xs: '1.5rem', md: '2rem' }
            }}
          >
            {ticket.title || ticket.type || 'Custom Ticket'}
          </Typography>

          {/* Status and Priority Chips */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
            <Chip
              label={displayStatus.label}
              color={displayStatus.color}
              variant={requiresAction ? 'filled' : 'outlined'}
              size="medium"
            />
            
            {isPriority && (
              <Chip
                label="High Priority"
                color="error"
                size="small"
                variant="filled"
              />
            )}

            {ticket.isRush && (
              <Chip
                label="Rush Order"
                color="warning"
                size="small"
                variant="filled"
              />
            )}

            {ticket.needsAttention && (
              <Chip
                label="Needs Attention"
                color="error"
                size="small"
                variant="outlined"
              />
            )}
          </Box>

          {/* Dates */}
          <Typography variant="body2" color="text.secondary">
            Created: {new Date(ticket.createdAt).toLocaleDateString()}
            {ticket.updatedAt && (
              <> • Updated: {new Date(ticket.updatedAt).toLocaleDateString()}</>
            )}
          </Typography>
        </Box>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
          {editMode ? (
            <Button
              variant="contained"
              startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
              onClick={onSave}
              disabled={saving}
              color="primary"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          ) : (
            <IconButton
              onClick={onEdit}
              color="primary"
              size="large"
              title="Edit ticket"
            >
              <EditIcon />
            </IconButton>
          )}
        </Box>
      </Box>
    </Box>
  );
}

export default CustomTicketHeader;