'use client';

import React from 'react';
import {
  Grid,
  Box,
  Typography,
  Button,
  Autocomplete,
  TextField,
  IconButton,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';

export const ToolsSection = ({
  formData,
  availableTools,
  toolLines,
  onAddLine,
  onRemoveLine,
  onToolSelect,
  onUseCountChange
}) => {
  return (
    <Grid item xs={12} sx={{ mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Tools and Machinery Usage
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Add machine usage lines to recover equipment cost over time (example: laser welder $10 per weld).
      </Typography>

      <Box sx={{ mb: 2 }}>
        <Button variant="outlined" startIcon={<AddIcon />} onClick={onAddLine} size="small">
          Add Tool or Machine
        </Button>
      </Box>

      {toolLines.map((line) => (
        <Box key={line.id} sx={{ mb: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1, bgcolor: 'grey.50' }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <Autocomplete
                options={availableTools}
                getOptionLabel={(option) => `${option.name} (${option.category || 'machinery'})`}
                value={line.tool}
                onChange={(event, newValue) => onToolSelect(line.id, newValue)}
                renderInput={(params) => (
                  <TextField {...params} label="Select Tool or Machinery" variant="outlined" size="small" />
                )}
              />
            </Grid>
            <Grid item xs={8} md={4}>
              <TextField
                size="small"
                label="Uses in this Process"
                type="number"
                value={line.useCount}
                onChange={(e) => onUseCountChange(line.id, e.target.value)}
                inputProps={{ min: 1, step: 1 }}
              />
            </Grid>
            <Grid item xs={4} md={2}>
              <IconButton size="small" color="error" onClick={() => onRemoveLine(line.id)}>
                <DeleteIcon />
              </IconButton>
            </Grid>
          </Grid>

          {line.tool && (
            <Box sx={{ mt: 1, p: 1, bgcolor: 'primary.50', borderRadius: 1 }}>
              <Typography variant="caption" color="primary.main">
                Cost per use: ${Number(line.tool.costPerUse || 0).toFixed(2)}
              </Typography>
            </Box>
          )}
        </Box>
      ))}

      {formData.tools?.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Added Machine Usage Lines:
          </Typography>
          <List dense>
            {formData.tools.map((tool, index) => (
              <ListItem key={index} divider sx={{ bgcolor: 'info.50' }}>
                <ListItemText
                  primary={`${tool.toolName} (${tool.useCount} uses)`}
                  secondary={`$${Number(tool.costPerUse || 0).toFixed(2)} per use, estimated tooling cost: $${Number(tool.estimatedCost || 0).toFixed(2)}`}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      )}
    </Grid>
  );
};
