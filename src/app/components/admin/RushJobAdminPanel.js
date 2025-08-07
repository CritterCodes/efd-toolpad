import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Grid,
  TextField,
  Typography,
  Alert,
  Box,
  LinearProgress,
  Chip,
  Stack,
  Button,
  Divider
} from '@mui/material';
import { 
  Speed as SpeedIcon,
  AccessTime as TimeIcon,
  AttachMoney as MoneyIcon 
} from '@mui/icons-material';
import { RushJobService } from '@/services/rushJob.service';

export default function RushJobAdminPanel() {
  const [rushStats, setRushStats] = useState({
    maxRushJobs: 0,
    activeRushJobs: 0,
    remainingSlots: 0,
    utilization: 0,
    statusBreakdown: {},
    atCapacity: false
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Load rush job statistics
  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true);
        const stats = await RushJobService.getRushJobStats();
        setRushStats(stats);
      } catch (err) {
        setError('Failed to load rush job statistics');
        console.error('Error loading rush job stats:', err);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
    
    // Refresh every 30 seconds
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ width: '100%' }}>
            <LinearProgress />
          </Box>
          <Typography sx={{ mt: 2 }}>Loading rush job information...</Typography>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <Alert severity="error">{error}</Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader 
        title="Rush Job Management"
        avatar={<SpeedIcon color="warning" />}
        action={
          rushStats.atCapacity ? (
            <Chip label="AT CAPACITY" color="error" />
          ) : (
            <Chip label="AVAILABLE" color="success" />
          )
        }
      />
      
      <CardContent>
        <Grid container spacing={3}>
          
          {/* Capacity Overview */}
          <Grid item xs={12} md={8}>
            <Box sx={{ mb: 2 }}>
              <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography variant="h6" component="div">
                  Rush Job Capacity
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {rushStats.activeRushJobs} / {rushStats.maxRushJobs} slots used
                </Typography>
              </Stack>
              
              <LinearProgress 
                variant="determinate" 
                value={rushStats.utilization} 
                sx={{ 
                  height: 10, 
                  borderRadius: 5,
                  backgroundColor: 'grey.200',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: rushStats.utilization >= 100 ? 'error.main' : 
                                   rushStats.utilization >= 80 ? 'warning.main' : 'success.main'
                  }
                }}
              />
              
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {rushStats.utilization}% capacity utilized
              </Typography>
            </Box>
          </Grid>

          {/* Quick Stats */}
          <Grid item xs={12} md={4}>
            <Stack spacing={2}>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Available Slots
                </Typography>
                <Typography variant="h4" color={rushStats.remainingSlots === 0 ? 'error.main' : 'success.main'}>
                  {rushStats.remainingSlots}
                </Typography>
              </Box>
              
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Active Rush Jobs
                </Typography>
                <Typography variant="h4" color="warning.main">
                  {rushStats.activeRushJobs}
                </Typography>
              </Box>
            </Stack>
          </Grid>

          {/* Status Breakdown */}
          {Object.keys(rushStats.statusBreakdown).length > 0 && (
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" sx={{ mb: 2 }}>
                Rush Jobs by Status
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {Object.entries(rushStats.statusBreakdown).map(([status, count]) => (
                  <Chip 
                    key={status}
                    label={`${status}: ${count}`}
                    variant="outlined"
                    size="small"
                    color={
                      ['completed', 'picked-up'].includes(status) ? 'success' :
                      status === 'cancelled' ? 'error' :
                      ['in-progress', 'quality-control'].includes(status) ? 'warning' : 'default'
                    }
                  />
                ))}
              </Stack>
            </Grid>
          )}

          {/* Warnings */}
          <Grid item xs={12}>
            {rushStats.atCapacity && (
              <Alert severity="error" sx={{ mb: 2 }}>
                <strong>Rush job capacity reached!</strong> No additional rush jobs can be accepted until current ones are completed.
              </Alert>
            )}
            
            {rushStats.utilization >= 80 && !rushStats.atCapacity && (
              <Alert severity="warning">
                <strong>High rush job utilization.</strong> Only {rushStats.remainingSlots} slots remaining.
              </Alert>
            )}
            
            {rushStats.utilization < 50 && rushStats.maxRushJobs > 0 && (
              <Alert severity="info">
                Rush job capacity is available. Consider promoting rush services to customers.
              </Alert>
            )}
          </Grid>

          {/* Settings Preview */}
          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" sx={{ mb: 2 }}>
              Current Settings
            </Typography>
            <Stack direction="row" spacing={3}>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Max Rush Jobs
                </Typography>
                <Typography variant="h6">
                  {rushStats.maxRushJobs}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Rush Markup
                </Typography>
                <Typography variant="h6">
                  1.5x {/* This would be loaded from admin settings */}
                </Typography>
              </Box>
            </Stack>
          </Grid>

        </Grid>
      </CardContent>
    </Card>
  );
}
