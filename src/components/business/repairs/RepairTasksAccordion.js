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

export default function RepairTasksAccordion({
  expanded,
  onExpand,
  tasks = [],
  compatibleTasks = [],
  metalType,
  karat,
  getPriceDisplay,
  addTask,
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
          Tasks ({tasks.length})
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={2}>
          {!metalType || !karat ? (
            <Alert severity="info">
              Please select a metal type and karat above to see available tasks.
            </Alert>
          ) : compatibleTasks.length === 0 ? (
            <Alert severity="warning">
              No tasks are compatible with {metalType} {karat}. You can still add custom line items.
            </Alert>
          ) : (
            <Autocomplete
              options={compatibleTasks}
              getOptionLabel={(option) => {
                const price = getPriceDisplay(option);
                const metalInfo = option.isUniversal ? ` (Universal)` : '';
                return `${option.title} - $${price}${metalInfo}`;
              }}
              renderInput={(params) => (
                <TextField 
                  {...params} 
                  label={`Add Task (${compatibleTasks.length} compatible with ${metalType} ${karat})`}
                />
              )}
              renderOption={(props, option) => (
                <Box component="li" {...props}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                    <Typography variant="body1">
                      {option.title}
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        {option.category}
                        {option.isUniversal && (
                          <Chip label="Universal" size="small" color="primary" sx={{ ml: 1 }} />
                        )}
                      </Typography>
                      <Typography variant="body2" color="success.main" fontWeight="bold">
                        ${getPriceDisplay(option)}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              )}
              onChange={(e, value) => value && addTask(value)}
            />
          )}
          
          {tasks.map(task => (
            <RepairTaskItem
              key={task.id}
              item={task}
              onQuantityChange={(qty) => updateItem('tasks', task.id, 'quantity', qty)}
              onPriceChange={(price) => updateItem('tasks', task.id, 'price', price)}
              onRemove={() => removeItem('tasks', task.id)}
            />
          ))}
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
