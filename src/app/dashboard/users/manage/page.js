"use client";

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Check as ApproveIcon,
  Close as RejectIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  Email as EmailIcon,
  Phone as PhoneIcon
} from '@mui/icons-material';

function TabPanel({ children, value, index }) {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export default function UserManagementPage() {
  const [tabValue, setTabValue] = useState(0);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionDialog, setActionDialog] = useState({
    open: false,
    action: null,
    user: null,
    reason: '',
    notes: ''
  });

  // Load pending users
  useEffect(() => {
    fetchPendingUsers();
  }, []);

  const fetchPendingUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/users/approve');
      const data = await response.json();
      
      if (data.success) {
        setPendingUsers(data.users);
      } else {
        setError(data.error || 'Failed to load pending users');
      }
    } catch (err) {
      setError('Failed to load pending users');
      console.error('Error fetching pending users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    try {
      const { action, user, reason, notes } = actionDialog;
      
      const response = await fetch('/api/users/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          userID: user.userID,
          reason: action === 'reject' ? reason : undefined,
          notes
        })
      });

      const data = await response.json();
      
      if (data.success) {
        // Remove user from pending list
        setPendingUsers(prev => prev.filter(u => u.userID !== user.userID));
        setActionDialog({ open: false, action: null, user: null, reason: '', notes: '' });
      } else {
        setError(data.error || `Failed to ${action} user`);
      }
    } catch (err) {
      setError(`Failed to ${actionDialog.action} user`);
      console.error('Error processing user action:', err);
    }
  };

  const openActionDialog = (action, user) => {
    setActionDialog({
      open: true,
      action,
      user,
      reason: '',
      notes: ''
    });
  };

  const closeActionDialog = () => {
    setActionDialog({ open: false, action: null, user: null, reason: '', notes: '' });
  };

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

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Loading users...
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        User Management
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper elevation={3}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label={`Pending Approval (${pendingUsers.length})`} />
          <Tab label="All Users" />
          <Tab label="Create Admin User" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          {pendingUsers.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary">
                No pending user approvals
              </Typography>
              <Typography variant="body2" color="text.secondary">
                All user applications have been processed.
              </Typography>
            </Box>
          ) : (
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
                  {pendingUsers.map((user) => (
                    <TableRow key={user.userID}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <PersonIcon sx={{ color: 'text.secondary' }} />
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {user.firstName} {user.lastName}
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
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary">
              All Users View
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Coming soon: View and manage all users across all roles
            </Typography>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary">
              Create Admin User
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Coming soon: Create staff, dev, and admin users
            </Typography>
          </Box>
        </TabPanel>
      </Paper>

      {/* Action Dialog */}
      <Dialog 
        open={actionDialog.open} 
        onClose={closeActionDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {actionDialog.action === 'approve' ? 'Approve User' : 'Reject User'}
        </DialogTitle>
        <DialogContent>
          {actionDialog.user && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="body1" gutterBottom>
                <strong>User:</strong> {actionDialog.user.firstName} {actionDialog.user.lastName}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                <strong>Email:</strong> {actionDialog.user.email}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Requested Role:</strong> {actionDialog.user.approvalData?.requestedRole || actionDialog.user.role}
              </Typography>
            </Box>
          )}

          {actionDialog.action === 'reject' && (
            <TextField
              fullWidth
              label="Rejection Reason"
              multiline
              rows={3}
              value={actionDialog.reason}
              onChange={(e) => setActionDialog(prev => ({ ...prev, reason: e.target.value }))}
              required
              sx={{ mb: 2 }}
              placeholder="Please provide a reason for rejection..."
            />
          )}

          <TextField
            fullWidth
            label="Notes (Optional)"
            multiline
            rows={2}
            value={actionDialog.notes}
            onChange={(e) => setActionDialog(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Add any additional notes..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeActionDialog}>
            Cancel
          </Button>
          <Button 
            onClick={handleAction}
            variant="contained"
            color={actionDialog.action === 'approve' ? 'success' : 'error'}
            disabled={actionDialog.action === 'reject' && !actionDialog.reason.trim()}
          >
            {actionDialog.action === 'approve' ? 'Approve' : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}