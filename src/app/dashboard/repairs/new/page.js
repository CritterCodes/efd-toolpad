"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { PageContainer } from '@toolpad/core/PageContainer';
import { Box, Button, Typography, Alert, Snackbar } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import NewRepairForm from '@/app/components/repairs/NewRepairForm';

const NewRepairPage = () => {
  const router = useRouter();
  const { data: session } = useSession();
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });
  const [isWholesaler, setIsWholesaler] = useState(false);
  const [wholesalerStoreId, setWholesalerStoreId] = useState(null);
  const [wholesalerStoreName, setWholesalerStoreName] = useState(null);

  // Set up wholesaler as the store (not the client)
  useEffect(() => {
    if (session?.user) {
      const userRole = session.user.role;
      if (userRole === 'wholesaler') {
        setIsWholesaler(true);
        // Wholesaler IS the store — they pick a client from their client list
        setWholesalerStoreId(session.user.id || session.user.userID || session.user.email);
        setWholesalerStoreName(session.user.name || session.user.email);
      }
    }
  }, [session]);

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
    if (isWholesaler) {
      router.push('/dashboard/repairs/my-repairs');
    } else {
      router.push('/dashboard/repairs/all');
    }
  };

  return (
    <PageContainer
      title="New Repair"
      breadcrumbs={[
        { title: 'Dashboard', path: '/dashboard' },
        { 
          title: isWholesaler ? 'My Repairs' : 'Repairs', 
          path: isWholesaler ? '/dashboard/repairs/my-repairs' : '/dashboard/repairs/all'
        },
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

      {/* New Repair Form - no longer a modal, rendered directly */}
      <Box sx={{ backgroundColor: 'background.paper', borderRadius: 2, p: 0 }}>
        <NewRepairForm
          onSubmit={handleSubmit}
          isWholesale={isWholesaler}
          wholesalerStoreId={wholesalerStoreId}
          wholesalerStoreName={wholesalerStoreName}
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
