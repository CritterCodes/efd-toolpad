/**
 * ProcessSelector.js - Enhanced process selector with universal pricing impact
 * 
 * Shows how process selection affects task pricing across all metal types.
 * Integrates seamlessly with your existing process selection UI.
 */

import React from 'react';
import { Box, Typography, Alert } from '@mui/material';
import { useMetalContext } from '../../contexts/MetalContextProvider';
import { useProcessSelector } from '../../hooks/tasks/useProcessSelector';
import { ProcessSummaryCard } from './process-selector/ProcessSummaryCard';
import { ProcessItemCard } from './process-selector/ProcessItemCard';

export function UniversalProcessSelector({ 
  availableProcesses = [], 
  selectedProcesses = [],
  onProcessesChange,
  maxSelection = null 
}) {
  const { currentMetalContext, getCurrentDisplayName } = useMetalContext();

  const {
    expandedProcess,
    setExpandedProcess,
    processAnalysis,
    totalImpact,
    handleProcessToggle,
    handleQuantityChange
  } = useProcessSelector({
    availableProcesses,
    selectedProcesses,
    onProcessesChange,
    maxSelection,
    currentMetalContext
  });

  return (
    <Box>
      <ProcessSummaryCard
        totalImpact={totalImpact}
        selectedProcesses={selectedProcesses}
        getCurrentDisplayName={getCurrentDisplayName}
      />

      <Box>
        <Typography variant="h6" gutterBottom>
          Available Processes ({processAnalysis.length})
        </Typography>

        {processAnalysis.map(process => (
          <ProcessItemCard
            key={process._id}
            process={process}
            expandedProcess={expandedProcess}
            setExpandedProcess={setExpandedProcess}
            handleQuantityChange={handleQuantityChange}
            handleProcessToggle={handleProcessToggle}
            maxSelection={maxSelection}
            selectedProcesses={selectedProcesses}
            getCurrentDisplayName={getCurrentDisplayName}
            currentMetalContext={currentMetalContext}
          />
        ))}

        {processAnalysis.length === 0 && (
          <Alert severity="info">
            No processes available. Load processes to build tasks.
          </Alert>
        )}
      </Box>
    </Box>
  );
}

