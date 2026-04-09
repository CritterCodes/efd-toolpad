import React from 'react';
import {
  Box,
  Typography,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import { Edit as EditIcon } from '@mui/icons-material';

export function TimelineHeader({ 
  clientDisplay, 
  allowEditing, 
  showEditor, 
  statusLoading, 
  onEditClick 
}) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
      <Typography variant="h6">
        Order Progress
      </Typography>
      
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Chip 
          label={clientDisplay.label}
          color={clientDisplay.color}
          variant="filled"
          size="small"
        />
        
        {allowEditing && !showEditor && (
          <Tooltip title="Update Status">
            <IconButton 
              size="small" 
              onClick={onEditClick}
              disabled={statusLoading}
            >
              <EditIcon />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </Box>
  );
}
