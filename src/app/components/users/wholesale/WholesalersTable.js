import React from 'react';
import {
  Typography,
  Box,
  Avatar,
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
              <TableCell>{wholesaler.email}</TableCell>
              <TableCell>
                {wholesaler.businessName || 'N/A'}
              </TableCell>
              <TableCell>{formatDate(wholesaler.createdAt)}</TableCell>
              <TableCell align="center">
                <Tooltip title="Contact">
                  <IconButton size="small" href={`mailto:${wholesaler.email}`}>
                    <EmailIcon />
                  </IconButton>
                </Tooltip>
                {wholesaler.contactPhone && (
                  <Tooltip title="Call">
                    <IconButton size="small" href={`tel:${wholesaler.contactPhone}`}>
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