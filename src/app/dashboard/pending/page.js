"use client";

import React from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  Alert,
  AlertTitle,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  HourglassEmpty as HourglassIcon,
  Email as EmailIcon,
  Business as BusinessIcon,
  Person as PersonIcon,
  ExitToApp as LogoutIcon
} from '@mui/icons-material';
import { signOut, useSession } from 'next-auth/react';

export default function PendingApprovalPage() {
  const { data: session } = useSession();

  const handleSignOut = async () => {
    try {
      console.log('🚪 [CLIENT] Starting enhanced logout process...');
      
      // Call our custom logout API to clear server-side session
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      
      if (response.ok) {
        console.log('✅ [CLIENT] Server-side logout successful');
      }
      
      // Also call NextAuth signOut to handle client-side cleanup
      await signOut({ 
        callbackUrl: '/auth/signin',
        redirect: true
      });
      
    } catch (error) {
      console.error('❌ [CLIENT] Error during logout:', error);
      // Fallback to regular signOut if custom logout fails
      await signOut({ callbackUrl: '/auth/signin' });
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <HourglassIcon sx={{ fontSize: 80, color: 'warning.main', mb: 2 }} />
        <Typography variant="h3" gutterBottom>
          Account Pending Approval
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
          Your account is currently under review by our team
        </Typography>
      </Box>

      <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
        <Alert severity="info" sx={{ mb: 3 }}>
          <AlertTitle>What&apos;s Next?</AlertTitle>
          Your account registration has been received and is being reviewed by our administrators. 
          You&apos;ll receive an email notification once your account has been approved.
        </Alert>

        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Account Information:
          </Typography>
          <List>
            <ListItem>
              <ListItemIcon>
                <PersonIcon />
              </ListItemIcon>
              <ListItemText 
                primary="Name" 
                secondary={session?.user?.name || 'N/A'} 
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <EmailIcon />
              </ListItemIcon>
              <ListItemText 
                primary="Email" 
                secondary={session?.user?.email || 'N/A'} 
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <BusinessIcon />
              </ListItemIcon>
              <ListItemText 
                primary="Status" 
                secondary={
                  <Chip 
                    label="Pending Approval" 
                    color="warning" 
                    size="small" 
                    sx={{ mt: 0.5 }}
                  />
                } 
              />
            </ListItem>
          </List>
        </Box>

        <Alert severity="warning" sx={{ mb: 3 }}>
          <AlertTitle>Limited Access</AlertTitle>
          While your account is pending approval, you have limited access to the admin panel. 
          Full access will be granted once your account is approved.
        </Alert>

        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            If you have any questions about your account status, please contact our support team.
          </Typography>
          
          <Button
            variant="outlined"
            startIcon={<LogoutIcon />}
            onClick={handleSignOut}
            sx={{ mt: 2 }}
          >
            Sign Out
          </Button>
        </Box>
      </Paper>

      <Paper elevation={1} sx={{ p: 3, bgcolor: 'grey.50' }}>
        <Typography variant="h6" gutterBottom>
          Approval Timeline
        </Typography>
        <Typography variant="body2" color="text.secondary">
          • Account applications are typically reviewed within 1-2 business days
          <br />
          • You&apos;ll receive an email notification with the approval decision
          <br />
          • Approved users will gain immediate access to their assigned role permissions
          <br />
          • If additional information is needed, our team will contact you directly
        </Typography>
      </Paper>
    </Container>
  );
}