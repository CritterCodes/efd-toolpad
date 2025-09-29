/**
 * Custom Ticket Status Timeline Component
 * Visual progress tracker showing ticket status with timeline bubbles
 * Constitutional Architecture - Under 300 lines
 */

import React from 'react';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  Card,
  CardContent,
  Button,
  FormControl,
  Select,
  MenuItem,
  ListSubheader,
  CircularProgress
} from '@mui/material';
import { 
  CheckCircle as CheckIcon,
  RadioButtonUnchecked as UncompletedIcon,
  AccessTime as CurrentIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { 
  getClientStatusDisplay, 
  getInternalStatusInfo,
  getNextPossibleStatuses,
  CustomTicketStatusManager
} from '@/config/statuses';

export function CustomTicketStatusTimeline({ 
  ticket,
  availableStatuses = [],
  statusLoading = false,
  statusError = null,
  onStatusUpdate,
  allowEditing = true
}) {
  const [showEditor, setShowEditor] = React.useState(false);
  const [selectedStatus, setSelectedStatus] = React.useState('');

  if (!ticket) return null;

  const currentStatus = ticket.status;
  const statusInfo = getInternalStatusInfo(currentStatus);
  const clientDisplay = getClientStatusDisplay(currentStatus);

  // Get available statuses with fallback
  const nextStatuses = availableStatuses.length > 0 
    ? availableStatuses 
    : getNextPossibleStatuses(currentStatus);

  // Define the main workflow steps for the timeline
  const workflowSteps = [
    {
      category: 'initial',
      label: 'Initial Review',
      statuses: ['pending', 'reviewing-request', 'in-consultation', 'awaiting-client-info']
    },
    {
      category: 'design',
      label: 'Design Process',
      statuses: ['sketching', 'sketch-review', 'sketch-approved', 'creating-cad', 'cad-review', 'cad-revision', 'cad-approved']
    },
    {
      category: 'quote',
      label: 'Quote & Approval',
      statuses: ['preparing-quote', 'quote-sent', 'quote-revision', 'quote-approved']
    },
    {
      category: 'payment',
      label: 'Payment Processing',
      statuses: ['deposit-invoice-sent', 'deposit-received']
    },
    {
      category: 'production',
      label: 'Production',
      statuses: ['ordering-materials', 'materials-received', 'ready-for-production', 'in-production', 'casting', 'setting-stones', 'polishing', 'quality-check']
    },
    {
      category: 'completion',
      label: 'Completion',
      statuses: ['final-payment-sent', 'paid-in-full', 'ready-for-pickup', 'shipped', 'delivered', 'completed']
    }
  ];

  // Determine current step and completion status
  const getCurrentStep = () => {
    return workflowSteps.findIndex(step => 
      step.statuses.includes(currentStatus)
    );
  };

  const getStepStatus = (step, index) => {
    const currentStepIndex = getCurrentStep();
    
    if (index < currentStepIndex) return 'completed';
    if (index === currentStepIndex) return 'current';
    return 'pending';
  };

  const handleStatusUpdate = async () => {
    if (!selectedStatus || !onStatusUpdate) return;
    
    const result = await onStatusUpdate(selectedStatus);
    if (result.success) {
      setSelectedStatus('');
      setShowEditor(false);
    }
  };

  const getStepIcon = (step, status) => {
    switch (status) {
      case 'completed':
        return <CheckIcon sx={{ color: 'success.main' }} />;
      case 'current':
        return <CurrentIcon sx={{ color: 'primary.main' }} />;
      default:
        return <UncompletedIcon sx={{ color: 'text.disabled' }} />;
    }
  };

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
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
                  onClick={() => setShowEditor(true)}
                  disabled={statusLoading}
                >
                  <EditIcon />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>

        {/* Status Editor */}
        {showEditor && (
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
                  <ListSubheader sx={{ bgcolor: 'primary.light', color: 'primary.contrastText' }}>
                    Current Phase: {CustomTicketStatusManager.getPhaseName(CustomTicketStatusManager.getWorkflowStage(currentStatus))}
                  </ListSubheader>
                  {nextStatuses
                    .filter(status => {
                      // Filter to only show statuses in current phase with valid info
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
                  <ListSubheader sx={{ bgcolor: 'warning.light', color: 'warning.contrastText' }}>
                    General Actions
                  </ListSubheader>
                  {nextStatuses
                    .filter(status => {
                      // Filter general actions that have valid info
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
                      // Filter out statuses that don't exist in current phase
                      const info = getInternalStatusInfo ? getInternalStatusInfo(status) : null;
                      const currentPhase = CustomTicketStatusManager.getWorkflowStage(currentStatus);
                      // Only show statuses that have valid info and are not in current phase
                      return info && info.category && info.category !== currentPhase && !['awaiting-client-info', 'on-hold', 'cancelled'].includes(status);
                    })
                    .reduce((acc, status) => {
                      const info = getInternalStatusInfo ? getInternalStatusInfo(status) : null;
                      const phase = info?.category;
                      // Only group statuses that have a valid phase
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
                          // Only group statuses that have a valid phase
                          if (phase && phase !== 'undefined') {
                            if (!acc[phase]) acc[phase] = [];
                            acc[phase].push(status);
                          }
                          return acc;
                        }, {})
                    ).map(([phase, statuses]) => [
                      <ListSubheader key={phase} sx={{ bgcolor: 'success.light', color: 'success.contrastText' }}>
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
                onClick={handleStatusUpdate}
                disabled={!selectedStatus || statusLoading}
              >
                {statusLoading ? <CircularProgress size={16} /> : 'Update'}
              </Button>
              
              <Button
                variant="text"
                size="small"
                onClick={() => {
                  setShowEditor(false);
                  setSelectedStatus('');
                }}
                disabled={statusLoading}
              >
                Cancel
              </Button>
            </Box>
          </Box>
        )}

        {/* Timeline Stepper */}
        <Stepper 
          activeStep={getCurrentStep()} 
          orientation="horizontal" 
          sx={{ width: '100%' }}
          connector={<Box sx={{ width: 50, height: 2, bgcolor: 'divider' }} />}
        >
          {workflowSteps.map((step, index) => {
            const stepStatus = getStepStatus(step, index);
            
            return (
              <Step key={step.category}>
                <StepLabel
                  StepIconComponent={() => getStepIcon(step, stepStatus)}
                  sx={{
                    '& .MuiStepLabel-label': {
                      fontSize: '0.875rem',
                      fontWeight: stepStatus === 'current' ? 600 : 400,
                      color: stepStatus === 'completed' ? 'success.main' :
                             stepStatus === 'current' ? 'primary.main' : 'text.secondary'
                    }
                  }}
                >
                  {step.label}
                </StepLabel>
              </Step>
            );
          })}
        </Stepper>

        {/* Current Status Details */}
        <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Current Status
          </Typography>
          <Typography variant="body1" fontWeight="medium">
            {clientDisplay.label}
          </Typography>
          {statusInfo?.description && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {statusInfo.description}
            </Typography>
          )}
          {statusInfo?.requiresAction && (
            <Chip 
              label="Action Required" 
              size="small" 
              color="warning" 
              sx={{ mt: 1 }}
            />
          )}
        </Box>

        {statusError && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="error">
              {statusError}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

export default CustomTicketStatusTimeline;