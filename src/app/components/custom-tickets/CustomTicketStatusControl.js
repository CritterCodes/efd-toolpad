/**
 * Custom Ticket Status Control Component
 * Handles status display and transitions - Constitutional Architecture
 */

import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Box,
  Chip,
  CircularProgress,
  Alert
} from '@mui/material';
import { getClientStatusDisplay, getInternalStatusInfo } from '@/config/statuses';

export function CustomTicketStatusControl({ 
  ticket,
  availableStatuses = [],
  currentStatusInfo,
  statusLoading = false,
  statusError = null,
  onStatusUpdate,
  onClearError
}) {
  const [selectedStatus, setSelectedStatus] = React.useState('');

  React.useEffect(() => {
    // Clear selection when ticket changes
    setSelectedStatus('');
  }, [ticket?.ticketID]);

  const handleStatusChange = (event) => {
    setSelectedStatus(event.target.value);
  };

  const handleUpdateStatus = async () => {
    if (!selectedStatus || !onStatusUpdate) return;

    const result = await onStatusUpdate(selectedStatus);
    if (result.success) {
      setSelectedStatus(''); // Clear selection after successful update
    }
  };

  if (!ticket) return null;

  const currentDisplay = getClientStatusDisplay(ticket.status);
  const statusColor = currentStatusInfo?.color || 'default';
  const requiresAction = currentStatusInfo?.requiresAction || false;

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Status Management
        </Typography>

        {/* Current Status Display */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Current Status
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            <Chip
              label={currentDisplay.label}
              color={currentDisplay.color}
              variant={requiresAction ? 'filled' : 'outlined'}
              size="medium"
            />
            
            {requiresAction && (
              <Chip
                label="Action Required"
                color="warning"
                size="small"
                variant="filled"
              />
            )}
          </Box>

          {currentStatusInfo?.description && (
            <Typography variant="body2" color="text.secondary">
              {currentStatusInfo.description}
            </Typography>
          )}

          {ticket.daysInStatus && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              In current status for {ticket.daysInStatus} days
            </Typography>
          )}
        </Box>

        {/* Status Transition Control */}
        {availableStatuses.length > 0 && (
          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Change Status
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>New Status</InputLabel>
                <Select
                  value={selectedStatus}
                  onChange={handleStatusChange}
                  label="New Status"
                  disabled={statusLoading}
                  size="small"
                >
                  {availableStatuses.map((status) => {
                    const statusInfo = getInternalStatusInfo(status);
                    const displayName = getClientStatusDisplay(status);
                    
                    return (
                      <MenuItem key={status} value={status}>
                        <Box>
                          <Typography variant="body2">
                            {displayName.label}
                          </Typography>
                          {statusInfo?.description && (
                            <Typography variant="caption" color="text.secondary">
                              {statusInfo.description}
                            </Typography>
                          )}
                        </Box>
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>

              <Button
                variant="contained"
                onClick={handleUpdateStatus}
                disabled={!selectedStatus || statusLoading}
                startIcon={statusLoading ? <CircularProgress size={16} /> : null}
              >
                {statusLoading ? 'Updating...' : 'Update Status'}
              </Button>
            </Box>
          </Box>
        )}

        {/* Status Error Display */}
        {statusError && (
          <Alert 
            severity="error" 
            sx={{ mt: 2 }}
            onClose={onClearError}
            action={
              <Button color="inherit" size="small" onClick={onClearError}>
                Dismiss
              </Button>
            }
          >
            {statusError}
          </Alert>
        )}

        {/* Status History Preview */}
        {ticket.statusHistory && ticket.statusHistory.length > 1 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Recent Status Changes
            </Typography>
            
            <Box sx={{ maxHeight: 150, overflowY: 'auto' }}>
              {ticket.statusHistory.slice(-3).reverse().map((entry, index) => (
                <Box key={entry.changedAt || index} sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  py: 0.5,
                  borderBottom: index < 2 ? '1px solid' : 'none',
                  borderColor: 'grey.200'
                }}>
                  <Box>
                    <Typography variant="body2">
                      {getClientStatusDisplay(entry.status).label}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      by {entry.changedBy || 'System'}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(entry.changedAt).toLocaleDateString()}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

export default CustomTicketStatusControl;