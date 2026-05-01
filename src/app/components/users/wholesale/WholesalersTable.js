import React from 'react';
import {
  Typography,
  Box,
  Avatar,
  Chip,
  IconButton,
  Tooltip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  Email as EmailIcon,
  Phone as PhoneIcon,
  Storefront as StoreIcon,
} from '@mui/icons-material';

function formatDate(date) {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function getProfileChip(wholesaler) {
  if (wholesaler.reconciliationState === 'legacy_missing_profile') {
    return <Chip label="Legacy repair needed" color="warning" size="small" />;
  }

  if (wholesaler.reconciliationState === 'reconciled') {
    return <Chip label="Reconciled" color="success" size="small" />;
  }

  return <Chip label="Canonical profile" color="info" size="small" variant="outlined" />;
}

export default function WholesalersTable({ wholesalers }) {
  if (!wholesalers || wholesalers.length === 0) {
    return (
      <Typography variant="body1" color="text.secondary">
        No active wholesalers found.
      </Typography>
    );
  }

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Business</TableCell>
            <TableCell>Joined</TableCell>
            <TableCell align="center">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {wholesalers.map((wholesaler) => (
            <TableRow key={wholesaler._id}>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Avatar sx={{ mr: 2, width: 32, height: 32 }}>
                    <StoreIcon />
                  </Avatar>
                  {wholesaler.firstName} {wholesaler.lastName}
                </Box>
              </TableCell>
              <TableCell>{wholesaler.wholesaleApplication?.contactEmail || wholesaler.email}</TableCell>
              <TableCell>
                <Box>
                  <Typography variant="body2">{wholesaler.businessName || wholesaler.business || 'N/A'}</Typography>
                  <Box sx={{ mt: 0.75 }}>
                    {getProfileChip(wholesaler)}
                  </Box>
                </Box>
              </TableCell>
              <TableCell>{formatDate(wholesaler.createdAt)}</TableCell>
              <TableCell align="center">
                <Tooltip title="Contact">
                  <IconButton size="small" href={`mailto:${wholesaler.wholesaleApplication?.contactEmail || wholesaler.email}`}>
                    <EmailIcon />
                  </IconButton>
                </Tooltip>
                {(wholesaler.wholesaleApplication?.contactPhone || wholesaler.contactPhone) && (
                  <Tooltip title="Call">
                    <IconButton size="small" href={`tel:${wholesaler.wholesaleApplication?.contactPhone || wholesaler.contactPhone}`}>
                      <PhoneIcon />
                    </IconButton>
                  </Tooltip>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
