"use client";
import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Alert, Box, Button, Chip, CircularProgress, Snackbar, Stack, Typography, useMediaQuery, useTheme } from '@mui/material';
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

export default function EditRepairPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const repairID = params?.repairID;
  const returnTo = searchParams.get('returnTo') || '';
  const getReturnPath = (nextRepairID = repairID) => {
    if (returnTo === 'closeout' && nextRepairID) {
      return `/dashboard/repairs/pick-up?closeoutRepairID=${encodeURIComponent(nextRepairID)}`;
    }
    return nextRepairID ? `/dashboard/repairs/${nextRepairID}` : '/dashboard/repairs';
  };

  const [repair, setRepair] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });

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

  useEffect(() => {
    let cancelled = false;

    const loadRepair = async () => {
      if (!repairID) return;
      setLoading(true);
      setError('');

      try {
        const response = await fetch(`/api/repairs/${repairID}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || 'Failed to load repair');
        }

        if (!cancelled) {
          setRepair(data);
        }
      } catch (fetchError) {
        if (!cancelled) {
          setError(fetchError.message || 'Failed to load repair');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadRepair();

    return () => {
      cancelled = true;
    };
  }, [repairID]);

  const isWholesalerRepair = useMemo(() => {
    return Boolean(repair?.isWholesale || session?.user?.role === 'wholesaler');
  }, [repair?.isWholesale, session?.user?.role]);
  const wholesalerAccountKey = useMemo(() => {
    if (!repair) return null;
    return repair.storeId || repair.submittedBy || repair.createdBy || null;
  }, [repair]);

  const handleSubmit = async (result) => {
    setNotification({ open: true, message: 'Repair updated successfully.', severity: 'success' });
    const nextRepairID = result?.repairID || result?.repair?.repairID || repairID;
    router.push(getReturnPath(nextRepairID));
  };

  const handleCancel = () => {
    router.push(getReturnPath());
  };

  if (status === 'loading' || loading) {
    return (
      <Box sx={{ minHeight: 360, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Stack spacing={2} alignItems="center">
          <CircularProgress sx={{ color: COLORS.accent }} />
          <Typography sx={{ color: COLORS.textSecondary }}>Loading repair...</Typography>
        </Stack>
      </Box>
    );
  }

  if (error || !repair) {
    return (
      <Box sx={{ pb: 10 }}>
        <Stack spacing={3}>
          <Button
            startIcon={<ArrowBack />}
            onClick={handleCancel}
            variant="outlined"
            sx={{ alignSelf: 'flex-start', color: COLORS.textPrimary, borderColor: COLORS.border, backgroundColor: COLORS.bgCard }}
          >
            Back
          </Button>
          <Alert severity="error" sx={{ backgroundColor: COLORS.bgCard, color: COLORS.textPrimary, border: `1px solid ${COLORS.border}` }}>
            {error || 'Unable to load repair.'}
          </Alert>
        </Stack>
      </Box>
    );
  }

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
                  label={isWholesalerRepair ? 'Wholesale repair edit' : 'Repair edit'}
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
                  Edit repair
                </Typography>
                <Typography sx={{ color: COLORS.textSecondary, maxWidth: 720, lineHeight: 1.6 }}>
                  Update client details, item information, work items, and pricing using the same intake form as repair creation.
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
                {returnTo === 'closeout' ? 'Back to Closeout' : 'Back to Repair'}
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
            '& .MuiPaper-root': { backgroundImage: 'none' },
            '& .MuiFormLabel-root, & .MuiInputLabel-root, & .MuiFormHelperText-root, & .MuiTypography-caption': {
              color: `${COLORS.textSecondary} !important`,
            },
            '& .MuiTypography-body1, & .MuiTypography-body2': { color: COLORS.textPrimary },
            '& .MuiTypography-overline': { color: `${COLORS.textHeader} !important` },
            '& .MuiTypography-h6, & .MuiTypography-subtitle1, & .MuiTypography-subtitle2': { color: COLORS.textHeader },
            '& .MuiFormControlLabel-label': { color: COLORS.textPrimary },
            '& .MuiOutlinedInput-root, & .MuiSelect-select, & .MuiAutocomplete-inputRoot': {
              backgroundColor: COLORS.bgCard,
              color: COLORS.textPrimary,
            },
            '& .MuiOutlinedInput-root fieldset': { borderColor: COLORS.border },
            '& .MuiOutlinedInput-root:hover fieldset': { borderColor: COLORS.textSecondary },
            '& .MuiOutlinedInput-root.Mui-focused fieldset': { borderColor: COLORS.accent },
            '& .MuiInputBase-input::placeholder': { color: COLORS.textMuted, opacity: 1 },
            '& .MuiChip-root': { borderRadius: 2 },
            '& .MuiChip-outlined': { color: COLORS.textPrimary, borderColor: COLORS.border, backgroundColor: COLORS.bgCard },
            '& .MuiChip-filled': { color: COLORS.textPrimary, backgroundColor: COLORS.bgTertiary },
            '& .MuiButton-outlined': { color: COLORS.textPrimary, borderColor: COLORS.border, backgroundColor: COLORS.bgCard },
            '& .MuiButtonBase-root.Mui-disabled, & .MuiLoadingButton-root.Mui-disabled': {
              color: `${COLORS.textMuted} !important`,
              borderColor: `${COLORS.border} !important`,
              backgroundColor: `${COLORS.bgCard} !important`,
              opacity: 0.55,
            },
            '& .MuiButton-text': { color: COLORS.accent },
            '& .MuiDivider-root': { borderColor: COLORS.border },
            '& .MuiSwitch-track': { backgroundColor: `${COLORS.bgTertiary} !important` },
            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
              backgroundColor: `${COLORS.accent} !important`,
              opacity: 0.35,
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
            initialData={repair}
            submitMode="edit"
            repairID={repairID}
            isWholesale={isWholesalerRepair}
            wholesalerStoreId={wholesalerAccountKey}
            wholesalerStoreName={repair?.storeName || repair?.businessName || null}
          />
        </Box>
      </Stack>

      <Snackbar
        open={notification.open}
        autoHideDuration={4000}
        onClose={() => setNotification((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setNotification((prev) => ({ ...prev, open: false }))} severity={notification.severity} variant="filled" sx={{ width: '100%' }}>
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
