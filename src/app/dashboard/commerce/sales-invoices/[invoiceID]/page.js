"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Build as BuildIcon,
  Payment as PaymentIcon,
  Print as PrintIcon,
} from '@mui/icons-material';

const UI = {
  bgPanel: '#15181D',
  bgCard: '#171A1F',
  border: '#2A2F38',
  textPrimary: '#E6E8EB',
  textHeader: '#D1D5DB',
  textSecondary: '#9CA3AF',
  accent: '#D4AF37',
};

const money = (value) => `$${Number(value || 0).toFixed(2)}`;

export default function SalesInvoiceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const invoiceID = params?.invoiceID;
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadInvoice = useCallback(async () => {
    if (!invoiceID) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/sales-invoices/${invoiceID}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load sales invoice.');
      setInvoice(data.invoice);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [invoiceID]);

  useEffect(() => {
    loadInvoice();
  }, [loadInvoice]);

  const payInvoice = async () => {
    if (!invoice) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/sales-invoices/${invoice.invoiceID}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pay', amount: invoice.remainingBalance, method: 'cash' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to collect payment.');
      setInvoice(data.invoice);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Typography sx={{ color: UI.textSecondary }}>Loading sales invoice...</Typography>;
  }

  if (!invoice) {
    return <Alert severity="error">{error || 'Sales invoice not found.'}</Alert>;
  }

  return (
    <Box sx={{ pb: 10 }}>
      <Stack spacing={3}>
        <Box sx={{ bgcolor: UI.bgPanel, border: `1px solid ${UI.border}`, borderRadius: 3, p: 3 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2}>
            <Box>
              <Button
                size="small"
                startIcon={<ArrowBackIcon />}
                onClick={() => router.push('/dashboard/commerce/sales-invoices')}
                sx={{ color: UI.accent, mb: 1 }}
              >
                Sales Invoices
              </Button>
              <Typography sx={{ color: UI.textHeader, fontSize: { xs: 28, md: 34 }, fontWeight: 700 }}>
                {invoice.invoiceID}
              </Typography>
              <Typography sx={{ color: UI.textSecondary }}>{invoice.clientName}</Typography>
            </Box>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Chip label={invoice.paymentStatus} color={invoice.paymentStatus === 'paid' ? 'success' : 'warning'} />
              <Button
                variant="outlined"
                startIcon={<PrintIcon />}
                onClick={() => router.push(`/dashboard/commerce/sales-invoices/${invoice.invoiceID}/print`)}
              >
                Print Invoice
              </Button>
              {invoice.paymentStatus !== 'paid' && invoice.status !== 'void' && (
                <Button
                  variant="contained"
                  startIcon={<PaymentIcon />}
                  disabled={saving}
                  onClick={payInvoice}
                  sx={{ bgcolor: UI.accent, color: '#111', fontWeight: 700 }}
                >
                  Collect Cash
                </Button>
              )}
            </Stack>
          </Stack>
        </Box>

        {error && <Alert severity="error">{error}</Alert>}

        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Card sx={{ bgcolor: UI.bgPanel, color: UI.textPrimary, border: `1px solid ${UI.border}` }}>
              <CardContent>
                <Stack spacing={1}>
                  <Typography sx={{ color: UI.textHeader, fontWeight: 700 }}>Totals</Typography>
                  <Typography>Subtotal: {money(invoice.subtotal)}</Typography>
                  <Typography>Tax: {money(invoice.taxAmount)}</Typography>
                  {invoice.cashDiscountApplied && <Typography>Cash discount: -{money(invoice.cashDiscountAmount)}</Typography>}
                  <Divider sx={{ borderColor: UI.border }} />
                  <Typography sx={{ fontWeight: 700 }}>Total: {money(invoice.total)}</Typography>
                  <Typography>Paid: {money(invoice.amountPaid)}</Typography>
                  <Typography>Due: {money(invoice.remainingBalance)}</Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={8}>
            <Stack spacing={2}>
              {(invoice.lineItems || []).map((line) => (
                <Card key={line.lineID} sx={{ bgcolor: UI.bgPanel, color: UI.textPrimary, border: `1px solid ${UI.border}` }}>
                  <CardContent>
                    <Stack spacing={1.5}>
                      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1}>
                        <Box>
                          <Typography sx={{ color: UI.textHeader, fontWeight: 700 }}>{line.title}</Typography>
                          <Typography variant="body2" sx={{ color: UI.textSecondary }}>
                            Seller: {line.sellerName || line.sellerUserID || 'Unassigned'}
                          </Typography>
                        </Box>
                        <Chip label={`${line.quantity} x ${money(line.unitPrice)}`} />
                      </Stack>

                      <Typography variant="body2" sx={{ color: UI.textSecondary }}>
                        Payout preview: {money(line.sellerPayoutFinal ?? line.sellerPayoutEstimate)}
                      </Typography>

                      {(line.linkedRepairIDs || []).length > 0 && (
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                          {(line.linkedRepairIDs || []).map((repairID) => (
                            <Chip
                              key={repairID}
                              icon={<PrintIcon />}
                              label={repairID}
                              onClick={() => router.push(`/dashboard/repairs/${repairID}/print`)}
                            />
                          ))}
                        </Stack>
                      )}

                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <Button
                          variant="outlined"
                          startIcon={<BuildIcon />}
                          onClick={() => router.push(`/dashboard/repairs/new?salesInvoiceID=${invoice.invoiceID}&salesLineID=${line.lineID}`)}
                        >
                          Create Linked Repair
                        </Button>
                        {(line.linkedRepairIDs || []).length > 1 && (
                          <Button
                            startIcon={<PrintIcon />}
                            onClick={() => router.push(`/dashboard/repairs/bulk-print?ids=${(line.linkedRepairIDs || []).join(',')}`)}
                          >
                            Print Line Tickets
                          </Button>
                        )}
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          </Grid>
        </Grid>

        {(invoice.linkedRepairIDs || []).length > 1 && (
          <Button
            variant="outlined"
            startIcon={<PrintIcon />}
            onClick={() => router.push(`/dashboard/repairs/bulk-print?ids=${(invoice.linkedRepairIDs || []).join(',')}`)}
            sx={{ alignSelf: 'flex-start' }}
          >
            Print All Linked Repair Tickets
          </Button>
        )}
      </Stack>
    </Box>
  );
}
