'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Box, Button, Stack, Typography, CircularProgress, Alert } from '@mui/material';

/**
 * PRINTABLE CUSTOM-ORDER INVOICE / RECEIPT.
 *
 * `?kind=receipt` prints the receipt for a settled invoice; the default is the invoice.
 *
 * The document HTML is built SERVER-SIDE by the same renderer the email uses and dropped in here
 * verbatim. This page deliberately contains no layout of its own: the moment it formats anything, the
 * printed copy and the emailed copy start to diverge, and a customer ends up holding paper that
 * disagrees with their email about what they owe.
 *
 * It renders into an iframe rather than the page body so the document's own @page rules and print CSS
 * apply, and the dashboard's fonts and MUI resets cannot bleed into it.
 */
export default function CustomInvoicePrintPage() {
  const { customID, invoiceID } = useParams();
  const kind = useSearchParams().get('kind') === 'receipt' ? 'receipt' : 'invoice';

  const [html, setHtml] = useState('');
  const [doc, setDoc] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/custom-orders/${customID}/invoices/${invoiceID}/document?kind=${kind}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not load the document.');
        if (!cancelled) { setHtml(data.html); setDoc(data.doc); }
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
    })();
    return () => { cancelled = true; };
  }, [customID, invoiceID, kind]);

  // Print the IFRAME, not the page — otherwise the browser prints the dashboard chrome around it.
  const print = () => {
    const frame = document.getElementById('efd-doc');
    if (frame?.contentWindow) { frame.contentWindow.focus(); frame.contentWindow.print(); }
  };

  if (error) return <Box sx={{ p: 3 }}><Alert severity="error">{error}</Alert></Box>;
  if (!html) {
    return <Box sx={{ p: 6, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>;
  }

  return (
    <Box sx={{ p: 2 }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }} className="no-print">
        <Button variant="contained" onClick={print}>Print {kind}</Button>
        <Button
          variant="outlined"
          component="a"
          href={`/dashboard/customs/${customID}/invoices/${invoiceID}/print?kind=${kind === 'receipt' ? 'invoice' : 'receipt'}`}
        >
          {kind === 'receipt' ? 'View invoice' : 'View receipt'}
        </Button>
        {doc && (
          <Typography variant="body2" sx={{ ml: 1, opacity: 0.75 }}>
            {doc.invoiceNumber} — {doc.balanceDue > 0 ? `balance $${doc.balanceDue.toFixed(2)}` : 'paid in full'}
          </Typography>
        )}
      </Stack>

      <Box
        component="iframe"
        id="efd-doc"
        title={`${doc?.invoiceNumber || ''} ${kind}`}
        srcDoc={html}
        sx={{ width: '100%', minHeight: '11in', border: '1px solid rgba(255,255,255,0.15)', bgcolor: '#fff' }}
      />
    </Box>
  );
}
