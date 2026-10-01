"use client";

import React, { useEffect, useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { useSearchParams } from 'next/navigation';
import RepairTicketComponent from '@/components/print/RepairTicketComponent';

const SLIP_WIDTH = '3.6in';
const SLIP_HEIGHT = '5.5in';

export default function PrintRepairTicketsBulk() {
  const searchParams = useSearchParams();
  const ids = String(searchParams.get('ids') || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
  const [repairs, setRepairs] = useState([]);
  const [loading, setLoading] = useState(Boolean(ids.length));
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadRepairs() {
      if (ids.length === 0) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');
      try {
        const loaded = await Promise.all(ids.map(async (repairID) => {
          const response = await fetch(`/api/repairs?repairID=${encodeURIComponent(repairID)}`);
          if (!response.ok) throw new Error(`Failed to load ${repairID}`);
          return await response.json();
        }));
        if (!cancelled) setRepairs(loaded.filter(Boolean));
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load repair tickets.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadRepairs();
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  const handlePrint = () => {
    requestAnimationFrame(() => window.print());
  };

  // Every state says what the page is (the loaded view's title is the same <h1>).
  const titled = (message, color) => (
    <Box sx={{ p: 3 }}>
      <Typography component="h1" variant="h6" sx={{ mb: 1 }}>Print repair tickets</Typography>
      <Typography color={color}>{message}</Typography>
    </Box>
  );
  if (loading) return titled('Loading repair tickets...');
  if (error) return titled(error, 'error');
  if (repairs.length === 0) return titled('No repair tickets selected.');

  return (
    <Box className="bulk-print-root">
      <style jsx global>{`
        @media print {
          @page {
            size: ${SLIP_WIDTH} ${SLIP_HEIGHT};
            margin: 0;
          }
          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
          }
          nav, header, aside,
          .MuiDrawer-root,
          .MuiAppBar-root,
          .bulk-print-controls {
            display: none !important;
          }
          .bulk-ticket-page {
            page-break-after: always;
            break-after: page;
          }
          .bulk-ticket-page:last-child {
            page-break-after: auto;
            break-after: auto;
          }
        }
      `}</style>

      <Box className="bulk-print-controls" sx={{ p: 2, textAlign: 'center' }}>
        <Typography component="h1" variant="h6" sx={{ mb: 1 }}>Print {repairs.length} Repair Tickets</Typography>
        <Button variant="contained" onClick={handlePrint}>Print All</Button>
      </Box>

      {repairs.map((repair) => (
        <Box
          key={repair.repairID}
          className="bulk-ticket-page"
          sx={{
            width: SLIP_WIDTH,
            height: SLIP_HEIGHT,
            overflow: 'hidden',
            m: '0 auto 16px',
            background: '#fff',
            color: '#111',
            '@media print': {
              m: 0,
              width: SLIP_WIDTH,
              height: SLIP_HEIGHT,
            },
          }}
        >
          <RepairTicketComponent repair={repair} />
        </Box>
      ))}
    </Box>
  );
}
