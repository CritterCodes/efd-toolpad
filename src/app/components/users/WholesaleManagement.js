'use client';

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Alert,
  Tabs,
  Tab,
  CircularProgress,
} from '@mui/material';

import { useWholesaleManagement } from '@/hooks/users/useWholesaleManagement';
import StatsCards from './wholesale/StatsCards';
import ApplicationsList from './wholesale/ApplicationsList';
import WholesalersTable from './wholesale/WholesalersTable';
import ReconciliationList from './wholesale/ReconciliationList';
import ActionDialog from './wholesale/ActionDialog';
import DetailDialog from './wholesale/DetailDialog';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`wholesale-tabpanel-${index}`}
      aria-labelledby={`wholesale-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function WholesaleManagement() {
  const {
    wholesalers,
    applications,
    reconciliation,
    stats,
    loading,
    error,
    handleApprove,
    handleReject,
    handleReconciliationAction,
  } = useWholesaleManagement();

  const [tabValue, setTabValue] = useState(0);
  
  // Dialog States
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState('');
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const openActionDialog = (application, action) => {
    setSelectedApplication(application);
    setActionType(action);
    setActionDialogOpen(true);
  };

  const openDetailDialog = (application) => {
    setSelectedApplication(application);
    setDetailDialogOpen(true);
  };

  const confirmAction = async (applicationId, reviewNotes) => {
    if (actionType === 'approve') {
      await handleApprove(applicationId, reviewNotes);
    } else {
      await handleReject(applicationId, reviewNotes);
    }
    setActionDialogOpen(false);
  };

  if (loading && applications.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Wholesale Management
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Manage wholesale partner applications and approved wholesale accounts
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Statistics Cards */}
      <StatsCards stats={stats} />

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label={`Applications (${applications.length})`} />
          <Tab label={`Active Wholesalers (${wholesalers.length})`} />
          <Tab label={`Reconciliation (${(reconciliation?.legacyWholesalers?.length || 0) + (reconciliation?.safeMatches?.length || 0) + (reconciliation?.ambiguousMatches?.length || 0)})`} />
        </Tabs>
      </Box>

      {/* Applications Tab */}
      <TabPanel value={tabValue} index={0}>
        <ApplicationsList 
          applications={applications} 
          onOpenDetail={openDetailDialog}
          onOpenAction={openActionDialog}
        />
      </TabPanel>

      {/* Active Wholesalers Tab */}
      <TabPanel value={tabValue} index={1}>
        <WholesalersTable wholesalers={wholesalers} />
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <ReconciliationList
          reconciliation={reconciliation}
          loading={loading}
          onAction={handleReconciliationAction}
        />
      </TabPanel>

      {/* Action Dialog */}
      <ActionDialog 
        open={actionDialogOpen}
        onClose={() => setActionDialogOpen(false)}
        application={selectedApplication}
        actionType={actionType}
        onConfirm={confirmAction}
        loading={loading}
      />

      {/* Detail Dialog */}
      <DetailDialog 
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        application={selectedApplication}
      />
    </Box>
  );
}
