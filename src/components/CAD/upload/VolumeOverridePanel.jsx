import React from 'react';
import { Paper, Typography, TextField } from '@mui/material';

const VolumeOverridePanel = ({ calculatedVolume, manualVolume, setManualVolume }) => {
  if (calculatedVolume === null) return null;

  return (
    <Paper sx={{ p: 2, backgroundColor: '#f9f9f9' }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>  
        Override Volume (Optional)
      </Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}> 
        Calculated volume: {calculatedVolume.toFixed(2)} mm³ - Enter custom value if needed
      </Typography>
      <TextField
        fullWidth
        type="number"
        label="Custom Volume (mm³)"
        value={manualVolume}
        onChange={(e) => setManualVolume(e.target.value)}
        placeholder={calculatedVolume.toFixed(2)}
        size="small"
      />
    </Paper>
  );
};

export default VolumeOverridePanel;
