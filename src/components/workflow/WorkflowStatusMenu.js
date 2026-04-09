import * as React from 'react';
import { Menu, MenuItem, Box, Typography } from '@mui/material';
import { getInternalStatusInfo } from '../../config/statuses';

export default function WorkflowStatusMenu({
  anchorEl,
  selectedStageForMenu,
  currentStatus,
  nextStatuses,
  onClose,
  onStatusSelect
}) {
  return (
    <Menu
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      onClose={onClose}
      PaperProps={{
        sx: { minWidth: 250 }
      }}
    >
      {selectedStageForMenu && (
        <Box>
          <MenuItem disabled>
            <Typography variant="subtitle2">
              {selectedStageForMenu.stage.label} Statuses
            </Typography>
          </MenuItem>
          {selectedStageForMenu.stage.statuses
            .filter(status => nextStatuses.includes(status) || status === currentStatus)
            .map(status => {
              const statusInfo = getInternalStatusInfo(status);
              const isCurrentStatus = status === currentStatus;
              
              return (
                <MenuItem 
                  key={status}
                  onClick={() => onStatusSelect(status)}
                  disabled={isCurrentStatus}
                  sx={{ 
                    bgcolor: isCurrentStatus ? 'action.selected' : 'transparent',
                    pl: 3
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <span>{statusInfo.icon}</span>
                    <Box>
                      <Typography variant="body2">
                        {statusInfo.label}
                        {isCurrentStatus && ' (Current)'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {statusInfo.description}
                      </Typography>
                    </Box>
                  </Box>
                </MenuItem>
              );
            })}
        </Box>
      )}
    </Menu>
  );
}