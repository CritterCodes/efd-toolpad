import React from 'react';
import { Box, Typography } from '@mui/material';

export default function ViewerFooter() {
  return (
    <Box sx={{ p: 1.5, borderTop: '1px solid #e0e0e0', backgroundColor: '#fafafa' }}>
      <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
        Format: GLB (Binary glTF) • 3D Interactive Preview
      </Typography>
    </Box>
  );
}
