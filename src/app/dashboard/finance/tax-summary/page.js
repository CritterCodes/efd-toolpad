'use client';
/**
 * Finance → 1099 summary. Per payee, what Stripe Connect paid in a calendar year, with the identity
 * facts from their Express account and a CSV for the accountant (services/payroll/taxSummary.js).
 * Not a filing tool: the numbers and who needs a form. Threshold and owner-operator exemption are
 * computed server-side.
 */
import React, { useEffect, useState } from 'react';
import { Box, Button, Chip, CircularProgress, FormControl, InputLabel, MenuItem, Select, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { PageHeader, SurfaceCard, SectionLabel, StatusChip, facelift } from '@/components/facelift';

const money = (n) => Number(n || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
const day = (d) => (d ? new Date(d).toLocaleDateString('en-US') : '—');

export default function TaxSummaryPage() {
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setData(null); setError('');
    fetch(`/api/admin/finance/tax-summary?year=${year}`).then(async (r) => {
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'Could not load the summary.');
      setData(d);
    }).catch((e) => setError(e.message));
  }, [year]);

  const rows = data?.rows || [];
  const total = rows.reduce((s, r) => s + Number(r.totalPaid || 0), 0);
  const needing = rows.filter((r) => r.needs1099).length;

  return (
    <Box sx={{ pb: 8 }}>
      <PageHeader
        badge="Finance"
        badgeIcon={<ReceiptLongIcon fontSize="small" />}
        title="1099 summary"
        subtitle={`What Stripe Connect paid each person in ${year}, with the identity facts their Stripe account exposes. Stripe never returns tax-ID digits; the TIN lives in Stripe (its tax-form product can file for Express accounts).`}
        actions={(
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Year</InputLabel>
              <Select value={year} label="Year" onChange={(e) => setYear(Number(e.target.value))}>
                {[thisYear, thisYear - 1, thisYear - 2].map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
              </Select>
            </FormControl>
            <Button variant="contained" startIcon={<DownloadIcon />} href={`/api/admin/finance/tax-summary?year=${year}&format=csv`} sx={{ textTransform: 'none', bgcolor: facelift.gold, color: '#1a1205', '&:hover': { bgcolor: facelift.gold } }}>
              Download CSV
            </Button>
          </Stack>
        )}
      />

      {error && <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>}
      {!data && !error && <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}><CircularProgress sx={{ color: facelift.gold }} /></Box>}

      {data && (
        <Stack spacing={2}>
          <SurfaceCard style={{ padding: 20 }}>
            <SectionLabel>Totals · {year}</SectionLabel>
            <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
              <Box><Typography variant="caption" color="text.secondary">Paid via Stripe Connect</Typography><Typography sx={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>{money(total)}</Typography></Box>
              <Box><Typography variant="caption" color="text.secondary">Payees</Typography><Typography sx={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>{rows.length}</Typography></Box>
              <Box><Typography variant="caption" color="text.secondary">Need a 1099 (≥ {money(data.threshold)}, not owner)</Typography><Typography sx={{ fontSize: 22, fontWeight: 700, color: facelift.gold }}>{needing}</Typography></Box>
              <Box><Typography variant="caption" color="text.secondary">Batches</Typography><Typography sx={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>{data.batchCount}</Typography></Box>
            </Stack>
          </SurfaceCard>

          <SurfaceCard style={{ padding: 0, overflow: 'hidden' }}>
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small" sx={{ minWidth: 900, '& th, & td': { whiteSpace: 'nowrap', borderColor: facelift.hairline } }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Payee</TableCell><TableCell>Legal name (Stripe)</TableCell><TableCell align="right">Paid (net)</TableCell><TableCell align="right">Gross</TableCell><TableCell align="right">Fees</TableCell><TableCell align="right">Batches</TableCell><TableCell>First / last</TableCell><TableCell>Identity</TableCell><TableCell>1099</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.length === 0 && <TableRow><TableCell colSpan={9}><Typography color="text.secondary" sx={{ py: 2 }}>No Stripe Connect payouts in {year}.</Typography></TableCell></TableRow>}
                  {rows.map((r) => (
                    <TableRow key={r.userID}>
                      <TableCell>
                        <Typography sx={{ fontWeight: 600 }}>{r.userName}</Typography>
                        <Typography variant="caption" color="text.secondary">{r.email || r.userID}{r.role ? ` · ${r.role}` : ''}{r.isOwnerOperator ? ' · owner-operator' : ''}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography>{r.tax?.legalName || (r.taxError ? 'Stripe lookup failed' : r.stripeAccountId ? '—' : 'no Stripe account')}</Typography>
                        {r.tax?.addressLine && <Typography variant="caption" color="text.secondary">{r.tax.addressLine}</Typography>}
                      </TableCell>
                      <TableCell align="right" sx={{ fontFamily: facelift.mono }}>{money(r.totalPaid)}</TableCell>
                      <TableCell align="right" sx={{ fontFamily: facelift.mono }}>{money(r.gross)}</TableCell>
                      <TableCell align="right" sx={{ fontFamily: facelift.mono }}>{money(r.fees)}</TableCell>
                      <TableCell align="right">{r.batches}</TableCell>
                      <TableCell><Typography variant="body2">{day(r.firstPaidAt)} – {day(r.lastPaidAt)}</Typography></TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5}>
                          {r.tax?.identityVerified && <Chip size="small" label="verified" color="success" />}
                          {r.tax?.ssnLast4Provided && <Chip size="small" label="SSN on file" />}
                          {r.tax?.taxIdProvided && <Chip size="small" label="Tax ID on file" />}
                          {r.tax && !r.tax.ssnLast4Provided && !r.tax.taxIdProvided && <Chip size="small" label="no TIN yet" color="warning" />}
                        </Stack>
                      </TableCell>
                      <TableCell>{r.needs1099 ? <StatusChip label="needs 1099" /> : <Typography variant="caption" color="text.secondary">{r.isOwnerOperator ? 'owner' : 'under threshold'}</Typography>}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </SurfaceCard>
        </Stack>
      )}
    </Box>
  );
}
