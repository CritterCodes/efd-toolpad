"use client";
import React, { useState, useEffect } from 'react';
import {
  Box, Typography, CircularProgress, Alert,
  Table, TableHead, TableRow, TableCell, TableBody, Chip, Button
} from '@mui/material';
import { Link as LinkIcon } from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { REPAIRS_UI as UI } from '@/app/dashboard/repairs/components/repairsUi';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

export default function AdminAffiliatesPage() {
  const router = useRouter();
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
            <LinkIcon sx={{ fontSize: 16, color: UI.accent }} />
            Admin
          </Typography>
          <Typography sx={{ fontSize: { xs: 28, md: 36 }, fontWeight: 600, color: UI.textHeader, mb: 1 }}>
            Affiliates
          </Typography>
          <Typography sx={{ color: UI.textSecondary, lineHeight: 1.6 }}>
            Manage affiliate partners, commissions, and referral activity.
          </Typography>
        </Box>
      </Box>

      {loading && <CircularProgress sx={{ color: UI.accent }} />}
      {error && <Alert severity="error">{error}</Alert>}

      {!loading && !error && affiliates.length === 0 && (
        <Box sx={{ p: 3, border: `1px solid ${UI.border}`, borderRadius: 2, backgroundColor: UI.bgCard }}>
          <Typography sx={{ color: UI.textSecondary }}>
            No affiliates yet. Promote a client from their profile page.
          </Typography>
        </Box>
      )}

      {!loading && affiliates.length > 0 && (
        <Box sx={{ border: `1px solid ${UI.border}`, borderRadius: 2, overflow: 'hidden' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: UI.bgTertiary }}>
                {['Name', 'Code', 'Commission', 'Status', 'Promoted', ''].map((h) => (
                  <TableCell key={h} sx={{ color: UI.textMuted, fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: `1px solid ${UI.border}` }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {affiliates.map((a) => (
                <TableRow
                  key={a.affiliateId}
                  sx={{
                    backgroundColor: UI.bgCard,
                    cursor: 'pointer',
                    '&:hover': { backgroundColor: UI.bgTertiary },
                    '&:not(:last-child) td': { borderBottom: `1px solid ${UI.border}` },
                    '&:last-child td': { borderBottom: 'none' },
                  }}
                >
                  <TableCell sx={{ color: UI.textPrimary }}>{a.name || '—'}</TableCell>
                  <TableCell sx={{ color: UI.textSecondary, fontFamily: 'monospace' }}>{a.code}</TableCell>
                  <TableCell sx={{ color: UI.textPrimary }}>{Math.round((a.commissionRate || 0) * 100)}%</TableCell>
                  <TableCell>
                    <Chip
                      label={a.status}
                      size="small"
                      color={a.status === 'active' ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell sx={{ color: UI.textSecondary }}>{fmtDate(a.promotedAt)}</TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => router.push(`/dashboard/admin/affiliates/${a.affiliateId}`)}
                      sx={{ color: UI.textPrimary, borderColor: UI.border }}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}
    </Box>
  );
}
