'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Avatar,
  Chip,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  TextField
} from '@mui/material';
import {
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Visibility as ViewIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Business as BusinessIcon,
  Storefront as StoreIcon,
  Description as DocumentIcon
} from '@mui/icons-material';

// API service functions
const wholesaleService = {
  getAllApplications: async (filters = {}) => {
    const params = new URLSearchParams(filters);
    const response = await fetch(`/api/admin/wholesale?${params}`);
    if (!response.ok) throw new Error('Failed to fetch wholesale applications');
    return response.json();
  },
  
  getStats: async () => {
    const response = await fetch('/api/admin/wholesale/stats');
    if (!response.ok) throw new Error('Failed to fetch wholesale stats');
    return response.json();
  },
  
  approveApplication: async (applicationId, reviewNotes = '') => {
    const response = await fetch(`/api/admin/wholesale/${applicationId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewNotes })
    });
    if (!response.ok) throw new Error('Failed to approve application');
    return response.json();
  },
  
  rejectApplication: async (applicationId, reviewNotes = '') => {
    const response = await fetch(`/api/admin/wholesale/${applicationId}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewNotes })
    });
    if (!response.ok) throw new Error('Failed to reject application');
    return response.json();
  }
};

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`wholesale-tabpanel-${index}`}
      aria-labelledby={`wholesale-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function formatDate(date) {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export default function WholesaleManagement() {
  const [wholesalers, setWholesalers] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Fetch existing wholesalers (role: 'wholesaler')
        const wholesalersResponse = await fetch('/api/users?role=wholesaler');
        const wholesalersData = await wholesalersResponse.json();
        
        // Fetch applications using the new API service
        const applicationsData = await wholesaleService.getAllApplications();
        
        // Fetch stats using the new API service
        const statsData = await wholesaleService.getStats();
        
        if (wholesalersData.success) {
          setWholesalers(wholesalersData.data || []);
        }
        
        setApplications(applicationsData || []);
        setStats(statsData || { total: 0, pending: 0, approved: 0, rejected: 0 });
        setError(null);
      } catch (error) {
        console.error('Error loading wholesale data:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleApprove = async (application) => {
    try {
      setLoading(true);
      await wholesaleService.approveApplication(application.applicationId, reviewNotes);
      setActionDialogOpen(false);
      setReviewNotes('');
      
      // Refresh data
      const applicationsData = await wholesaleService.getAllApplications();
      const statsData = await wholesaleService.getStats();
      setApplications(applicationsData || []);
      setStats(statsData || { total: 0, pending: 0, approved: 0, rejected: 0 });
    } catch (error) {
      console.error('Error approving application:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (application) => {
    try {
      setLoading(true);
      await wholesaleService.rejectApplication(application.applicationId, reviewNotes);
      setActionDialogOpen(false);
      setReviewNotes('');
      
      // Refresh data
      const applicationsData = await wholesaleService.getAllApplications();
      const statsData = await wholesaleService.getStats();
      setApplications(applicationsData || []);
      setStats(statsData || { total: 0, pending: 0, approved: 0, rejected: 0 });
    } catch (error) {
      console.error('Error rejecting application:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const openActionDialog = (application, action) => {
    setSelectedApplication(application);
    setActionType(action);
    setActionDialogOpen(true);
  };

  const openDetailDialog = (application) => {
    setSelectedApplication(application);
    setDetailDialogOpen(true);
  };

  if (loading && applications.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Wholesale Management
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Manage wholesale partner applications and approved wholesale accounts
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Statistics Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="div">
                {stats.total}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Applications
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="div" color="warning.main">
                {stats.pending}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Pending Review
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="div" color="success.main">
                {stats.approved}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Approved
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="div" color="error.main">
                {stats.rejected}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Rejected
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label={`Applications (${applications.length})`} />
          <Tab label={`Active Wholesalers (${wholesalers.length})`} />
        </Tabs>
      </Box>

      {/* Applications Tab */}
      <TabPanel value={tabValue} index={0}>
        {applications.length === 0 ? (
          <Typography variant="body1" color="text.secondary">
            No wholesale applications found.
          </Typography>
        ) : (
          <Grid container spacing={2}>
            {applications.map((application) => (
              <Grid item xs={12} md={6} lg={4} key={application.applicationId}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                        <StoreIcon />
                      </Avatar>
                      <Box>
                        <Typography variant="h6">
                          {application.wholesaleApplication?.businessName || 'N/A'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {application.email}
                        </Typography>
                      </Box>
                    </Box>

                    <Chip 
                      label={application.wholesaleApplication?.status || 'unknown'} 
                      color={
                        application.wholesaleApplication?.status === 'approved' ? 'success' :
                        application.wholesaleApplication?.status === 'rejected' ? 'error' : 'warning'
                      }
                      size="small"
                      sx={{ mb: 1 }}
                    />

                    <Typography variant="body2" gutterBottom>
                      <strong>Contact:</strong> {application.wholesaleApplication?.contactFirstName} {application.wholesaleApplication?.contactLastName}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      <strong>Phone:</strong> {application.wholesaleApplication?.contactPhone || 'N/A'}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      <strong>Location:</strong> {application.wholesaleApplication?.businessCity}, {application.wholesaleApplication?.businessState}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      <strong>Submitted:</strong> {formatDate(application.wholesaleApplication?.submittedAt)}
                    </Typography>

                    <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                      <Tooltip title="View Details">
                        <IconButton size="small" onClick={() => openDetailDialog(application)}>
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      
                      {application.wholesaleApplication?.status === 'pending' && (
                        <>
                          <Tooltip title="Approve Application">
                            <IconButton 
                              size="small" 
                              color="success"
                              onClick={() => openActionDialog(application, 'approve')}
                            >
                              <ApproveIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Reject Application">
                            <IconButton 
                              size="small" 
                              color="error"
                              onClick={() => openActionDialog(application, 'reject')}
                            >
                              <RejectIcon />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                      
                      <Tooltip title="Contact">
                        <IconButton size="small" href={`mailto:${application.email}`}>
                          <EmailIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </TabPanel>

      {/* Active Wholesalers Tab */}
      <TabPanel value={tabValue} index={1}>
        {wholesalers.length === 0 ? (
          <Typography variant="body1" color="text.secondary">
            No active wholesalers found.
          </Typography>
        ) : (
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
                      {wholesaler.wholesaleApplication?.businessName || 'N/A'}
                    </TableCell>
                    <TableCell>{formatDate(wholesaler.createdAt)}</TableCell>
                    <TableCell align="center">
                      <Tooltip title="Contact">
                        <IconButton size="small" href={`mailto:${wholesaler.email}`}>
                          <EmailIcon />
                        </IconButton>
                      </Tooltip>
                      {wholesaler.wholesaleApplication?.contactPhone && (
                        <Tooltip title="Call">
                          <IconButton size="small" href={`tel:${wholesaler.wholesaleApplication.contactPhone}`}>
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
        )}
      </TabPanel>

      {/* Action Dialog */}
      <Dialog open={actionDialogOpen} onClose={() => setActionDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {actionType === 'approve' ? 'Approve' : 'Reject'} Wholesale Application
        </DialogTitle>
        <DialogContent>
          {selectedApplication && (
            <Box>
              <Typography variant="body1" gutterBottom>
                <strong>Business:</strong> {selectedApplication.wholesaleApplication?.businessName}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Contact:</strong> {selectedApplication.wholesaleApplication?.contactFirstName} {selectedApplication.wholesaleApplication?.contactLastName}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Email:</strong> {selectedApplication.email}
              </Typography>
              
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Review Notes"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                sx={{ mt: 2 }}
                placeholder={
                  actionType === 'approve' 
                    ? 'Optional notes about the approval...' 
                    : 'Required: Please provide a reason for rejection...'
                }
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => actionType === 'approve' ? handleApprove(selectedApplication) : handleReject(selectedApplication)}
            color={actionType === 'approve' ? 'success' : 'error'}
            variant="contained"
            disabled={loading || (actionType === 'reject' && !reviewNotes.trim())}
          >
            {loading ? 'Processing...' : (actionType === 'approve' ? 'Approve' : 'Reject')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Wholesale Application Details
        </DialogTitle>
        <DialogContent>
          {selectedApplication && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Business Information</Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Business Name:</strong> {selectedApplication.wholesaleApplication?.businessName}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Address:</strong> {selectedApplication.wholesaleApplication?.businessAddress}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>City:</strong> {selectedApplication.wholesaleApplication?.businessCity}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>State:</strong> {selectedApplication.wholesaleApplication?.businessState}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>ZIP:</strong> {selectedApplication.wholesaleApplication?.businessZip}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Country:</strong> {selectedApplication.wholesaleApplication?.businessCountry}
                </Typography>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Contact Information</Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Name:</strong> {selectedApplication.wholesaleApplication?.contactFirstName} {selectedApplication.wholesaleApplication?.contactLastName}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Title:</strong> {selectedApplication.wholesaleApplication?.contactTitle}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Email:</strong> {selectedApplication.wholesaleApplication?.contactEmail}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Phone:</strong> {selectedApplication.wholesaleApplication?.contactPhone}
                </Typography>
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>Application Status</Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Status:</strong> {selectedApplication.wholesaleApplication?.status}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Submitted:</strong> {formatDate(selectedApplication.wholesaleApplication?.submittedAt)}
                </Typography>
                {selectedApplication.wholesaleApplication?.reviewedAt && (
                  <Typography variant="body2" gutterBottom>
                    <strong>Reviewed:</strong> {formatDate(selectedApplication.wholesaleApplication?.reviewedAt)}
                  </Typography>
                )}
                {selectedApplication.wholesaleApplication?.reviewNotes && (
                  <Typography variant="body2" gutterBottom>
                    <strong>Review Notes:</strong> {selectedApplication.wholesaleApplication?.reviewNotes}
                  </Typography>
                )}
              </Grid>
              
              {selectedApplication.wholesaleApplication?.documents && (
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>Documents</Typography>
                  {selectedApplication.wholesaleApplication.documents.salesTaxPermit && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <DocumentIcon />
                      <Typography variant="body2">
                        <a 
                          href={selectedApplication.wholesaleApplication.documents.salesTaxPermit.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                        >
                          Sales Tax Permit ({selectedApplication.wholesaleApplication.documents.salesTaxPermit.originalName})
                        </a>
                      </Typography>
                    </Box>
                  )}
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
