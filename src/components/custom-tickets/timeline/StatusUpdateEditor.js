import React from 'react';
import {
  Box,
  FormControl,
  Select,
  MenuItem,
  ListSubheader,
  Typography,
  Button,
  CircularProgress
} from '@mui/material';
import { 
  getInternalStatusInfo,
  CustomTicketStatusManager
} from '@/config/statuses';

export function StatusUpdateEditor({
  selectedStatus,
  setSelectedStatus,
  statusLoading,
  nextStatuses,
  currentStatus,
  onUpdate,
  onCancel
}) {
  return (
    <Box sx={{ mb: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: 1, borderColor: 'divider' }}>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
        <FormControl size="small" sx={{ minWidth: 250 }}>
          <Select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            disabled={statusLoading}
            displayEmpty
            renderValue={(selected) => {
              if (!selected) return 'Select New Status';
              const info = getInternalStatusInfo ? getInternalStatusInfo(selected) : null;
              return info?.label || selected;
            }}
          >
            <MenuItem value="" disabled>
              Select New Status
            </MenuItem>
            
            {/* Group statuses by current phase first */}
            <ListSubheader sx={{ bgcolor: '#1F232A', color: '#9CA3AF' }}>
              Current Phase: {CustomTicketStatusManager.getPhaseName(CustomTicketStatusManager.getWorkflowStage(currentStatus))}
            </ListSubheader>
            {nextStatuses
              .filter(status => {
                const info = getInternalStatusInfo ? getInternalStatusInfo(status) : null;
                const currentPhase = CustomTicketStatusManager.getWorkflowStage(currentStatus);
                return info && info.category && info.category === currentPhase;
              })
              .map(status => {
                const info = getInternalStatusInfo ? getInternalStatusInfo(status) : null;
                const label = info?.label || status;
                return (
                  <MenuItem key={status} value={status} sx={{ pl: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <span>{info?.icon || '•'}</span>
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {label}
                        </Typography>
                        {info?.description && (
                          <Typography variant="caption" color="text.secondary">
                            {info.description}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </MenuItem>
                );
              })}

            {/* General Actions */}
            <ListSubheader sx={{ bgcolor: '#1F232A', color: '#9CA3AF' }}>
              General Actions
            </ListSubheader>
            {nextStatuses
              .filter(status => {
                const info = getInternalStatusInfo ? getInternalStatusInfo(status) : null;
                return info && ['awaiting-client-info', 'on-hold', 'cancelled'].includes(status);
              })
              .map(status => {
                const info = getInternalStatusInfo ? getInternalStatusInfo(status) : null;
                const label = info?.label || status;
                return (
                  <MenuItem key={status} value={status} sx={{ pl: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <span>{info?.icon || '•'}</span>
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {label}
                        </Typography>
                        {info?.description && (
                          <Typography variant="caption" color="text.secondary">
                            {info.description}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </MenuItem>
                );
              })}

            {/* Next Phase Options */}
            {nextStatuses
              .filter(status => {
                const info = getInternalStatusInfo ? getInternalStatusInfo(status) : null;
                const currentPhase = CustomTicketStatusManager.getWorkflowStage(currentStatus);
                return info && info.category && info.category !== currentPhase && !['awaiting-client-info', 'on-hold', 'cancelled'].includes(status);
              })
              .reduce((acc, status) => {
                const info = getInternalStatusInfo ? getInternalStatusInfo(status) : null;
                const phase = info?.category;
                if (phase && phase !== 'undefined') {
                  if (!acc[phase]) acc[phase] = [];
                  acc[phase].push(status);
                }
                return acc;
              }, {})
              && Object.entries(
                nextStatuses
                  .filter(status => {
                    const info = getInternalStatusInfo ? getInternalStatusInfo(status) : null;
                    const currentPhase = CustomTicketStatusManager.getWorkflowStage(currentStatus);
                    return info?.category !== currentPhase && !['awaiting-client-info', 'on-hold', 'cancelled'].includes(status);
                  })
                  .reduce((acc, status) => {
                    const info = getInternalStatusInfo ? getInternalStatusInfo(status) : null;
                    const phase = info?.category;
                    if (phase && phase !== 'undefined') {
                      if (!acc[phase]) acc[phase] = [];
                      acc[phase].push(status);
                    }
                    return acc;
                  }, {})
              ).map(([phase, statuses]) => [
                <ListSubheader key={phase} sx={{ bgcolor: '#1F232A', color: '#9CA3AF' }}>
                  Move to: {CustomTicketStatusManager.getPhaseName(phase)}
                </ListSubheader>,
                ...statuses.map(status => {
                  const info = getInternalStatusInfo ? getInternalStatusInfo(status) : null;
                  const label = info?.label || status;
                  return (
                    <MenuItem key={status} value={status} sx={{ pl: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <span>{info?.icon || '•'}</span>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {label}
                          </Typography>
                          {info?.description && (
                            <Typography variant="caption" color="text.secondary">
                              {info.description}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </MenuItem>
                  );
                })
              ]).flat()}
          </Select>
        </FormControl>
        
        <Button
          variant="contained"
          size="small"
          onClick={onUpdate}
          disabled={!selectedStatus || statusLoading}
        >
          {statusLoading ? <CircularProgress size={16} /> : 'Update'}
        </Button>
        
        <Button
          variant="text"
          size="small"
          onClick={onCancel}
          disabled={statusLoading}
        >
          Cancel
        </Button>
      </Box>
    </Box>
  );
}
