"use client";
import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Breadcrumbs, Link, CircularProgress, Alert,
  Table, TableHead, TableRow, TableCell, TableBody, Paper, TableContainer, Chip, Button
} from '@mui/material';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

export default function AdminAffiliatesPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [affiliates, setAffiliates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/affiliates?limit=100')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setAffiliates(d.data || []);
        else setError(d.error || 'Failed to load affiliates.');
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Box sx={{ p: 3 }}>
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link underline="hover" color="inherit" onClick={() => router.push('/dashboard')} sx={{ cursor: 'pointer' }}>Dashboard</Link>
        <Link underline="hover" color="inherit" onClick={() => router.push('/dashboard/admin')} sx={{ cursor: 'pointer' }}>Admin</Link>
        <Typography color="text.primary">Affiliates</Typography>
      </Breadcrumbs>

      <Typography variant="h5" fontWeight={600} mb={3}>Affiliates</Typography>

      {loading && <CircularProgress />}
      {error && <Alert severity="error">{error}</Alert>}

      {!loading && !error && affiliates.length === 0 && (
        <Alert severity="info">No affiliates yet. Promote a client from their profile page.</Alert>
      )}

      {!loading && affiliates.length > 0 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Code</TableCell>
                <TableCell>Commission</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Promoted</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {affiliates.map((a) => (
                <TableRow key={a.affiliateId} hover sx={{ cursor: 'pointer' }}>
                  <TableCell>{a.name || '—'}</TableCell>
                  <TableCell><code>{a.code}</code></TableCell>
                  <TableCell>{Math.round((a.commissionRate || 0) * 100)}%</TableCell>
                  <TableCell><Chip label={a.status} color={a.status === 'active' ? 'success' : 'default'} size="small" /></TableCell>
                  <TableCell>{fmtDate(a.promotedAt)}</TableCell>
                  <TableCell>
                    <Button size="small" onClick={() => router.push(`/dashboard/admin/affiliates/${a.affiliateId}`)}>View</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
