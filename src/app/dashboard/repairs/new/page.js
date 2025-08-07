"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageContainer } from '@toolpad/core/PageContainer';
import { Box, Button, Typography, Alert, Snackbar } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import NewRepairForm from '@/app/components/repairs/NewRepairForm';

const NewRepairPage = () => {
  const router = useRouter();
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });

  const showToast = (message, severity = 'success') => {
    setNotification({ open: true, message, severity });
  };

  const handleSubmit = async (result) => {
    try {
      // ✅ Repair is already created by RepairsService.createRepair()
      // Just handle the successful result - no need for another API call
      console.log('✅ Final Repair Data:', result);
      console.log('✅ Repair created successfully:', result);
      showToast?.('Repair created successfully!', 'success');
      
      // Get the repair ID from the response - check multiple possible response formats
      const repairId = result.newRepair?.repairID || 
                      result.repair?.repairID || 
                      result.repairID || 
                      result.newRepair?._id ||
                      result._id;
      console.log('📋 Redirecting to print page for repair ID:', repairId);
      
      // Navigate to print ticket page
      if (repairId) {
        router.push(`/dashboard/repairs/${repairId}/print`);
      } else {
        console.error('❌ No repair ID found in response:', result);
        showToast?.('Repair created but redirect failed - check console', 'warning');
        router.push('/dashboard/repairs/all');
      }
    } catch (error) {
      console.error('Error handling repair creation result:', error);
      showToast?.('Failed to process repair creation. Please try again.', 'error');
    }
  };

  const handleCancel = () => {
    router.push('/dashboard/repairs/all');
  };

  return (
    <PageContainer
      title="New Repair"
      breadcrumbs={[
        { title: 'Dashboard', path: '/dashboard' },
        { title: 'Repairs', path: '/dashboard/repairs/all' },
        { title: 'New Repair', path: '/dashboard/repairs/new' }
      ]}
    >
      {/* Back button */}
      <Box sx={{ mb: 2 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={handleCancel}
          variant="outlined"
          sx={{ mb: 2 }}
        >
          Back to Repairs
        </Button>
      </Box>

      {/* Page title */}
      <Typography variant="h4" component="h1" sx={{ mb: 3 }}>
        Create New Repair
      </Typography>

      {/* New Repair Form - no longer a modal, rendered directly */}
      <Box sx={{ backgroundColor: 'background.paper', borderRadius: 2, p: 0 }}>
        <NewRepairForm
          onSubmit={handleSubmit}
        />
      </Box>

      {/* Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={() => setNotification({ ...notification, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setNotification({ ...notification, open: false })}
          severity={notification.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </PageContainer>
  );
};

export default NewRepairPage;
