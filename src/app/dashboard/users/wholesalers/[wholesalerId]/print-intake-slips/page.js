'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Print as PrintIcon,
} from '@mui/icons-material';
import WholesaleIntakeSlipComponent, {
  WHOLESALE_SLIP_HEIGHT,
  WHOLESALE_SLIP_WIDTH,
} from '@/components/print/WholesaleIntakeSlipComponent';

const SLIPS_PER_PAGE = 4;
const SHEET_GAP = '0.12in';

export default function PrintWholesaleIntakeSlipsPage() {
  const params = useParams();
  const wholesalerId = Array.isArray(params?.wholesalerId) ? params.wholesalerId[0] : params?.wholesalerId;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [wholesaler, setWholesaler] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const loadWholesaler = async () => {
      if (!wholesalerId) return;

      try {
        setLoading(true);
        setError('');

        const response = await fetch('/api/admin/wholesale?action=wholesalers');
        if (!response.ok) {
          throw new Error('Failed to load wholesale accounts');
        }

        const payload = await response.json();
        const records = payload?.data || [];
        const matched = records.find((record) => record.id === wholesalerId || record.userID === wholesalerId);

        if (!matched) {
          throw new Error('Wholesale account not found');
        }

        if (!cancelled) {
          setWholesaler(matched);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message || 'Unable to load wholesale account');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadWholesaler();

    return () => {
      cancelled = true;
    };
  }, [wholesalerId]);

  const wholesalerName = useMemo(() => {
    if (!wholesaler) return '';
    return wholesaler.wholesaleApplication?.businessName
      || wholesaler.businessName
      || wholesaler.business
      || '';
  }, [wholesaler]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !wholesaler) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error || 'Wholesale account not found'}</Alert>
      </Box>
    );
  }

  return (
    <Box className="wholesale-intake-print-page" sx={{ p: { xs: 2, sm: 3 } }}>
      <style jsx global>{`
        @media print {
          @page {
            size: letter portrait;
            margin: 0;
          }
          html,
          body {
            width: 8.5in !important;
            height: 11in !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            background: #fff !important;
          }
          body * {
            visibility: hidden !important;
            box-sizing: border-box !important;
          }
          .wholesale-intake-print-page,
          .wholesale-intake-print-page * {
            visibility: visible !important;
          }
          .wholesale-intake-print-page {
            position: fixed !important;
            inset: 0 !important;
            width: 8.5in !important;
            height: 11in !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            background: #fff !important;
          }
          .no-print {
            display: none !important;
          }
          .intake-sheet {
            width: 8.5in !important;
            height: 11in !important;
            margin: 0 !important;
            padding: 0.18in !important;
            gap: ${SHEET_GAP} !important;
            align-content: start !important;
            overflow: hidden !important;
          }
        }
      `}</style>

      <Stack className="no-print" direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="space-between" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Print Intake Slips
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {wholesalerName}
          </Typography>
        </Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <Button
            component={Link}
            href="/dashboard/users/wholesalers"
            variant="outlined"
            startIcon={<BackIcon />}
          >
            Back to Wholesalers
          </Button>
          <Button variant="contained" startIcon={<PrintIcon />} onClick={handlePrint}>
            Print 4-Up Sheet
          </Button>
        </Stack>
      </Stack>

      <Box
        className="intake-sheet"
        sx={{
          width: '8.5in',
          height: '11in',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: `repeat(2, ${WHOLESALE_SLIP_WIDTH})`,
          gridTemplateRows: `repeat(2, ${WHOLESALE_SLIP_HEIGHT})`,
          justifyContent: 'center',
          alignContent: 'start',
          gap: SHEET_GAP,
          backgroundColor: '#fff',
          p: { xs: 0, sm: '0.18in' },
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        {Array.from({ length: SLIPS_PER_PAGE }).map((_, index) => (
          <WholesaleIntakeSlipComponent
            key={index}
            wholesalerName={wholesalerName}
          />
        ))}
      </Box>
    </Box>
  );
}
