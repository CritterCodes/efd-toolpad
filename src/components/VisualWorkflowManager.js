'use client';

import * as React from 'react';
import {
  Box,
  Typography,
  Chip,
  Paper,
  Button,
  Tooltip,
  IconButton,
  Menu,
  MenuItem,
  Alert,
  Fade,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  useTheme
} from '@mui/material';
import {
  PlayArrow,
  CheckCircleOutline,
  RadioButtonUnchecked,
  ErrorOutline,
  PauseCircleOutline
} from '@mui/icons-material';
import { 
  getInternalStatusInfo,
  getNextPossibleStatuses,
  getClientStatusDisplay,
  STATUS_CATEGORIES,
  INTERNAL_STATUSES
} from '../config/statuses';

// Define the main workflow stages in order
const WORKFLOW_STAGES = [
  {
    id: 'initial',
    label: 'Initial Review',
    statuses: [
      INTERNAL_STATUSES.PENDING,
      INTERNAL_STATUSES.NEEDS_QUOTE,
      INTERNAL_STATUSES.QUOTE_SENT
    ]
  },
  {
    id: 'approval',
    label: 'Client Approval',
    statuses: [
      INTERNAL_STATUSES.AWAITING_APPROVAL,
      INTERNAL_STATUSES.DEPOSIT_REQUIRED,
      INTERNAL_STATUSES.DEPOSIT_RECEIVED,
      INTERNAL_STATUSES.UPDATED_BY_CLIENT,
      INTERNAL_STATUSES.WAITING_FOR_CLIENT
    ]
  },
  {
    id: 'design',
    label: 'Design Phase',
    statuses: [
      INTERNAL_STATUSES.IN_CAD,
      INTERNAL_STATUSES.CAD_REVIEW,
      INTERNAL_STATUSES.CAD_APPROVED,
      INTERNAL_STATUSES.CAD_REVISION
    ]
  },
  {
    id: 'preparation',
    label: 'Production Prep',
    statuses: [
      INTERNAL_STATUSES.GATHERING_MATERIALS,
      INTERNAL_STATUSES.NEEDS_PARTS,
      INTERNAL_STATUSES.PARTS_ORDERED,
      INTERNAL_STATUSES.READY_FOR_WORK
    ]
  },
  {
    id: 'production',
    label: 'Production',
    statuses: [
      INTERNAL_STATUSES.IN_PRODUCTION,
      INTERNAL_STATUSES.CASTING,
      INTERNAL_STATUSES.SETTING_STONES,
      INTERNAL_STATUSES.FINISHING
    ]
  },
  {
    id: 'completion',
    label: 'Completion',
    statuses: [
      INTERNAL_STATUSES.QUALITY_CONTROL,
      INTERNAL_STATUSES.QC_FAILED,
      INTERNAL_STATUSES.READY_FOR_PICKUP,
      INTERNAL_STATUSES.COMPLETED
    ]
  }
];

export default function VisualWorkflowManager({ 
  currentStatus, 
  onStatusChange, 
  ticketHistory = [],
  disabled = false
}) {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [selectedStageForMenu, setSelectedStageForMenu] = React.useState(null);
  
  const currentStatusInfo = getInternalStatusInfo(currentStatus);
  const nextStatuses = getNextPossibleStatuses(currentStatus);
  const clientView = getClientStatusDisplay(currentStatus);

  // Find which stage contains the current status
  const getCurrentStageIndex = () => {
    return WORKFLOW_STAGES.findIndex(stage => 
      stage.statuses.includes(currentStatus)
    );
  };

  const currentStageIndex = getCurrentStageIndex();

  // Get stage completion status
  const getStageStatus = (stageIndex, stage) => {
    if (currentStatus === INTERNAL_STATUSES.CANCELLED || 
        currentStatus === INTERNAL_STATUSES.DEAD_LEAD ||
        currentStatus === INTERNAL_STATUSES.ON_HOLD) {
      return stageIndex < currentStageIndex ? 'completed' : 'cancelled';
    }

    if (stageIndex < currentStageIndex) return 'completed';
    if (stageIndex === currentStageIndex) return 'active';
    return 'pending';
  };

  const handleStageClick = (event, stage, stageIndex) => {
    if (disabled || stageIndex > currentStageIndex + 1) return;
    
    setAnchorEl(event.currentTarget);
    setSelectedStageForMenu({ stage, stageIndex });
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedStageForMenu(null);
  };

  const handleStatusSelect = (status) => {
    onStatusChange(status);
    handleMenuClose();
  };

  const getStageIcon = (stageStatus) => {
    switch (stageStatus) {
      case 'completed':
        return <CheckCircleOutline color="success" />;
      case 'active':
        return <PlayArrow color="primary" />;
      case 'cancelled':
        return <ErrorOutline color="error" />;
      default:
        return <RadioButtonUnchecked color="disabled" />;
    }
  };

  const getStageColor = (stageStatus) => {
    switch (stageStatus) {
      case 'completed':
        return 'success.main';
      case 'active':
        return 'primary.main';
      case 'cancelled':
        return 'error.main';
      default:
        return 'grey.400';
    }
  };

  // Handle special statuses (cancelled, on-hold, dead lead)
  if ([INTERNAL_STATUSES.CANCELLED, INTERNAL_STATUSES.DEAD_LEAD, INTERNAL_STATUSES.ON_HOLD].includes(currentStatus)) {
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

  return (
    <Paper sx={{ p: 3, borderRadius: 2 }}>
      {/* Current Status Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="h6">
            Project Workflow
          </Typography>
          <Chip 
            label={`${currentStatusInfo.icon} ${currentStatusInfo.label}`}
            color={currentStatusInfo.color}
            size="small"
          />
        </Box>
        
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            <strong>Client sees:</strong> {clientView.label} - {clientView.description}
          </Typography>
        </Alert>
      </Box>

      {/* Visual Workflow */}
      <Box sx={{ position: 'relative' }}>
        {/* Progress Line */}
        <Box
          sx={{
            position: 'absolute',
            top: 24,
            left: 20,
            right: 20,
            height: 2,
            bgcolor: 'grey.200',
            zIndex: 1
          }}
        />
        
        {/* Active Progress Line */}
        <Box
          sx={{
            position: 'absolute',
            top: 24,
            left: 20,
            width: `${(currentStageIndex / (WORKFLOW_STAGES.length - 1)) * 100}%`,
            height: 2,
            bgcolor: 'primary.main',
            zIndex: 2,
            transition: 'width 0.3s ease'
          }}
        />

        {/* Stage Nodes */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', position: 'relative', zIndex: 3 }}>
          {WORKFLOW_STAGES.map((stage, stageIndex) => {
            const stageStatus = getStageStatus(stageIndex, stage);
            const isClickable = !disabled && stageIndex <= currentStageIndex + 1;
            
            return (
              <Box key={stage.id} sx={{ textAlign: 'center', flex: 1 }}>
                <Tooltip title={`${stage.label} - Click to see status options`}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      bgcolor: getStageColor(stageStatus),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: isClickable ? 'pointer' : 'default',
                      mx: 'auto',
                      mb: 1,
                      border: stageIndex === currentStageIndex ? `3px solid ${theme.palette.primary.main}` : 'none',
                      boxShadow: stageIndex === currentStageIndex ? 2 : 0,
                      transition: 'all 0.3s ease',
                      '&:hover': isClickable ? {
                        transform: 'scale(1.1)',
                        boxShadow: 3
                      } : {}
                    }}
                    onClick={(e) => handleStageClick(e, stage, stageIndex)}
                  >
                    {stageIndex === currentStageIndex ? (
                      <span style={{ fontSize: '1.5rem' }}>{currentStatusInfo.icon}</span>
                    ) : (
                      getStageIcon(stageStatus)
                    )}
                  </Box>
                </Tooltip>
                
                <Typography 
                  variant="caption" 
                  sx={{ 
                    fontWeight: stageIndex === currentStageIndex ? 'bold' : 'normal',
                    color: getStageColor(stageStatus)
                  }}
                >
                  {stage.label}
                </Typography>
                
                {/* Show current specific status under active stage */}
                {stageIndex === currentStageIndex && (
                  <Fade in>
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        display: 'block',
                        mt: 0.5,
                        color: 'text.secondary',
                        fontStyle: 'italic'
                      }}
                    >
                      {currentStatusInfo.label}
                    </Typography>
                  </Fade>
                )}
              </Box>
            );
          })}
        </Box>

        {/* Quick Actions for Current Stage */}
        {nextStatuses.length > 0 && (
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
        )}
      </Box>

      {/* Stage Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
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
                    onClick={() => handleStatusSelect(status)}
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
    </Paper>
  );
}