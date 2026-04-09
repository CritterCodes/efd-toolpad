import React from 'react';
import { Box, Typography, Chip } from '@mui/material';

export const ProcessCardMaterials = ({ process }) => {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" display="block">
        Materials Required:
      </Typography>
      {process.materials && process.materials.length > 0 ? (
        <Box display="flex" gap={0.5} flexWrap="wrap">
          {process.materials.slice(0, 3).map((material, index) => {
            // Handle both old and new material structure
            const materialName = material.materialName || material.name || 'Unknown Material';
            const quantity = material.quantity || 0;
            const unit = material.unit || 'unit';
            
            return (
              <Chip
                key={index}
                label={`${materialName}: ${quantity} ${unit}${quantity !== 1 ? 's' : ''}`}
                size="small"
                variant="outlined"
                color="primary"
              />
            );
          })}
          {process.materials.length > 3 && (
            <Chip
              label={`+${process.materials.length - 3} more`}
              size="small"
              variant="outlined"
              color="primary"
            />
          )}
        </Box>
      ) : (
        <Chip
          label="No materials (Labor-only)"
          size="small"
          variant="outlined"
          color="default"
        />
      )}
    </Box>
  );
};
