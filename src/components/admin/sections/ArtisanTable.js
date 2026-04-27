"use client";
import React from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Chip, Box, Typography, IconButton, Tooltip,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useRouter } from 'next/navigation';

export default function ArtisanTable({ data = [] }) {
  const router = useRouter();

  if (data.length === 0) {
    return (
      <Box sx={{ py: 6, textAlign: 'center' }}>
        <Typography color="text.secondary">No artisans found.</Typography>
      </Box>
    );
  }

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow sx={{ '& th': { fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em' } }}>
            <TableCell>Name</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Types</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((artisan) => {
            const name = `${artisan.firstName || ''} ${artisan.lastName || ''}`.trim() || '—';
            const types = artisan.artisanTypes || [];
            const isOnsite = artisan.employment?.isOnsite === true;
            const hasRepairOps = artisan.staffCapabilities?.repairOps === true;
            const isApproved = artisan.isApproved;

            return (
              <TableRow
                key={artisan._id || artisan.userID}
                hover
                sx={{ cursor: 'pointer' }}
                onClick={() => router.push(`/dashboard/users/artisans/${artisan._id}`)}
              >
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>{name}</Typography>
                  {artisan.business && (
                    <Typography variant="caption" color="text.secondary" display="block">{artisan.business}</Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{artisan.email || '—'}</Typography>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {types.length > 0
                      ? types.map((t) => (
                          <Chip key={t} label={t} size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 20 }} />
                        ))
                      : <Typography variant="caption" color="text.secondary">—</Typography>
                    }
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {isApproved === false && (
                      <Chip label="Pending" size="small" color="warning" sx={{ fontSize: '0.65rem', height: 20 }} />
                    )}
                    {isOnsite && (
                      <Chip label="On-site" size="small" color="primary" variant="outlined" sx={{ fontSize: '0.65rem', height: 20 }} />
                    )}
                    {hasRepairOps && (
                      <Chip label="Repair Ops" size="small" color="success" variant="outlined" sx={{ fontSize: '0.65rem', height: 20 }} />
                    )}
                    {!isOnsite && !hasRepairOps && isApproved !== false && (
                      <Typography variant="caption" color="text.secondary">Active</Typography>
                    )}
                  </Box>
                </TableCell>
                <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                  <Tooltip title="View profile">
                    <IconButton
                      size="small"
                      onClick={() => router.push(`/dashboard/users/artisans/${artisan._id}`)}
                    >
                      <OpenInNewIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
