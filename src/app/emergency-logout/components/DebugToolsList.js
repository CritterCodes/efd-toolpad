import React from 'react';
import { Typography, Button, Alert } from '@mui/material';

export default function DebugToolsList({ handleComprehensiveDebug, clearRoleOverride, executeNuclearLogout }) {
  return (
    <>
      <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
        🔬 Debug Tools
      </Typography>

      <Button 
        variant="outlined"
        color="info" 
        onClick={handleComprehensiveDebug}
        sx={{ mr: 2, mb: 2 }}
      >
        🔍 Debug Auth State
      </Button>

      <Button 
        variant="contained"
        color="warning" 
        onClick={clearRoleOverride}
        sx={{ mr: 2, mb: 2 }}
      >
        🎭 Clear Role Override
      </Button>

      <Button 
        variant="contained"
        color="error" 
        onClick={executeNuclearLogout}
        sx={{ mb: 2 }}
      >
        ☢️ NUCLEAR LOGOUT
      </Button>

      <Alert severity="error" sx={{ mt: 2 }}>
        <Typography variant="body2">
          <strong>Nuclear Logout:</strong> This will completely wipe all browser data and force a clean start. 
          Use only if regular force logout fails.
        </Typography>
      </Alert>
    </>
  );
}