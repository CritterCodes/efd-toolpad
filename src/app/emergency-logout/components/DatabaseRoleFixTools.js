import React from 'react';
import { Typography, Button, Alert } from '@mui/material';

export default function DatabaseRoleFixTools({ checkDatabaseRole, fixRoleToAdmin, session }) {
  return (
    <>
      <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
        🔧 Database Role Fix
      </Typography>

      <Button 
        variant="outlined"
        color="secondary" 
        onClick={() => checkDatabaseRole(session)}
        sx={{ mr: 2, mb: 2 }}
      >
        🔍 Check Database Role
      </Button>

      <Button 
        variant="contained"
        color="success" 
        onClick={() => fixRoleToAdmin(session)}
        sx={{ mb: 2 }}
      >
        🔧 Fix Role to Admin
      </Button>

      <Alert severity="warning" sx={{ mt: 2 }}>
        <Typography variant="body2">
          <strong>Database Role Fix:</strong> If your session shows &quot;client&quot; role but you should have &quot;admin&quot; access, 
          this will check and update your role directly in the MongoDB database. You&apos;ll need to logout and login again after the fix.
        </Typography>
      </Alert>
    </>
  );
}