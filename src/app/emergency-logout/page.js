'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import { 
  Box, 
  Paper, 
  Typography, 
  Button, 
  Alert,
  Container,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import { forceLogout } from '@/lib/auth-utils';
import LogoutIcon from '@mui/icons-material/Logout';
import BugReportIcon from '@mui/icons-material/BugReport';

export default function EmergencyLogoutPage() {
  const { data: session, status } = useSession();

  const handleForceLogout = async () => {
    console.log('🚨 [EMERGENCY] Force logout triggered by user');
    await forceLogout();
  };

  const handleRegularLogout = async () => {
    try {
      console.log('🚪 [EMERGENCY] Regular logout attempted');
      const { signOut } = await import('next-auth/react');
      await signOut({ 
        callbackUrl: '/auth/signin',
        redirect: true
      });
    } catch (error) {
      console.error('❌ [EMERGENCY] Regular logout failed, falling back to force logout:', error);
      await forceLogout();
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Card elevation={3}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <BugReportIcon sx={{ fontSize: 60, color: 'warning.main', mb: 2 }} />
            <Typography variant="h4" gutterBottom>
              🚨 Emergency Session Management
            </Typography>
            <Typography variant="h6" color="text.secondary">
              Use this page to resolve authentication issues
            </Typography>
          </Box>

          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>Current Session Status</Typography>
            <Typography><strong>Status:</strong> {status}</Typography>
            <Typography><strong>Email:</strong> {session?.user?.email || 'Not available'}</Typography>
            <Typography><strong>Role:</strong> {session?.user?.role || 'Not available'}</Typography>
            <Typography><strong>Name:</strong> {session?.user?.name || 'Not available'}</Typography>
          </Alert>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
            🔧 Logout Options
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
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
              🚨 Force Logout & Clear All Session Data
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
        </CardContent>
      </Card>
    </Container>
  );
}