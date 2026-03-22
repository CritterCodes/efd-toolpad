import React from 'react';
import {
  Paper,
  Stack,
  TextField,
  Typography,
  IconButton
} from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';

export default function RepairCustomItem({ 
  item, 
  onDescriptionChange, 
  onQuantityChange, 
  onPriceChange, 
  onRemove 
}) {
  return (
    <Paper sx={{ p: 2 }}>
      <Stack spacing={2}>
        <TextField
          fullWidth
          label="Description"
          value={item.description || ''}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Custom work description..."
        />
        
        <Stack direction="row" spacing={2} alignItems="center">
          <TextField
            type="number"
            label="Quantity"
            value={item.quantity || ''}
            onChange={(e) => onQuantityChange(parseInt(e.target.value) || 1)}
            sx={{ width: 100 }}
            inputProps={{ min: 1 }}
          />
          
          <TextField
            type="number"
            label="Price"
            value={item.price || ''}
            onChange={(e) => onPriceChange(parseFloat(e.target.value) || 0)}
            sx={{ width: 120 }}
            inputProps={{ min: 0, step: 0.01 }}
          />
          
          <Typography variant="body2" sx={{ flex: 1, textAlign: 'right' }}>
            Total: ${((item.price || 0) * (item.quantity || 1)).toFixed(2)}
          </Typography>
          
          <IconButton color="error" onClick={onRemove}>
            <DeleteIcon />
          </IconButton>
        </Stack>
      </Stack>
    </Paper>
  );
}
