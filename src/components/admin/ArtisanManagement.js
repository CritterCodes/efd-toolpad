'use client';

import React, { useState, useEffect } from 'react';
import Constants from '../../lib/constants';
import {
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  Box,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  Stack,
  Divider
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Visibility as ViewIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Business as BusinessIcon,
  LocationOn as LocationIcon,
  CalendarToday as CalendarIcon,
  Assessment as AssessmentIcon
} from '@mui/icons-material';

const ArtisanManagement = () => {
  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [artisanTypeFilter, setArtisanTypeFilter] = useState('');

  useEffect(() => {
    fetchApplications();
    fetchStats();
  }, [statusFilter, artisanTypeFilter, searchTerm]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter) params.append('status', statusFilter);
      if (artisanTypeFilter) params.append('artisanType', artisanTypeFilter);
      
      const response = await fetch(`/api/artisan?${params}`);
      const result = await response.json();
      
      if (result.success) {
        setApplications(result.data);
      } else {
        setError('Failed to fetch applications');
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
      setError('Failed to fetch applications');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/artisan?action=stats');
      const result = await response.json();
      
      if (result.success) {
        setStats(result.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleViewApplication = (application) => {
    setSelectedApplication(application);
    setDialogOpen(true);
  };

  const handleAction = (application, action) => {
    setSelectedApplication(application);
    setActionType(action);
    setReviewNotes('');
    setActionDialogOpen(true);
  };

  const executeAction = async () => {
    try {
      if (actionType === 'delete') {
        const response = await fetch(`/api/artisan/${selectedApplication.applicationId}`, {
          method: 'DELETE'
        });
        const result = await response.json();
        
        if (result.success) {
          setSuccess('Application deleted successfully');
          fetchApplications();
          fetchStats();
        } else {
          setError(result.error || 'Failed to delete application');
        }
      } else {
        // Approve or reject
        const response = await fetch(`/api/artisan/${selectedApplication.applicationId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            status: actionType,
            reviewedBy: 'admin', // TODO: Get from auth context
            reviewNotes: reviewNotes
          })
        });
        
        const result = await response.json();
        
        if (result.success) {
          setSuccess(`Application ${actionType} successfully`);
          fetchApplications();
          fetchStats();
        } else {
          setError(result.error || `Failed to ${actionType} application`);
        }
      }
      
      setActionDialogOpen(false);
    } catch (error) {
      console.error('Error executing action:', error);
      setError('Failed to execute action');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'approved': return 'success';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading && applications.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Artisan Application Management
      </Typography>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Applications
              </Typography>
              <Typography variant="h4">
                {stats.total || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Pending Review
              </Typography>
              <Typography variant="h4" color="warning.main">
                {stats.pending || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Approved
              </Typography>
              <Typography variant="h4" color="success.main">
                {stats.approved || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Rejected
              </Typography>
              <Typography variant="h4" color="error.main">
                {stats.rejected || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Search applications"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} />
              }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="approved">Approved</MenuItem>
                <MenuItem value="rejected">Rejected</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Artisan Type</InputLabel>
              <Select
                value={artisanTypeFilter}
                label="Artisan Type"
                onChange={(e) => setArtisanTypeFilter(e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                {Constants.ARTISAN_TYPES.map((type) => (
                  <MenuItem key={type} value={type}>{type}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Error/Success Messages */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* Applications Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Application ID</TableCell>
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
              <TableRow key={application._id}>
                <TableCell>
                  <Typography variant="body2" fontFamily="monospace">
                    {application.applicationId}
                  </Typography>
                </TableCell>
                <TableCell>
                  {application.firstName} {application.lastName}
                </TableCell>
                <TableCell>{application.email}</TableCell>
                <TableCell>{application.businessName || 'N/A'}</TableCell>
                <TableCell>
                  {Array.isArray(application.artisanType) 
                    ? application.artisanType.join(', ') 
                    : application.artisanType || 'N/A'}
                </TableCell>
                <TableCell>
                  <Chip
                    label={application.status}
                    color={getStatusColor(application.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>{formatDate(application.submittedAt)}</TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1}>
                    <Tooltip title="View Details">
                      <IconButton
                        size="small"
                        onClick={() => handleViewApplication(application)}
                      >
                        <ViewIcon />
                      </IconButton>
                    </Tooltip>
                    {application.status === 'pending' && (
                      <>
                        <Tooltip title="Approve">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => handleAction(application, 'approved')}
                          >
                            <ApproveIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Reject">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleAction(application, 'rejected')}
                          >
                            <RejectIcon />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleAction(application, 'delete')}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {applications.length === 0 && !loading && (
        <Box textAlign="center" py={4}>
          <Typography variant="h6" color="textSecondary">
            No applications found
          </Typography>
        </Box>
      )}

      {/* View Application Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Application Details - {selectedApplication?.applicationId}
        </DialogTitle>
        <DialogContent>
          {selectedApplication && (
            <Box sx={{ pt: 1 }}>
              <Grid container spacing={3}>
                {/* Personal Information */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    Personal Information
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="subtitle2" color="textSecondary">
                        Name
                      </Typography>
                      <Typography>
                        {selectedApplication.firstName} {selectedApplication.lastName}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" color="textSecondary">
                        Email
                      </Typography>
                      <Typography>{selectedApplication.email}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" color="textSecondary">
                        Phone
                      </Typography>
                      <Typography>{selectedApplication.phone}</Typography>
                    </Box>
                  </Stack>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="subtitle2" color="textSecondary">
                        Address
                      </Typography>
                      <Typography>
                        {selectedApplication.address}<br />
                        {selectedApplication.city}, {selectedApplication.state} {selectedApplication.zipCode}<br />
                        {selectedApplication.country}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" color="textSecondary">
                        Artisan Type
                      </Typography>
                      <Typography>
                        {Array.isArray(selectedApplication.artisanType) 
                          ? selectedApplication.artisanType.join(', ') 
                          : selectedApplication.artisanType || 'N/A'}
                      </Typography>
                    </Box>
                  </Stack>
                </Grid>

                {/* Business Information */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                    Business Information
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="subtitle2" color="textSecondary">
                        Business Name
                      </Typography>
                      <Typography>{selectedApplication.businessName || 'N/A'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" color="textSecondary">
                        Years of Experience
                      </Typography>
                      <Typography>{selectedApplication.yearsExperience}</Typography>
                    </Box>
                  </Stack>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="subtitle2" color="textSecondary">
                        Website
                      </Typography>
                      <Typography>{selectedApplication.website || 'N/A'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" color="textSecondary">
                        Instagram
                      </Typography>
                      <Typography>{selectedApplication.instagram || 'N/A'}</Typography>
                    </Box>
                  </Stack>
                </Grid>

                {/* Skills and Specialties */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                    Skills & Specialties
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="subtitle2" color="textSecondary">
                        Specialties
                      </Typography>
                      <Typography>{Array.isArray(selectedApplication.specialties) ? selectedApplication.specialties.join(', ') : selectedApplication.specialties}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" color="textSecondary">
                        Services
                      </Typography>
                      <Typography>{Array.isArray(selectedApplication.services) ? selectedApplication.services.join(', ') : selectedApplication.services}</Typography>
                    </Box>
                  </Stack>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="subtitle2" color="textSecondary">
                        Materials
                      </Typography>
                      <Typography>{Array.isArray(selectedApplication.materials) ? selectedApplication.materials.join(', ') : selectedApplication.materials}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" color="textSecondary">
                        Techniques
                      </Typography>
                      <Typography>{Array.isArray(selectedApplication.techniques) ? selectedApplication.techniques.join(', ') : selectedApplication.techniques}</Typography>
                    </Box>
                  </Stack>
                </Grid>

                {/* Additional Information */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                    Additional Information
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                </Grid>
                <Grid item xs={12}>
                  <Box>
                    <Typography variant="subtitle2" color="textSecondary">
                      Brief Description
                    </Typography>
                    <Typography sx={{ mt: 1 }}>
                      {selectedApplication.briefDescription}
                    </Typography>
                  </Box>
                </Grid>

                {/* Review Information */}
                {selectedApplication.reviewedAt && (
                  <>
                    <Grid item xs={12}>
                      <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                        Review Information
                      </Typography>
                      <Divider sx={{ mb: 2 }} />
                    </Grid>
                    <Grid item xs={12}>
                      <Stack spacing={2}>
                        <Box>
                          <Typography variant="subtitle2" color="textSecondary">
                            Reviewed At
                          </Typography>
                          <Typography>{formatDate(selectedApplication.reviewedAt)}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="subtitle2" color="textSecondary">
                            Reviewed By
                          </Typography>
                          <Typography>{selectedApplication.reviewedBy}</Typography>
                        </Box>
                        {selectedApplication.reviewNotes && (
                          <Box>
                            <Typography variant="subtitle2" color="textSecondary">
                              Review Notes
                            </Typography>
                            <Typography>{selectedApplication.reviewNotes}</Typography>
                          </Box>
                        )}
                      </Stack>
                    </Grid>
                  </>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Action Dialog */}
      <Dialog
        open={actionDialogOpen}
        onClose={() => setActionDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {actionType === 'delete' ? 'Delete Application' : `${actionType} Application`}
        </DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            {actionType === 'delete' 
              ? 'Are you sure you want to delete this application? This action cannot be undone.'
              : `Are you sure you want to ${actionType} this application?`
            }
          </Typography>
          {actionType !== 'delete' && (
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Review Notes (optional)"
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              sx={{ mt: 2 }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={executeAction} 
            color={actionType === 'delete' ? 'error' : 'primary'}
            variant="contained"
          >
            {actionType === 'delete' ? 'Delete' : actionType}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ArtisanManagement;