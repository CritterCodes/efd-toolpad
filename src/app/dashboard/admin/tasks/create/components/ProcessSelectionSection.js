import React from 'react';
import {
  Grid,
  Typography,
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  IconButton,
  Alert
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';

export function ProcessSelectionSection({
  formData,
  addCustomProcess,
  updateProcess,
  removeProcess
}) {
  return (
    <Grid item xs={12}>
      <Box sx={{ px: { xs: 2, sm: 0 }, borderTop: '1px solid', borderColor: 'divider', pt: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700, lineHeight: 1 }}>
            ⚙️ Labor
          </Typography>
          <Button startIcon={<AddIcon />} onClick={addCustomProcess} variant="outlined" size="small">
            Add Labor
          </Button>
        </Box>

        {formData.processes.map((process, index) => (
          <Card key={index} sx={{ mb: 1.5, borderLeft: '3px solid', borderLeftColor: 'secondary.main' }} elevation={0} variant="outlined">
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Grid container spacing={1.5} alignItems="center">
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Labor Notes (Optional)"
                    value={process.name || ''}
                    onChange={(e) => updateProcess(index, 'name', e.target.value)}
                    placeholder="e.g. Laser weld seam"
                  />
                </Grid>
                <Grid item xs={5} md={3}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Hours"
                    type="number"
                    value={process.laborHours ?? 0}
                    onChange={(e) => updateProcess(index, 'laborHours', parseFloat(e.target.value) || 0)}
                    inputProps={{ min: 0, step: 0.05 }}
                  />
                </Grid>
                <Grid item xs={5} md={2}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Qty"
                    type="number"
                    value={process.quantity ?? 1}
                    onChange={(e) => updateProcess(index, 'quantity', parseFloat(e.target.value) || 1)}
                    inputProps={{ min: 1, max: 10, step: 1 }}
                  />
                </Grid>
                <Grid item xs={2} md={1} sx={{ display: 'flex', justifyContent: 'center' }}>
                  <IconButton onClick={() => removeProcess(index)} color="error" size="small">
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        ))}

        {formData.processes.length === 0 && (
          <Alert severity="info" sx={{ py: 0.5 }}>
            Add labor entries to specify time for this task.
          </Alert>
        )}
      </Box>
    </Grid>
  );
}
