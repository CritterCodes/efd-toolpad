import * as React from 'react';
import { Paper, Box, Chip, Typography, Alert, Button } from '@mui/material';
import { getInternalStatusInfo } from '../../config/statuses';

export default function WorkflowSpecialState({
  currentStatusInfo,
  clientView,
  nextStatuses,
  disabled,
  onStatusChange
}) {
  return (
    <Paper sx={{ p: 3, borderRadius: 2 }}>
      <Box sx={{ textAlign: 'center' }}>
        <Chip 
          label={`${currentStatusInfo.icon} ${currentStatusInfo.label}`}
          color={currentStatusInfo.color}
          size="large"
          sx={{ mb: 2, fontSize: '1.1rem', py: 3 }}
        />
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {currentStatusInfo.description}
        </Typography>
        
        <Alert severity={currentStatusInfo.color === 'error' ? 'error' : 'warning'} sx={{ mb: 2 }}>
          <Typography variant="body2">
            <strong>Client sees:</strong> {clientView.label}
          </Typography>
          <Typography variant="caption">
            {clientView.description}
          </Typography>
        </Alert>

        {nextStatuses.length > 0 && (
          <Box>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Possible next steps:
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
              {nextStatuses.map(status => {
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
            </Box>
          </Box>
        )}
      </Box>
    </Paper>
  );
}