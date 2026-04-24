"use client";
import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Breadcrumbs, Link, CircularProgress, Alert,
  Table, TableHead, TableRow, TableCell, TableBody, Paper, TableContainer
} from '@mui/material';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

export default function AffiliateClientsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const mRes = await fetch('/api/affiliates/metrics');
        const mData = await mRes.json();
        if (!mData.success) throw new Error(mData.error || 'Failed to load metrics.');

        const userIds = mData.data?.referredUserIds || [];
        if (!userIds.length) {
          setClients([]);
          return;
        }

        // Fetch basic user info for referred clients
        const userPromises = userIds.slice(0, 50).map((id) =>
          fetch(`/api/users?query=${id}`).then((r) => r.json()).catch(() => null)
        );
        const users = (await Promise.all(userPromises)).filter(Boolean).map((u) => u.user || u).filter(Boolean);
        setClients(users);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    if (session) load();
  }, [session]);

  return (
    <Box sx={{ p: 3 }}>
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link underline="hover" color="inherit" onClick={() => router.push('/dashboard')} sx={{ cursor: 'pointer' }}>Dashboard</Link>
        <Link underline="hover" color="inherit" onClick={() => router.push('/dashboard/affiliate')} sx={{ cursor: 'pointer' }}>Affiliate</Link>
        <Typography color="text.primary">Referred Clients</Typography>
      </Breadcrumbs>

      <Typography variant="h5" fontWeight={600} mb={3}>Referred Clients</Typography>

      {loading && <CircularProgress />}
      {error && <Alert severity="error">{error}</Alert>}

      {!loading && !error && clients.length === 0 && (
        <Alert severity="info">No referred clients yet. Share your campaign links to get started.</Alert>
      )}

      {!loading && clients.length > 0 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Member Since</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {clients.map((c, i) => (
                <TableRow key={c.userID || i}>
                  <TableCell>{`${c.firstName || ''} ${c.lastName ? c.lastName[0] + '.' : ''}`.trim() || '—'}</TableCell>
                  <TableCell>{c.email ? `${c.email.split('@')[0].slice(0, 2)}***@${c.email.split('@')[1]}` : '—'}</TableCell>
                  <TableCell>{fmtDate(c.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
