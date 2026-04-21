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
  Alert,
  Autocomplete
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';

export function ToolsSelectionSection({
  formData,
  availableTools,
  addTool,
  updateTool,
  removeTool
}) {
  const tools = formData.tools || [];

  return (
    <Grid item xs={12}>
      <Box sx={{ px: { xs: 2, sm: 0 }, borderTop: '1px solid', borderColor: 'divider', pt: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700, lineHeight: 1 }}>
            🔧 Tools & Machinery
          </Typography>
          <Button startIcon={<AddIcon />} onClick={addTool} variant="outlined" size="small">
            Add Tool
          </Button>
        </Box>

        {tools.map((selection, index) => {
          const selected = availableTools.find(t => String(t._id) === String(selection.toolId)) || null;
          return (
            <Card key={index} sx={{ mb: 1.5, borderLeft: '3px solid', borderLeftColor: 'warning.main' }} elevation={0} variant="outlined">
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Grid container spacing={1.5} alignItems="flex-start">
                  <Grid item xs={12} md={8}>
                    <Autocomplete
                      options={availableTools}
                      getOptionLabel={(opt) => `${opt.name}${opt.category ? ` (${opt.category})` : ''}`}
                      value={selected}
                      onChange={(_, value) => updateTool(index, 'toolId', value?._id || '')}
                      renderInput={(params) => (
                        <TextField {...params} fullWidth label="Tool / Machine" size="small" />
                      )}
                    />
                    {selected && (
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                        ${Number(selected.costPerUse || 0).toFixed(4)} per use
                        {selected.purchasePrice > 0 && selected.expectedUses > 0 &&
                          ` · $${selected.purchasePrice} ÷ ${selected.expectedUses} uses`}
                      </Typography>
                    )}
                  </Grid>
                  <Grid item xs={9} md={3}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Uses"
                      type="number"
                      value={selection.quantity ?? 1}
                      onChange={(e) => updateTool(index, 'quantity', parseFloat(e.target.value) || 1)}
                      inputProps={{ min: 1, step: 1 }}
                      helperText={selected
                        ? `$${(Number(selected.costPerUse || 0) * (selection.quantity || 1)).toFixed(2)} total`
                        : undefined}
                    />
                  </Grid>
                  <Grid item xs={3} md={1} sx={{ display: 'flex', justifyContent: 'center', pt: 0.5 }}>
                    <IconButton onClick={() => removeTool(index)} color="error" size="small">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          );
        })}

        {tools.length === 0 && (
          <Alert severity="info" sx={{ py: 0.5 }}>
            Add machinery to include equipment depreciation in this task&apos;s cost.
          </Alert>
        )}
      </Box>
    </Grid>
  );
}
