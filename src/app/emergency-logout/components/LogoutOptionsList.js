import React from 'react';
import { Box, Typography, Button, Alert } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import SearchIcon from '@mui/icons-material/Search';

export default function LogoutOptionsList({ handleDebugAuth, handleRegularLogout, handleForceLogout }) {
  return (
    <>
      <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
        🔧 Logout Options
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Button
          variant="outlined"
          color="info"
          size="large"
          onClick={handleDebugAuth}
          startIcon={<SearchIcon />}
          fullWidth
        >
          🔍 Debug Auth State (Check Console)
        </Button>

        <Button
          variant="contained"
          color="primary"
          size="large"
          onClick={handleRegularLogout}
          startIcon={<LogoutIcon />}
          fullWidth
        >
          🚪 Try Regular Logout First
        </Button>

        <Button
          variant="contained"
          color="warning"
          size="large"
          onClick={handleForceLogout}
          fullWidth
        >
          🚨 Nuclear Logout & Clear Everything
        </Button>
      </Box>

      <Alert severity="warning" sx={{ mt: 3 }}>
        <Typography variant="body2">
          <strong>When to use Force Logout:</strong>
        </Typography>
        <ul style={{ margin: 0, paddingLeft: '20px' }}>
          <li>Regular logout doesn&apos;t work</li>
          <li>You&apos;re stuck with wrong role (e.g., &apos;client&apos; instead of &apos;admin&apos;)</li>
          <li>Cannot access dashboard or admin features</li>
          <li>Session appears corrupted or outdated</li>
        </ul>
      </Alert>

      <Alert severity="info" sx={{ mt: 2 }}>
        <Typography variant="body2">
          <strong>What Force Logout does:</strong>
        </Typography>
        <ul style={{ margin: 0, paddingLeft: '20px' }}>
          <li>Clears server-side session</li>
          <li>Removes all authentication cookies</li>
          <li>Clears browser storage</li>
          <li>Redirects to fresh signin page</li>
        </ul>
      </Alert>
    </>
  );
}