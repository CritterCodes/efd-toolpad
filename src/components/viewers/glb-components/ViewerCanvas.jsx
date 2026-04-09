import React from 'react';
import { Box } from '@mui/material';

export default function ViewerCanvas({ containerRef, children }) {
  return (
    <Box
      ref={containerRef}
      sx={{
        flex: 1,
        position: 'relative',
        backgroundColor: '#f5f5f5',
        minHeight: '400px'
      }}
    >
      {children}
    </Box>
  );
}
