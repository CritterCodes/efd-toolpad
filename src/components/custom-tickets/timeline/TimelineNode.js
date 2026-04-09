import React from 'react';
import {
  Step,
  StepLabel
} from '@mui/material';
import { 
  CheckCircle as CheckIcon,
  RadioButtonUnchecked as UncompletedIcon,
  AccessTime as CurrentIcon
} from '@mui/icons-material';

const getStepIcon = (status) => {
  switch (status) {
    case 'completed':
      return <CheckIcon sx={{ color: 'success.main' }} />;
    case 'current':
      return <CurrentIcon sx={{ color: 'primary.main' }} />;
    default:
      return <UncompletedIcon sx={{ color: 'text.disabled' }} />;
  }
};

export function TimelineNode({ step, stepStatus }) {
  return (
    <Step>
      <StepLabel
        StepIconComponent={() => getStepIcon(stepStatus)}
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
}
