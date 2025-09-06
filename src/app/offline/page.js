'use client';

import { Box, Typography, Paper, Button } from '@mui/material';
import { WifiOff as OfflineIcon, Refresh as RefreshIcon } from '@mui/icons-material';

export default function OfflinePage() {
  const handleRefresh = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        bgcolor: 'grey.100',
        p: 2
      }}
    >
      <Paper 
        elevation={3} 
        sx={{ 
          p: 4, 
          textAlign: 'center', 
          maxWidth: 400,
          width: '100%'
        }}
      >
        <OfflineIcon 
          sx={{ 
            fontSize: 80, 
            color: 'grey.400', 
            mb: 2 
          }} 
        />
        
        <Typography variant="h4" component="h1" gutterBottom color="text.primary">
          You&apos;re Offline
        </Typography>
        
        <Typography variant="body1" color="text.secondary" paragraph>
          It looks like you&apos;ve lost your internet connection. 
          Don&apos;t worry, some features may still work while offline.
        </Typography>
        
        <Typography variant="body2" color="text.secondary" paragraph>
          Your work is saved locally and will sync when you&apos;re back online.
        </Typography>
        
        <Button
          variant="contained"
          startIcon={<RefreshIcon />}
          onClick={handleRefresh}
          sx={{ mt: 2 }}
        >
          Try Again
        </Button>
      </Paper>
    </Box>
  );
}
