"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Box, Button, Divider, Stack, Typography } from '@mui/material';

const money = (value) => `$${Number(value || 0).toFixed(2)}`;

export default function PrintSalesInvoicePage() {
  const params = useParams();
  const invoiceID = params.invoiceID;
  const [invoice, setInvoice] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function loadInvoice() {
      try {
        const res = await fetch(`/api/sales-invoices/${invoiceID}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load sales invoice.');
        if (!cancelled) setInvoice(data.invoice);
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    }
    if (invoiceID) loadInvoice();
    return () => {
      cancelled = true;
    };
  }, [invoiceID]);

  const lineItems = useMemo(() => invoice?.lineItems || [], [invoice]);

  if (error) return <Typography color="error">{error}</Typography>;
  if (!invoice) return <Typography>Loading sales invoice...</Typography>;

  return (
    <Box sx={{ bgcolor: '#fff', color: '#111', minHeight: '100vh', p: 3 }}>
      <style>{`
        @media print {
          .print-actions { display: none !important; }
          body { background: white !important; }
        }
      `}</style>
      <Stack className="print-actions" direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
        <Button variant="contained" onClick={() => window.print()}>Print</Button>
      </Stack>

      <Box sx={{ maxWidth: 760, mx: 'auto', border: '1px solid #ddd', p: 3 }}>
        <Stack direction="row" justifyContent="space-between" spacing={2}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>Engel Fine Design</Typography>
            <Typography variant="body2">Sales Invoice</Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography sx={{ fontWeight: 700 }}>{invoice.invoiceID}</Typography>
            <Typography variant="body2">{new Date(invoice.createdAt).toLocaleString()}</Typography>
            <Typography variant="body2">{invoice.paymentStatus}</Typography>
          </Box>
        </Stack>

        <Divider sx={{ my: 2 }} />

        <Stack spacing={0.5} sx={{ mb: 2 }}>
          <Typography sx={{ fontWeight: 700 }}>Client</Typography>
          <Typography>{invoice.clientName}</Typography>
          {invoice.clientPhone && <Typography variant="body2">{invoice.clientPhone}</Typography>}
          {invoice.clientEmail && <Typography variant="body2">{invoice.clientEmail}</Typography>}
        </Stack>

        <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', mb: 2 }}>
          <Box component="thead">
            <Box component="tr" sx={{ borderBottom: '1px solid #ccc' }}>
              <Box component="th" sx={{ textAlign: 'left', py: 1 }}>Item</Box>
              <Box component="th" sx={{ textAlign: 'left', py: 1 }}>Artisan</Box>
              <Box component="th" sx={{ textAlign: 'right', py: 1 }}>Qty</Box>
              <Box component="th" sx={{ textAlign: 'right', py: 1 }}>Price</Box>
              <Box component="th" sx={{ textAlign: 'right', py: 1 }}>Total</Box>
            </Box>
          </Box>
          <Box component="tbody">
            {lineItems.map((line) => (
              <React.Fragment key={line.lineID}>
                <Box component="tr" sx={{ borderBottom: '1px solid #eee' }}>
                  <Box component="td" sx={{ py: 1 }}>{line.title}</Box>
                  <Box component="td" sx={{ py: 1 }}>{line.sellerName}</Box>
                  <Box component="td" sx={{ py: 1, textAlign: 'right' }}>{line.quantity}</Box>
                  <Box component="td" sx={{ py: 1, textAlign: 'right' }}>{money(line.unitPrice)}</Box>
                  <Box component="td" sx={{ py: 1, textAlign: 'right' }}>{money(line.lineTotal)}</Box>
                </Box>
                {(line.includedTasks || []).length > 0 && (
                  <Box component="tr">
                    <Box component="td" colSpan={5} sx={{ py: 0.75, color: '#555', fontSize: 13 }}>
                      Included work: {(line.includedTasks || []).map((task) => task.title || task.name).join(', ')}
                    </Box>
                  </Box>
                )}
              </React.Fragment>
            ))}
          </Box>
        </Box>

        <Stack spacing={0.5} sx={{ ml: 'auto', width: 260 }}>
          <Stack direction="row" justifyContent="space-between"><span>Subtotal</span><span>{money(invoice.subtotal)}</span></Stack>
          <Stack direction="row" justifyContent="space-between"><span>Tax</span><span>{money(invoice.taxAmount)}</span></Stack>
          {invoice.cashDiscountApplied && (
            <Stack direction="row" justifyContent="space-between"><span>Cash discount</span><span>-{money(invoice.cashDiscountAmount)}</span></Stack>
          )}
          <Divider />
          <Stack direction="row" justifyContent="space-between"><strong>Total</strong><strong>{money(invoice.total)}</strong></Stack>
          <Stack direction="row" justifyContent="space-between"><span>Paid</span><span>{money(invoice.amountPaid)}</span></Stack>
          <Stack direction="row" justifyContent="space-between"><strong>Balance</strong><strong>{money(invoice.remainingBalance)}</strong></Stack>
        </Stack>

        {invoice.notes && (
          <Box sx={{ mt: 3 }}>
            <Typography sx={{ fontWeight: 700 }}>Notes</Typography>
            <Typography variant="body2">{invoice.notes}</Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}
