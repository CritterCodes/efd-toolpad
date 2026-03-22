import React from 'react';
import { Card, CardContent, CardHeader, Typography, Grid, TextField, Box, Button, IconButton } from '@mui/material';
import { Build as BuildIcon, Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';

export function LaborSection({ formData, handleItemChange, editMode }) {
  const parseCost = (value) => parseFloat(value.replace(/[$,]/g, '')) || 0;

  return (
    <Card sx={{ mb: 2 }}>
      <CardHeader 
        title="Labor Tasks" 
        avatar={<BuildIcon color="primary" />}
        action={
          editMode && (
            <Button
              startIcon={<AddIcon />}
              onClick={() => handleItemChange('laborTasks', 'ADD', { newItem: { description: '', cost: 0, quantity: 1 } })}
              size="small"
              variant="outlined"
            >
              Add Task
            </Button>
          )
        }
      />
      <CardContent>
        {formData.laborTasks.map((task, index) => (
          <Grid container spacing={2} key={index} sx={{ mb: index < formData.laborTasks.length - 1 ? 2 : 0 }}>
            <Grid item xs={6}>
              <TextField
                fullWidth label="Task Description" size="small"
                value={task.description}
                onChange={(e) => handleItemChange('laborTasks', 'UPDATE', { index, key: 'description', value: e.target.value })}
              />
            </Grid>
            <Grid item xs={2}>
              <TextField
                fullWidth label="Qty" type="number" size="small"
                value={task.quantity}
                onChange={(e) => handleItemChange('laborTasks', 'UPDATE', { index, key: 'quantity', value: parseInt(e.target.value) || 1 })}
              />
            </Grid>
            <Grid item xs={3}>
              <TextField
                fullWidth label="Cost" type="number" size="small" InputProps={{ startAdornment: '$' }}
                value={task.cost}
                onChange={(e) => handleItemChange('laborTasks', 'UPDATE', { index, key: 'cost', value: parseCost(e.target.value) })}
              />
            </Grid>
            <Grid item xs={1}>
              {editMode && (
                <IconButton size="small" onClick={() => handleItemChange('laborTasks', 'REMOVE', { index })}>
                  <DeleteIcon />
                </IconButton>
              )}
            </Grid>
          </Grid>
        ))}
        {formData.laborTasks.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
            No labor tasks added. Click "Add Task" to add production tasks.
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

export default LaborSection;