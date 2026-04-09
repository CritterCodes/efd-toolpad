"use client";

import React from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Check as ApproveIcon,
  Close as RejectIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon
} from '@mui/icons-material';

const getStatusColor = (status) => {
  switch (status) {
    case 'pending': return 'warning';
    case 'approved': return 'success';
    case 'rejected': return 'error';
    default: return 'default';
  }
};

const getRoleColor = (role) => {
  switch (role) {
    case 'wholesaler': return 'primary';
    case 'artisan-applicant': return 'secondary';
    case 'artisan': return 'success';
    default: return 'default';
  }
};

const formatUserName = (user = {}) => {
  const firstName = String(user?.firstName || '').trim();
  const lastName = String(user?.lastName || '').trim();
  const fullName = `${firstName} ${lastName}`.trim();

  return fullName || user?.name || user?.email || 'Unnamed User';
};

export default function UserListTable({
  pendingUsers,
  openActionDialog
}) {
  if (pendingUsers.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          No pending user approvals
        </Typography>
        <Typography variant="body2" color="text.secondary">
          All user applications have been processed.
        </Typography>
      </Box>
    );
  }

  return (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>User</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Requested Role</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Request Date</TableCell>
            <TableCell align="center">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {pendingUsers.filter(Boolean).map((user) => (
            <TableRow key={user.userID || user.email || user._id}>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PersonIcon sx={{ color: 'text.secondary' }} />
                  <Box>
                    <Typography variant="body2" fontWeight="medium">
                      {formatUserName(user)}
                    </Typography>
                    {user.phoneNumber && (
                      <Typography variant="caption" color="text.secondary">
                        <PhoneIcon sx={{ fontSize: 12, mr: 0.5 }} />
                        {user.phoneNumber}
                      </Typography>
                    )}
                  </Box>
                </Box>
              </TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <EmailIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                  {user.email}
                </Box>
              </TableCell>
              <TableCell>
                <Chip 
                  label={user.approvalData?.requestedRole || user.role} 
                  color={getRoleColor(user.approvalData?.requestedRole || user.role)}
                  size="small"
                />
              </TableCell>
              <TableCell>
                <Chip 
                  label={user.status} 
                  color={getStatusColor(user.status)}
                  size="small"
                />
              </TableCell>
              <TableCell>
                {user.approvalData?.requestedAt 
                  ? new Date(user.approvalData.requestedAt).toLocaleDateString()
                  : new Date(user.createdAt).toLocaleDateString()
                }
              </TableCell>
              <TableCell align="center">
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                  <Tooltip title="Approve User">
                    <IconButton 
                      color="success" 
                      onClick={() => openActionDialog('approve', user)}
                      size="small"
                    >
                      <ApproveIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Reject User">
                    <IconButton 
                      color="error" 
                      onClick={() => openActionDialog('reject', user)}
                      size="small"
                    >
                      <RejectIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}