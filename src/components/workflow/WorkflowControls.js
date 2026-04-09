import * as React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { PauseCircleOutline } from '@mui/icons-material';
import { getInternalStatusInfo, INTERNAL_STATUSES } from '../../config/statuses';

export default function WorkflowControls({
  nextStatuses,
  disabled,
  onStatusChange
}) {
  if (!nextStatuses || nextStatuses.length === 0) {
    return null;
  }

  return (
    <Box sx={{ mt: 3, textAlign: 'center' }}>
      <Typography variant="body2" sx={{ mb: 1 }}>
        Quick Actions:
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
        {nextStatuses.slice(0, 4).map(status => { // Show max 4 quick actions
          const statusInfo = getInternalStatusInfo(status);
          return (
            <Button
              key={status}
              size="small"
              variant="outlined"
              onClick={() => onStatusChange(status)}
              disabled={disabled}
              startIcon={<span>{statusInfo.icon}</span>}
            >
              {statusInfo.label}
            </Button>
          );
        })}
        
        {/* Special statuses always available */}
        <Button
          size="small"
          variant="outlined"
          color="secondary"
          onClick={() => onStatusChange(INTERNAL_STATUSES.ON_HOLD)}
          disabled={disabled}
          startIcon={<PauseCircleOutline />}
        >
          Put On Hold
        </Button>
        
        <Button
          size="small"
          variant="outlined"
          color="warning"
          onClick={() => onStatusChange(INTERNAL_STATUSES.DEAD_LEAD)}
          disabled={disabled}
          startIcon={<span>👻</span>}
        >
          Mark as Dead Lead
        </Button>
      </Box>
    </Box>
  );
}