'use client';

import * as React from 'react';
import {
  Box,
  Typography,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Timeline,
  TimelineItem,
  TimelineOppositeContent,
  TimelineSeparator,
  TimelineDot,
  TimelineConnector,
  TimelineContent,
  Alert
} from '@mui/material';
import { 
  getInternalStatusInfo,
  getNextPossibleStatuses,
  getClientStatusDisplay,
  STATUS_CATEGORIES 
} from '../config/statuses';

export default function StatusWorkflowDialog({ 
  open, 
  onClose, 
  currentStatus, 
  onStatusChange,
  ticketHistory = [] 
}) {
  const [selectedStatus, setSelectedStatus] = React.useState('');
  
  const nextStatuses = getNextPossibleStatuses(currentStatus);
  const currentStatusInfo = getInternalStatusInfo(currentStatus);
  const clientView = getClientStatusDisplay(currentStatus);

  const handleStatusChange = () => {
    if (selectedStatus && onStatusChange) {
      onStatusChange(selectedStatus);
      setSelectedStatus('');
      onClose();
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 }
      }}
    >
      <DialogTitle>
        <Typography variant="h6" component="div" sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          Status Workflow Management
          <Chip 
            label={`${currentStatusInfo.icon} ${currentStatusInfo.label}`}
            color={currentStatusInfo.color}
            size="small"
          />
        </Typography>
      </DialogTitle>
      
      <DialogContent sx={{ minHeight: 400 }}>
        <Box sx={{ mb: 3 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Current Status:</strong> {currentStatusInfo.label}
            </Typography>
            <Typography variant="body2">
              <strong>Client Sees:</strong> {clientView.label} - {clientView.description}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Category: {STATUS_CATEGORIES[currentStatusInfo.category]?.label}
            </Typography>
          </Alert>
        </Box>

        <Box sx={{ display: 'flex', gap: 3 }}>
          {/* Left Side: Next Possible Statuses */}
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" gutterBottom>
              Next Possible Steps
            </Typography>
            
            {nextStatuses.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {nextStatuses.map((status) => {
                  const statusInfo = getInternalStatusInfo(status);
                  const clientInfo = getClientStatusDisplay(status);
                  
                  return (
                    <Box 
                      key={status}
                      sx={{ 
                        p: 2, 
                        border: '1px solid',
                        borderColor: selectedStatus === status ? 'primary.main' : 'divider',
                        borderRadius: 1,
                        cursor: 'pointer',
                        bgcolor: selectedStatus === status ? 'primary.50' : 'background.paper',
                        '&:hover': {
                          bgcolor: 'action.hover'
                        }
                      }}
                      onClick={() => setSelectedStatus(status)}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography variant="body2">
                          {statusInfo.icon} <strong>{statusInfo.label}</strong>
                        </Typography>
                        <Chip 
                          label={STATUS_CATEGORIES[statusInfo.category]?.label}
                          color={statusInfo.color}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        {statusInfo.description}
                      </Typography>
                      <Typography variant="caption" color="primary.main">
                        → Client will see: &quot;{clientInfo.label}&quot;
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            ) : (
              <Alert severity="info">
                This is a terminal status. No further transitions are typically needed.
              </Alert>
            )}
          </Box>

          {/* Right Side: Status History Timeline */}
          <Box sx={{ flex: 1, maxHeight: 400, overflow: 'auto' }}>
            <Typography variant="h6" gutterBottom>
              Status History
            </Typography>
            
            {ticketHistory.length > 0 ? (
              <Timeline position="left">
                {ticketHistory
                  .filter(entry => entry.action?.includes('status') || entry.status)
                  .reverse()
                  .map((entry, index) => {
                    const statusInfo = getInternalStatusInfo(entry.status || currentStatus);
                    
                    return (
                      <TimelineItem key={index}>
                        <TimelineOppositeContent sx={{ flex: 0.3 }}>
                          <Typography variant="caption" color="text.secondary">
                            {entry.timestamp ? new Date(entry.timestamp).toLocaleDateString() : 'Now'}
                          </Typography>
                        </TimelineOppositeContent>
                        <TimelineSeparator>
                          <TimelineDot 
                            color={statusInfo.color}
                            sx={{ fontSize: '0.8rem' }}
                          >
                            {statusInfo.icon}
                          </TimelineDot>
                          {index < ticketHistory.length - 1 && <TimelineConnector />}
                        </TimelineSeparator>
                        <TimelineContent>
                          <Typography variant="body2" fontWeight="600">
                            {statusInfo.label}
                          </Typography>
                          {entry.notes && (
                            <Typography variant="caption" color="text.secondary">
                              {entry.notes}
                            </Typography>
                          )}
                          {entry.by && (
                            <Typography variant="caption" sx={{ display: 'block', color: 'primary.main' }}>
                              by {entry.by}
                            </Typography>
                          )}
                        </TimelineContent>
                      </TimelineItem>
                    );
                  })}
              </Timeline>
            ) : (
              <Alert severity="info">
                No status history available.
              </Alert>
            )}
          </Box>
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Button onClick={onClose}>
          Cancel
        </Button>
        <Button 
          onClick={handleStatusChange}
          variant="contained"
          disabled={!selectedStatus}
        >
          {selectedStatus 
            ? `Change to ${getInternalStatusInfo(selectedStatus).label}`
            : 'Select a Status'
          }
        </Button>
      </DialogActions>
    </Dialog>
  );
}