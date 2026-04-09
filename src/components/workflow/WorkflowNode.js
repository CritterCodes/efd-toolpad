import * as React from 'react';
import { Box, Tooltip, Typography, Fade, useTheme } from '@mui/material';
import {
  CheckCircleOutline,
  PlayArrow,
  ErrorOutline,
  RadioButtonUnchecked
} from '@mui/icons-material';

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

export default function WorkflowNode({
  stage,
  stageIndex,
  currentStageIndex,
  stageStatus,
  disabled,
  currentStatusInfo,
  onStageClick
}) {
  const theme = useTheme();
  const isClickable = !disabled && stageIndex <= currentStageIndex + 1;

  return (
    <Box sx={{ textAlign: 'center', flex: 1 }}>
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
          onClick={(e) => onStageClick(e, stage, stageIndex)}
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
}