"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Box, Button, Typography, Alert, Snackbar, Stack, Chip, useMediaQuery, useTheme } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import NewRepairForm from '@/app/components/repairs/NewRepairForm';

const COLORS = {
  bgPrimary: '#0F1115',
  bgPanel: '#15181D',
  bgCard: '#171A1F',
  bgTertiary: '#1F232A',
  border: '#2A2F38',
  textPrimary: '#E6E8EB',
  textHeader: '#D1D5DB',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  accent: '#D4AF37',
};

const NewRepairPage = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });
  const [isWholesaler, setIsWholesaler] = useState(false);
  const [wholesalerStoreId, setWholesalerStoreId] = useState(null);
  const [wholesalerStoreName, setWholesalerStoreName] = useState(null);

  useEffect(() => {
    if (status !== 'authenticated') return;

    const isAdmin = session?.user?.role === 'admin';
    const isWholesaler = session?.user?.role === 'wholesaler';
    const isOnsiteRepairOps = session?.user?.role === 'artisan'
      && session?.user?.employment?.isOnsite === true
      && session?.user?.staffCapabilities?.repairOps === true;

    if (!isAdmin && !isWholesaler && !isOnsiteRepairOps) {
      router.push('/dashboard');
    }
  }, [router, session, status]);

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

  if (status === 'loading') return null;

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
        router.push('/dashboard/repairs/receiving');
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
      router.push('/dashboard/repairs/receiving');
    }
  };

  return (
    <Box sx={{ pb: 10 }}>
      <Stack spacing={3}>
        <Box
          sx={{
            backgroundColor: { xs: 'transparent', sm: COLORS.bgPanel },
            border: { xs: 'none', sm: `1px solid ${COLORS.border}` },
            borderRadius: { xs: 0, sm: 3 },
            boxShadow: { xs: 'none', sm: '0 8px 24px rgba(0,0,0,0.45)' },
            p: { xs: 0, md: 3, sm: 2.5 },
          }}
        >
          <Stack spacing={2.5}>
            <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between" spacing={2}>
              <Box>
                <Chip
                  label={isWholesaler ? 'Wholesale intake' : 'Repair intake'}
                  size="small"
                  sx={{
                    mb: 1.5,
                    backgroundColor: COLORS.bgCard,
                    color: COLORS.textPrimary,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 2,
                  }}
                />
                <Typography sx={{ fontSize: { xs: 28, md: 36 }, fontWeight: 600, color: COLORS.textHeader, mb: 1 }}>
                  Create a new repair
                </Typography>
                <Typography sx={{ color: COLORS.textSecondary, maxWidth: 720, lineHeight: 1.6 }}>
                  Intake client details, capture item information, assign services and pricing, then generate the repair ticket.
                </Typography>
              </Box>
              <Button
                startIcon={<ArrowBack />}
                onClick={handleCancel}
                variant="outlined"
                fullWidth={isMobile}
                sx={{
                  color: COLORS.textPrimary,
                  borderColor: COLORS.border,
                  backgroundColor: COLORS.bgCard,
                  textTransform: 'none',
                  fontWeight: 600,
                  '&:hover': {
                    borderColor: COLORS.accent,
                    backgroundColor: COLORS.bgTertiary,
                  },
                }}
              >
                Back to Repairs
              </Button>
            </Stack>
          </Stack>
        </Box>

        <Box
          sx={{
            '& .MuiAlert-root': {
              backgroundColor: COLORS.bgCard,
              color: COLORS.textPrimary,
              border: `1px solid ${COLORS.border}`,
            },
            '& .MuiPaper-root': {
              backgroundImage: 'none',
            },
            '& .MuiFormLabel-root, & .MuiInputLabel-root, & .MuiFormHelperText-root, & .MuiTypography-caption': {
              color: `${COLORS.textSecondary} !important`,
            },
            '& .MuiTypography-body1, & .MuiTypography-body2': {
              color: COLORS.textPrimary,
            },
            '& .MuiTypography-overline': {
              color: `${COLORS.textHeader} !important`,
            },
            '& .MuiTypography-h6, & .MuiTypography-subtitle1, & .MuiTypography-subtitle2': {
              color: COLORS.textHeader,
            },
            '& .MuiFormControlLabel-label': {
              color: COLORS.textPrimary,
            },
            '& .MuiOutlinedInput-root, & .MuiSelect-select, & .MuiAutocomplete-inputRoot': {
              backgroundColor: COLORS.bgCard,
              color: COLORS.textPrimary,
            },
            '& .MuiOutlinedInput-root fieldset': {
              borderColor: COLORS.border,
            },
            '& .MuiOutlinedInput-root:hover fieldset': {
              borderColor: COLORS.textSecondary,
            },
            '& .MuiOutlinedInput-root.Mui-focused fieldset': {
              borderColor: COLORS.accent,
            },
            '& .MuiInputBase-input::placeholder': {
              color: COLORS.textMuted,
              opacity: 1,
            },
            '& .MuiChip-root': {
              borderRadius: 2,
            },
            '& .MuiChip-outlined': {
              color: COLORS.textPrimary,
              borderColor: COLORS.border,
              backgroundColor: COLORS.bgCard,
            },
            '& .MuiChip-filled': {
              color: COLORS.textPrimary,
              backgroundColor: COLORS.bgTertiary,
            },
            '& .MuiButton-outlined': {
              color: COLORS.textPrimary,
              borderColor: COLORS.border,
              backgroundColor: COLORS.bgCard,
            },
            '& .MuiButtonBase-root.Mui-disabled, & .MuiLoadingButton-root.Mui-disabled': {
              color: `${COLORS.textMuted} !important`,
              borderColor: `${COLORS.border} !important`,
              backgroundColor: `${COLORS.bgCard} !important`,
              opacity: 0.55,
            },
            '& .MuiButton-text': {
              color: COLORS.accent,
            },
            '& .MuiDivider-root': {
              borderColor: COLORS.border,
            },
            '& .MuiSwitch-track': {
              backgroundColor: `${COLORS.bgTertiary} !important`,
            },
            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
              backgroundColor: `${COLORS.accent} !important`,
              opacity: 0.35,
            },
            '& .MuiSwitch-switchBase.Mui-disabled + .MuiSwitch-track': {
              opacity: '0.4 !important',
            },
            '& .MuiSwitch-switchBase.Mui-disabled .MuiSwitch-thumb': {
              color: `${COLORS.textMuted} !important`,
            },
            '& .MuiFab-root': {
              backgroundColor: COLORS.bgCard,
              color: COLORS.accent,
              border: `1px solid ${COLORS.border}`,
              boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
            },
          }}
        >
          <NewRepairForm
            onSubmit={handleSubmit}
            isWholesale={isWholesaler}
            wholesalerStoreId={wholesalerStoreId}
            wholesalerStoreName={wholesalerStoreName}
          />
        </Box>
      </Stack>

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
    </Box>
  );
};

export default NewRepairPage;

