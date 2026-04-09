import React from 'react';
import { Box, Typography } from '@mui/material';

export default function ViewerHeader({ title }) {
  return (
    <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0', backgroundColor: '#fafafa' }}>
      <Typography variant="subtitle1" fontWeight={600}>
        {title}
      </Typography>
      <Typography variant="caption" color="textSecondary">
        Drag to rotate • Scroll to zoom
      </Typography>
    </Box>
  );
}
