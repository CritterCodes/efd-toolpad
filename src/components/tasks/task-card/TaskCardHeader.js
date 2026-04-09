import React from 'react';
import { Box, Typography } from '@mui/material';

export function TaskCardHeader({
  task,
  isCurrentMetalSupported,
  currentPrice,
  formatPrice,
  displayName
}) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
      <Box sx={{ flex: 1 }}>
        <Typography variant="h6" component="h3">
          {task.name || task.title}
        </Typography>
        
        {task.description && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {task.description}
          </Typography>
        )}
      </Box>

      <Box sx={{ textAlign: 'right', minWidth: 120 }}>
        {isCurrentMetalSupported ? (
          <>
            <Typography variant="h5" color="primary.main" fontWeight="bold">
              {formatPrice(currentPrice)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {displayName}
            </Typography>
          </>
        ) : (
          <>
            <Typography variant="h5" color="text.disabled">
              N/A
            </Typography>
            <Typography variant="caption" color="error.main">
              Not compatible
            </Typography>
          </>
        )}
      </Box>
    </Box>
  );
}