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
  Business as BusinessIcon
} from '@mui/icons-material';

// API service functions
const artisanService = {
  getAllApplications: async (filters = {}) => {
    const params = new URLSearchParams(filters);
    const response = await fetch(`/api/admin/artisans?${params}`);
    if (!response.ok) throw new Error('Failed to fetch applications');
    return response.json();
  },
  
  getStats: async () => {
    const response = await fetch('/api/admin/artisans?action=stats');
    if (!response.ok) throw new Error('Failed to fetch stats');
    return response.json();
  },
  
  updateApplicationStatus: async (applicationId, status, reviewedBy, reviewNotes) => {
    const response = await fetch(`/api/admin/artisans/${applicationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, reviewedBy, reviewNotes })
    });
    if (!response.ok) throw new Error('Failed to update application');
    return response.json();
  }
};

const ArtisanManagement = () => {
  const [artisans, setArtisans] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);
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
        
        // Fetch existing artisans (role: 'artisan')
        const artisansResponse = await fetch('/api/users?role=artisan');
        const artisansData = await artisansResponse.json();
        
        // Fetch applications using the new API service
        const applicationsData = await artisanService.getAllApplications();
        
        // Fetch stats using the new API service
        const statsData = await artisanService.getStats();
        
        if (artisansData.success) {
          setArtisans(artisansData.data || []);
        }
        
        setApplications(applicationsData || []);
        setStats(statsData);
        
      } catch (error) {
        console.error('Error fetching data:', error);
        showAlert('Failed to load data', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch existing artisans (role: 'artisan')
      const artisansResponse = await fetch('/api/users?role=artisan');
      const artisansData = await artisansResponse.json();
      
      // Fetch applications using the new API service
      const applicationsData = await artisanService.getAllApplications();
      
      // Fetch stats using the new API service
      const statsData = await artisanService.getStats();
      
      if (artisansData.success) {
        setArtisans(artisansData.data || []);
      }
      
      setApplications(applicationsData || []);
      setStats(statsData);
      
    } catch (error) {
      console.error('Error fetching data:', error);
      showAlert('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (message, severity = 'info') => {
    setAlert({ message, severity });
    setTimeout(() => setAlert(null), 5000);
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleApplicationAction = async (application, action) => {
    setSelectedApplication(application);
    setActionType(action);
    setReviewNotes('');
    setActionDialogOpen(true);
  };

  const confirmApplicationAction = async () => {
    try {
      const result = await artisanService.updateApplicationStatus(
        selectedApplication.applicationId, 
        actionType, 
        'admin-user-id', // TODO: Get actual admin user ID from session
        reviewNotes
      );
      
      if (result.success) {
        showAlert(`Application ${actionType} successfully`, 'success');
        fetchData(); // Refresh all data
      } else {
        showAlert(`Failed to ${actionType} application`, 'error');
      }
      
    } catch (error) {
      console.error(`Error ${actionType} application:`, error);
      showAlert(`Error ${actionType} application`, 'error');
    }
    
    setActionDialogOpen(false);
    setSelectedApplication(null);
    setActionType('');
    setReviewNotes('');
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'approved': return 'success';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  const ApplicationCard = ({ application }) => (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: 'primary.main' }}>
              {application.firstName?.[0]}{application.lastName?.[0]}
            </Avatar>
            <Box>
              <Typography variant="h6">
                {application.firstName} {application.lastName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {application.email}
              </Typography>
            </Box>
          </Box>
          <Chip
            size="small"
            label={application.status}
            color={getStatusColor(application.status)}
          />
        </Box>

        <Typography variant="body2" gutterBottom>
          <strong>Business:</strong> {application.businessName || 'N/A'}
        </Typography>
        <Typography variant="body2" gutterBottom>
          <strong>Type:</strong> {application.artisanType || 'N/A'}
        </Typography>
        <Typography variant="body2" gutterBottom>
          <strong>Phone:</strong> {application.phoneNumber || 'N/A'}
        </Typography>
        <Typography variant="body2" gutterBottom>
          <strong>Submitted:</strong> {formatDate(application.submittedAt)}
        </Typography>

        {/* Show specialties, services, materials if available */}
        {application.specialties && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" gutterBottom>
              <strong>Specialties:</strong>
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {(Array.isArray(application.specialties) ? application.specialties : application.specialties.split(', ')).map((specialty, index) => (
                <Chip key={index} size="small" label={specialty} variant="outlined" />
              ))}
            </Box>
          </Box>
        )}

        <Box sx={{ mt: 2, display: 'flex', gap: 1, justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="View Details">
              <IconButton 
                size="small"
                onClick={() => {
                  setSelectedApplication(application);
                  setDetailDialogOpen(true);
                }}
              >
                <ViewIcon />
              </IconButton>
            </Tooltip>
            {application.email && (
              <Tooltip title="Send Email">
                <IconButton size="small" onClick={() => window.open(`mailto:${application.email}`)}>
                  <EmailIcon />
                </IconButton>
              </Tooltip>
            )}
            {application.phoneNumber && (
              <Tooltip title="Call">
                <IconButton size="small" onClick={() => window.open(`tel:${application.phoneNumber}`)}>
                  <PhoneIcon />
                </IconButton>
              </Tooltip>
            )}
          </Box>
          
          {application.status === 'pending' && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                size="small"
                variant="contained"
                color="success"
                startIcon={<ApproveIcon />}
                onClick={() => handleApplicationAction(application, 'approved')}
              >
                Approve
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="error"
                startIcon={<RejectIcon />}
                onClick={() => handleApplicationAction(application, 'rejected')}
              >
                Reject
              </Button>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );

  const ArtisanCard = ({ artisan }) => (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: 'secondary.main' }}>
              {artisan.firstName?.[0]}{artisan.lastName?.[0]}
            </Avatar>
            <Box>
              <Typography variant="h6">
                {artisan.firstName} {artisan.lastName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {artisan.email}
              </Typography>
            </Box>
          </Box>
          <Chip size="small" label="Active" color="success" />
        </Box>

        <Typography variant="body2" gutterBottom>
          <strong>Role:</strong> {artisan.role}
        </Typography>
        <Typography variant="body2" gutterBottom>
          <strong>Joined:</strong> {formatDate(artisan.createdAt)}
        </Typography>

        {/* Show artisan application details if available */}
        {artisan.artisanApplication && (
          <>
            <Typography variant="body2" gutterBottom>
              <strong>Business:</strong> {artisan.artisanApplication.businessName || 'N/A'}
            </Typography>
            <Typography variant="body2" gutterBottom>
              <strong>Type:</strong> {artisan.artisanApplication.artisanType || 'N/A'}
            </Typography>
            <Typography variant="body2" gutterBottom>
              <strong>Approved:</strong> {formatDate(artisan.artisanApplication.approvedAt)}
            </Typography>
          </>
        )}

        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
          <Tooltip title="View Profile">
            <IconButton size="small">
              <ViewIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Contact">
            <IconButton size="small" onClick={() => window.open(`mailto:${artisan.email}`)}>
              <EmailIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Business Profile">
            <IconButton size="small">
              <BusinessIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </CardContent>
    </Card>
  );

  const StatCard = ({ title, value, color = 'primary' }) => (
    <Card>
      <CardContent>
        <Typography variant="h4" color={color} gutterBottom>
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {title}
        </Typography>
      </CardContent>
    </Card>
  );

  const pendingApplications = applications.filter(app => app.status === 'pending');
  const approvedApplications = applications.filter(app => app.status === 'approved');

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {alert && (
        <Alert severity={alert.severity} sx={{ mb: 3 }} onClose={() => setAlert(null)}>
          {alert.message}
        </Alert>
      )}

      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Artisan Management
        </Typography>
        <Typography variant="body1" color="text.secondary" gutterBottom>
          Manage artisan accounts, vendor profiles, and review applications.
        </Typography>
      </Box>

      {/* Statistics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Total Applications" value={stats.total} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Pending Review" value={stats.pending} color="warning.main" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Approved" value={stats.approved} color="success.main" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Active Artisans" value={artisans.length} color="info.main" />
        </Grid>
      </Grid>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Active Artisans" />
          <Tab label={`Pending Applications (${pendingApplications.length})`} />
          <Tab label="All Applications" />
        </Tabs>
      </Box>

      {/* Tab Content */}
      {tabValue === 0 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Active Artisans ({artisans.length})
          </Typography>
          
          <Grid container spacing={3}>
            {artisans.map((artisan) => (
              <Grid item xs={12} sm={6} md={4} key={artisan._id}>
                <ArtisanCard artisan={artisan} />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {tabValue === 1 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Pending Applications ({pendingApplications.length})
          </Typography>
          
          <Grid container spacing={3}>
            {pendingApplications.map((application) => (
              <Grid item xs={12} sm={6} md={4} key={application.applicationId}>
                <ApplicationCard application={application} />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {tabValue === 2 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            All Applications ({applications.length})
          </Typography>
          
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Business</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Submitted</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {applications.map((application) => (
                  <TableRow key={application.applicationId}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 32, height: 32 }}>
                          {application.firstName?.[0]}{application.lastName?.[0]}
                        </Avatar>
                        {application.firstName} {application.lastName}
                      </Box>
                    </TableCell>
                    <TableCell>{application.email}</TableCell>
                    <TableCell>{application.businessName || 'N/A'}</TableCell>
                    <TableCell>{application.artisanType || 'N/A'}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={application.status}
                        color={getStatusColor(application.status)}
                      />
                    </TableCell>
                    <TableCell>{formatDate(application.submittedAt)}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <IconButton 
                          size="small"
                          onClick={() => {
                            setSelectedApplication(application);
                            setDetailDialogOpen(true);
                          }}
                        >
                          <ViewIcon />
                        </IconButton>
                        {application.status === 'pending' && (
                          <>
                            <IconButton 
                              size="small" 
                              color="success"
                              onClick={() => handleApplicationAction(application, 'approved')}
                            >
                              <ApproveIcon />
                            </IconButton>
                            <IconButton 
                              size="small" 
                              color="error"
                              onClick={() => handleApplicationAction(application, 'rejected')}
                            >
                              <RejectIcon />
                            </IconButton>
                          </>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Action Confirmation Dialog */}
      <Dialog open={actionDialogOpen} onClose={() => setActionDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {actionType === 'approved' ? 'Approve Application' : 'Reject Application'}
        </DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Are you sure you want to {actionType === 'approved' ? 'approve' : 'reject'} the application from{' '}
            <strong>{selectedApplication?.firstName} {selectedApplication?.lastName}</strong>?
          </Typography>
          
          {actionType === 'approved' && (
            <Typography variant="body2" color="text.secondary" gutterBottom>
              This will change their role from &apos;artisan-applicant&apos; to &apos;artisan&apos; and grant them access to artisan features.
            </Typography>
          )}
          
          <TextField
            fullWidth
            multiline
            rows={3}
            label={`Review Notes (Optional)`}
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            placeholder={`Add any notes about your ${actionType === 'approved' ? 'approval' : 'rejection'} decision...`}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={confirmApplicationAction}
            variant="contained"
            color={actionType === 'approved' ? 'success' : 'error'}
          >
            {actionType === 'approved' ? 'Approve' : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Application Detail Dialog */}
      <Dialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Application Details - {selectedApplication?.firstName} {selectedApplication?.lastName}
        </DialogTitle>
        <DialogContent>
          {selectedApplication && (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2">Personal Information</Typography>
                <Typography>Name: {selectedApplication.firstName} {selectedApplication.lastName}</Typography>
                <Typography>Email: {selectedApplication.email}</Typography>
                <Typography>Phone: {selectedApplication.phoneNumber || 'N/A'}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2">Business Information</Typography>
                <Typography>Business: {selectedApplication.businessName || 'N/A'}</Typography>
                <Typography>Type: {selectedApplication.artisanType || 'N/A'}</Typography>
                <Typography>Experience: {selectedApplication.yearsOfExperience || 'N/A'} years</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2">Description</Typography>
                <Typography>{selectedApplication.description || 'No description provided'}</Typography>
              </Grid>
              {selectedApplication.specialties && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Specialties</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                    {(Array.isArray(selectedApplication.specialties) ? selectedApplication.specialties : selectedApplication.specialties.split(', ')).map((specialty, index) => (
                      <Chip key={index} label={specialty} variant="outlined" />
                    ))}
                  </Box>
                </Grid>
              )}
              {selectedApplication.services && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Services</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                    {(Array.isArray(selectedApplication.services) ? selectedApplication.services : selectedApplication.services.split(', ')).map((service, index) => (
                      <Chip key={index} label={service} variant="outlined" />
                    ))}
                  </Box>
                </Grid>
              )}
              <Grid item xs={12}>
                <Typography variant="subtitle2">Application Status</Typography>
                <Chip label={selectedApplication.status} color={getStatusColor(selectedApplication.status)} />
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Submitted: {formatDate(selectedApplication.submittedAt)}
                </Typography>
                {selectedApplication.reviewNotes && (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Review Notes: {selectedApplication.reviewNotes}
                  </Typography>
                )}
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>Close</Button>
          {selectedApplication?.status === 'pending' && (
            <>
              <Button
                onClick={() => {
                  setDetailDialogOpen(false);
                  handleApplicationAction(selectedApplication, 'approved');
                }}
                variant="contained"
                color="success"
                startIcon={<ApproveIcon />}
              >
                Approve
              </Button>
              <Button
                onClick={() => {
                  setDetailDialogOpen(false);
                  handleApplicationAction(selectedApplication, 'rejected');
                }}
                variant="outlined"
                color="error"
                startIcon={<RejectIcon />}
              >
                Reject
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ArtisanManagement;
