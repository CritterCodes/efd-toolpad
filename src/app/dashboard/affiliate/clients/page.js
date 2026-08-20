"use client";
import React, { useState, useEffect } from 'react';
import {
  Box, Typography, CircularProgress, Alert,
  Table, TableHead, TableRow, TableCell, TableBody
} from '@mui/material';
import { People as PeopleIcon } from '@mui/icons-material';
import { useSession } from 'next-auth/react';
import { REPAIRS_UI as UI } from '@/app/dashboard/repairs/components/repairsUi';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

export default function AffiliateClientsPage() {
  const { data: session } = useSession();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        // The metrics endpoint returns referred clients ALREADY privacy-masked (name +
        // last initial, email stub). This page used to fetch each full user document via
        // /api/users and mask it in the browser — which masked nothing, and that endpoint
        // is now staff/artisan-only anyway.
        const mRes = await fetch('/api/affiliates/metrics');
        const mData = await mRes.json();
        if (!mData.success) throw new Error(mData.error || 'Failed to load metrics.');
        setClients(mData.data?.referredClients || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    if (session) load();
  }, [session]);

  return (
    <Box sx={{ pb: 10 }}>
      {/* Header */}
      <Box
        sx={{
          backgroundColor: { xs: 'transparent', sm: UI.bgPanel },
          border: { xs: 'none', sm: `1px solid ${UI.border}` },
          borderRadius: { xs: 0, sm: 3 },
          boxShadow: { xs: 'none', sm: UI.shadow },
          p: { xs: 0.5, sm: 2.5, md: 3 },
          mb: 3,
        }}
      >
        <Box sx={{ mb: 1 }}>
          <Typography
            sx={{
              display: 'inline-flex', alignItems: 'center', gap: 1,
              px: 1.25, py: 0.5, mb: 1.5,
              fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em',
              color: UI.textPrimary, backgroundColor: UI.bgCard,
              border: `1px solid ${UI.border}`, borderRadius: 2, textTransform: 'uppercase',
            }}
          >
            <PeopleIcon sx={{ fontSize: 16, color: UI.accent }} />
            Affiliate
          </Typography>
          <Typography sx={{ fontSize: { xs: 28, md: 36 }, fontWeight: 600, color: UI.textHeader, mb: 1 }}>
            Referred Clients
          </Typography>
          <Typography sx={{ color: UI.textSecondary, lineHeight: 1.6 }}>
            Clients who signed up or submitted a request through your referral links.
          </Typography>
        </Box>
      </Box>

      {loading && <CircularProgress sx={{ color: UI.accent }} />}
      {error && <Alert severity="error">{error}</Alert>}

      {!loading && !error && clients.length === 0 && (
        <Box sx={{ p: 3, border: `1px solid ${UI.border}`, borderRadius: 2, backgroundColor: UI.bgCard }}>
          <Typography sx={{ color: UI.textSecondary }}>
            No referred clients yet. Share your campaign links to get started.
          </Typography>
        </Box>
      )}

      {!loading && clients.length > 0 && (
        <Box sx={{ border: `1px solid ${UI.border}`, borderRadius: 2, overflow: 'hidden' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: UI.bgTertiary }}>
                <TableCell sx={{ color: UI.textMuted, fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: `1px solid ${UI.border}` }}>Name</TableCell>
                <TableCell sx={{ color: UI.textMuted, fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: `1px solid ${UI.border}` }}>Email</TableCell>
                <TableCell sx={{ color: UI.textMuted, fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: `1px solid ${UI.border}` }}>Member Since</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {clients.map((c, i) => (
                <TableRow
                  key={c.userID || i}
                  sx={{
                    backgroundColor: UI.bgCard,
                    '&:hover': { backgroundColor: UI.bgTertiary },
                    '&:not(:last-child) td': { borderBottom: `1px solid ${UI.border}` },
                    '&:last-child td': { borderBottom: 'none' },
                  }}
                >
                  <TableCell sx={{ color: UI.textPrimary }}>{c.name || '—'}</TableCell>
                  <TableCell sx={{ color: UI.textSecondary, fontFamily: 'monospace' }}>{c.maskedEmail || '—'}</TableCell>
                  <TableCell sx={{ color: UI.textSecondary }}>{fmtDate(c.memberSince)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}
    </Box>
  );
}
