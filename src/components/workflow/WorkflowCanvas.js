import * as React from 'react';
import { Box } from '@mui/material';
import { WORKFLOW_STAGES } from '../../hooks/workflow/useVisualWorkflow';
import WorkflowNode from './WorkflowNode';

export default function WorkflowCanvas({
  currentStageIndex,
  getStageStatus,
  disabled,
  currentStatusInfo,
  onStageClick
}) {
  return (
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
          
          return (
            <WorkflowNode 
              key={stage.id}
              stage={stage}
              stageIndex={stageIndex}
              currentStageIndex={currentStageIndex}
              stageStatus={stageStatus}
              disabled={disabled}
              currentStatusInfo={currentStatusInfo}
              onStageClick={onStageClick}
            />
          );
        })}
      </Box>
    </Box>
  );
}