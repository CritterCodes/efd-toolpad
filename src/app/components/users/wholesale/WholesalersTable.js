import React from 'react';
import {
  Typography,
  Box,
  Avatar,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  Stack,
  Tooltip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import {
  Email as EmailIcon,
  Edit as EditIcon,
  Phone as PhoneIcon,
  Storefront as StoreIcon,
} from '@mui/icons-material';

function formatDate(date) {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
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

export default function WholesalersTable({ wholesalers, onOpenDetail }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  if (!wholesalers || wholesalers.length === 0) {
    return (
      <Typography variant="body1" color="text.secondary">
        No active wholesalers found.
      </Typography>
    );
  }

  if (isMobile) {
    return (
      <Stack spacing={2}>
        {wholesalers.map((wholesaler) => (
          <Card key={wholesaler.id} variant="outlined">
            <CardContent sx={{ p: 2 }}>
              <Stack spacing={1.5}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                  <Avatar sx={{ width: 36, height: 36 }}>
                    <StoreIcon />
                  </Avatar>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="subtitle2" noWrap>
                      {[wholesaler.firstName, wholesaler.lastName].filter(Boolean).join(' ') || 'Wholesale Contact'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {wholesaler.businessName || wholesaler.business || 'N/A'}
                    </Typography>
                  </Box>
                </Box>

                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                  {getProfileChip(wholesaler)}
                  <Chip label={`Joined ${formatDate(wholesaler.createdAt)}`} size="small" variant="outlined" />
                </Stack>

                <Box>
                  <Typography variant="body2">
                    {wholesaler.wholesaleApplication?.contactEmail || wholesaler.email || 'No email'}
                  </Typography>
                  {(wholesaler.wholesaleApplication?.contactPhone || wholesaler.contactPhone) && (
                    <Typography variant="body2" color="text.secondary">
                      {wholesaler.wholesaleApplication?.contactPhone || wholesaler.contactPhone}
                    </Typography>
                  )}
                </Box>

                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                  <Button size="small" variant="contained" startIcon={<EditIcon />} onClick={() => onOpenDetail?.(wholesaler)}>
                    View / Edit
                  </Button>
                  <Button size="small" variant="outlined" startIcon={<EmailIcon />} href={`mailto:${wholesaler.wholesaleApplication?.contactEmail || wholesaler.email}`}>
                    Email
                  </Button>
                  {(wholesaler.wholesaleApplication?.contactPhone || wholesaler.contactPhone) && (
                    <Button size="small" variant="outlined" startIcon={<PhoneIcon />} href={`tel:${wholesaler.wholesaleApplication?.contactPhone || wholesaler.contactPhone}`}>
                      Call
                    </Button>
                  )}
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>
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
            <TableRow key={wholesaler.id}>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Avatar sx={{ mr: 2, width: 32, height: 32 }}>
                    <StoreIcon />
                  </Avatar>
                  {[wholesaler.firstName, wholesaler.lastName].filter(Boolean).join(' ')}
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
                <Tooltip title="View or edit details">
                  <IconButton size="small" onClick={() => onOpenDetail?.(wholesaler)}>
                    <EditIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Email">
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
