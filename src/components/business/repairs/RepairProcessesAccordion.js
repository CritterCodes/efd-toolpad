import React from 'react';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Stack,
  Alert,
  Autocomplete,
  TextField,
  Box,
  Chip
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import RepairTaskItem from './RepairTaskItem';

export default function RepairProcessesAccordion({
  expanded,
  onExpand,
  processes = [],
  compatibleProcesses = [],
  metalType,
  karat,
  getPriceDisplay,
  addProcess,
  updateItem,
  removeItem
}) {
  return (
    <Accordion 
      expanded={expanded}
      onChange={onExpand}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography>
          Processes ({processes.length})
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={2}>
          {!metalType || !karat ? (
            <Alert severity="info">
              Please select a metal type and karat above to see available processes.
            </Alert>
          ) : compatibleProcesses.length === 0 ? (
            <Alert severity="warning">
              No processes are compatible with {metalType} {karat}. You can still add custom line items.
            </Alert>
          ) : (
            <Autocomplete
              options={compatibleProcesses}
              getOptionLabel={(option) => {
                const price = getPriceDisplay(option);
                const metalInfo = option.pricing?.totalCost && typeof option.pricing.totalCost === 'object' ? ` (Metal-specific)` : '';
                return `${option.displayName} - $${price}${metalInfo}`;
              }}
              renderInput={(params) => (
                <TextField 
                  {...params} 
                  label={`Add Process (${compatibleProcesses.length} compatible with ${metalType} ${karat})`}
                />
              )}
              renderOption={(props, option) => (
                <Box component="li" {...props}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                    <Typography variant="body1">
                      {option.displayName}
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        {option.category} • {option.laborHours}h • {option.skillLevel}
                        {option.pricing?.totalCost && typeof option.pricing.totalCost === 'object' && (
                          <Chip label="Metal-specific" size="small" color="info" sx={{ ml: 1 }} />
                        )}
                      </Typography>
                      <Typography variant="body2" color="success.main" fontWeight="bold">
                        ${getPriceDisplay(option)}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              )}
              onChange={(e, value) => value && addProcess(value)}
            />
          )}
          
          {processes.map(process => (
            <RepairTaskItem
              key={process.id}
              item={process}
              onQuantityChange={(qty) => updateItem('processes', process.id, 'quantity', qty)}
              onPriceChange={(price) => updateItem('processes', process.id, 'price', price)}
              onRemove={() => removeItem('processes', process.id)}
            />
          ))}
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
