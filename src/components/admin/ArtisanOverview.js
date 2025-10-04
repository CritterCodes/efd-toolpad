'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Button,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  Stack,
  Divider
} from '@mui/material';
import {
  Notifications as NotificationIcon,
  TrendingUp as TrendingIcon,
  Schedule as PendingIcon,
  CheckCircle as ApprovedIcon,
  Cancel as RejectedIcon,
  Visibility as ViewIcon,
  Assessment as AssessmentIcon
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';

const ArtisanOverview = () => {
  const [stats, setStats] = useState({});
  const [recentApplications, setRecentApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch stats and recent applications in parallel
      const [statsResponse, applicationsResponse] = await Promise.all([
        fetch('/api/artisan?action=stats'),
        fetch('/api/artisan?status=pending&limit=5')
      ]);
      
      const statsResult = await statsResponse.json();
      const applicationsResult = await applicationsResponse.json();
      
      if (statsResult.success) {
        setStats(statsResult.data);
      }
      
      if (applicationsResult.success) {
        setRecentApplications(applicationsResult.data.slice(0, 5));
      }
    } catch (error) {
      console.error('Error fetching artisan overview data:', error);
      setError('Failed to load overview data');
    } finally {
      setLoading(false);
    }
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

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Stats Overview */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', borderLeft: 4, borderLeftColor: 'primary.main' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Total Applications
                  </Typography>
                  <Typography variant="h4">
                    {stats.total || 0}
                  </Typography>
                </Box>
                <AssessmentIcon sx={{ fontSize: 40, color: 'primary.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', borderLeft: 4, borderLeftColor: 'warning.main' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Pending Review
                  </Typography>
                  <Typography variant="h4" color="warning.main">
                    {stats.pending || 0}
                  </Typography>
                </Box>
                <PendingIcon sx={{ fontSize: 40, color: 'warning.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', borderLeft: 4, borderLeftColor: 'success.main' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Approved
                  </Typography>
                  <Typography variant="h4" color="success.main">
                    {stats.approved || 0}
                  </Typography>
                </Box>
                <ApprovedIcon sx={{ fontSize: 40, color: 'success.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', borderLeft: 4, borderLeftColor: 'error.main' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Rejected
                  </Typography>
                  <Typography variant="h4" color="error.main">
                    {stats.rejected || 0}
                  </Typography>
                </Box>
                <RejectedIcon sx={{ fontSize: 40, color: 'error.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Pending Applications */}
      <Card>
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
            <Typography variant="h6" component="h2">
              Recent Pending Applications
            </Typography>
            <Button
              variant="outlined"
              onClick={() => router.push('/dashboard/admin/artisans')}
              startIcon={<ViewIcon />}
            >
              View All
            </Button>
          </Box>
          
          {recentApplications.length === 0 ? (
            <Box textAlign="center" py={4}>
              <Typography variant="body1" color="textSecondary">
                No pending applications
              </Typography>
            </Box>
          ) : (
            <List>
              {recentApplications.map((application, index) => (
                <React.Fragment key={application._id}>
                  <ListItem
                    sx={{ 
                      px: 0,
                      '&:hover': { 
                        backgroundColor: 'action.hover',
                        cursor: 'pointer'
                      }
                    }}
                    onClick={() => router.push('/dashboard/admin/artisans')}
                  >
                    <ListItemIcon>
                      <NotificationIcon color="warning" />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="subtitle1">
                            {application.firstName} {application.lastName}
                          </Typography>
                          <Chip
                            label={application.artisanType}
                            size="small"
                            variant="outlined"
                          />
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="textSecondary">
                            {application.email} • Applied {formatDate(application.submittedAt)}
                          </Typography>
                          {application.businessName && (
                            <Typography variant="body2" color="textSecondary">
                              Business: {application.businessName}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                    <Box display="flex" alignItems="center" gap={1}>
                      <Chip
                        label={application.status}
                        color={getStatusColor(application.status)}
                        size="small"
                      />
                      <Tooltip title="View Application">
                        <IconButton size="small">
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </ListItem>
                  {index < recentApplications.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" component="h2" gutterBottom>
            Quick Actions
          </Typography>
          <Stack direction="row" spacing={2} flexWrap="wrap">
            <Button
              variant="contained"
              startIcon={<PendingIcon />}
              onClick={() => router.push('/dashboard/admin/artisans?status=pending')}
            >
              Review Pending ({stats.pending || 0})
            </Button>
            <Button
              variant="outlined"
              startIcon={<ApprovedIcon />}
              onClick={() => router.push('/dashboard/admin/artisans?status=approved')}
            >
              View Approved
            </Button>
            <Button
              variant="outlined"
              startIcon={<AssessmentIcon />}
              onClick={() => router.push('/dashboard/admin/artisans')}
            >
              View All Applications
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ArtisanOverview;