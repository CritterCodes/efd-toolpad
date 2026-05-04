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
import WholesalerDetailDialog from './wholesale/WholesalerDetailDialog';

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
        <Box sx={{ p: { xs: 2, sm: 3 } }}>
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
    handleUpdateWholesaler,
    handleReconciliationAction,
  } = useWholesaleManagement();

  const [tabValue, setTabValue] = useState(0);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [selectedWholesaler, setSelectedWholesaler] = useState(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState('');
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [wholesalerDetailOpen, setWholesalerDetailOpen] = useState(false);

  const openActionDialog = (application, action) => {
    setSelectedApplication(application);
    setActionType(action);
    setActionDialogOpen(true);
  };

  const openDetailDialog = (application) => {
    setSelectedApplication(application);
    setDetailDialogOpen(true);
  };

  const openWholesalerDetailDialog = (wholesaler) => {
    setSelectedWholesaler(wholesaler);
    setWholesalerDetailOpen(true);
  };

  const confirmAction = async (applicationId, reviewNotes) => {
    if (actionType === 'approve') {
      await handleApprove(applicationId, reviewNotes);
    } else {
      await handleReject(applicationId, reviewNotes);
    }
    setActionDialogOpen(false);
  };

  const updateWholesaler = async (wholesalerId, payload) => {
    const updatedWholesaler = await handleUpdateWholesaler(wholesalerId, payload);
    if (updatedWholesaler) {
      setSelectedWholesaler(updatedWholesaler);
    }
  };

  if (loading && applications.length === 0 && wholesalers.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  const reconciliationCount = (reconciliation?.legacyWholesalers?.length || 0)
    + (reconciliation?.safeMatches?.length || 0)
    + (reconciliation?.ambiguousMatches?.length || 0);

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
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

      <StatsCards stats={stats} />

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={tabValue}
          onChange={(e, newValue) => setTabValue(newValue)}
          variant="scrollable"
          allowScrollButtonsMobile
          scrollButtons="auto"
        >
          <Tab label={`Applications (${applications.length})`} />
          <Tab label={`Accounts (${wholesalers.length})`} />
          <Tab label={`Reconciliation (${reconciliationCount})`} />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <ApplicationsList
          applications={applications}
          onOpenDetail={openDetailDialog}
          onOpenAction={openActionDialog}
        />
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <WholesalersTable wholesalers={wholesalers} onOpenDetail={openWholesalerDetailDialog} />
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <ReconciliationList
          reconciliation={reconciliation}
          loading={loading}
          onAction={handleReconciliationAction}
        />
      </TabPanel>

      <ActionDialog
        open={actionDialogOpen}
        onClose={() => setActionDialogOpen(false)}
        application={selectedApplication}
        actionType={actionType}
        onConfirm={confirmAction}
        loading={loading}
      />

      <DetailDialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        application={selectedApplication}
      />

      <WholesalerDetailDialog
        open={wholesalerDetailOpen}
        onClose={() => setWholesalerDetailOpen(false)}
        wholesaler={selectedWholesaler}
        onSave={updateWholesaler}
        loading={loading}
      />
    </Box>
  );
}
