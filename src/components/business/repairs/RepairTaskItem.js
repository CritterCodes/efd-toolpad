import React from 'react';
import {
  Box,
  Paper,
  Stack,
  Typography,
  Chip,
  TextField,
  IconButton
} from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';

export default function RepairTaskItem({ item, onQuantityChange, onPriceChange, onRemove }) {
  return (
    <Paper sx={{ p: 2, border: item.isStullerItem ? '1px solid #1976d2' : undefined }}>
      <Stack direction="row" spacing={2} alignItems="center">
        <Box sx={{ flex: 1 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="subtitle1">
              {item.title || item.displayName || item.name}
            </Typography>
            {item.isStullerItem && (
              <Chip 
                label="Stuller" 
                size="small" 
                color="primary" 
                variant="outlined"
              />
            )}
          </Stack>
          {item.description && (
            <Typography variant="body2" color="text.secondary">
              {item.description}
            </Typography>
          )}
          {item.isStullerItem && item.stullerData && (
            <Typography variant="caption" color="primary">
              SKU: {item.stullerData.itemNumber} | 
              Base: ${item.stullerData.originalPrice} | 
              Markup: {((item.stullerData.markup - 1) * 100).toFixed(0)}%
            </Typography>
          )}
        </Box>
        
        <TextField
          type="number"
          label="Qty"
          value={item.quantity || ''}
          onChange={(e) => onQuantityChange(parseInt(e.target.value) || 1)}
          sx={{ width: 80 }}
          inputProps={{ min: 1 }}
        />
        
        <TextField
          type="number"
          label="Price"
          value={item.price || ''}
          onChange={(e) => onPriceChange(parseFloat(e.target.value) || 0)}
          sx={{ width: 100 }}
          inputProps={{ min: 0, step: 0.01 }}
        />
        
        <Typography variant="body2" sx={{ minWidth: 60, textAlign: 'right' }}>
          ${((item.price || 0) * (item.quantity || 1)).toFixed(2)}
        </Typography>
        
        <IconButton color="error" onClick={onRemove}>
          <DeleteIcon />
        </IconButton>
      </Stack>
    </Paper>
  );
}
