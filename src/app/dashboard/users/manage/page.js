"use client";

import React from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  CircularProgress
} from '@mui/material';

import { useUserManagement } from '@/hooks/users/useUserManagement';
import UserManagementHeader from '@/components/users/manage/UserManagementHeader';
import UserListTable from '@/components/users/manage/UserListTable';
import UserActionDialog from '@/components/users/manage/UserActionDialog';

function TabPanel({ children, value, index }) {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export default function UserManagementPage() {
  const {
    tabValue,
    setTabValue,
    pendingUsers,
    loading,
    error,
    setError,
    actionDialog,
    openActionDialog,
    closeActionDialog,
    setActionDialogField,
    handleAction
  } = useUserManagement();

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Loading users...
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <UserManagementHeader 
        tabValue={tabValue}
        setTabValue={setTabValue}
        pendingCount={pendingUsers.length}
        error={error}
        setError={setError}
      />

      <Paper elevation={3}>
        <TabPanel value={tabValue} index={0}>
          <UserListTable 
            pendingUsers={pendingUsers}
            openActionDialog={openActionDialog}
          />
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary">
              All Users View
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Coming soon: View and manage all users across all roles
            </Typography>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary">
              Create Admin User
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Coming soon: Create staff, dev, and admin users
            </Typography>
          </Box>
        </TabPanel>
      </Paper>

      <UserActionDialog 
        actionDialog={actionDialog}
        closeActionDialog={closeActionDialog}
        setActionDialogField={setActionDialogField}
        handleAction={handleAction}
      />
    </Container>
  );
}