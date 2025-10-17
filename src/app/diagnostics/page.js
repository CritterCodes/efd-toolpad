'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Grid, 
  Chip, 
  Button, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel, 
  TextField,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  Paper,
  List,
  ListItem,
  ListItemText,
  Divider,
  TextareaAutosize
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { getEffectiveRole } from '@/lib/roleBasedNavigation';

export default function DiagnosticsAdminPage() {
  const { data: session, status } = useSession();
  const [diagnostics, setDiagnostics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    errorType: '',
    resolved: '',
    userId: ''
  });
  const [selectedDiagnostic, setSelectedDiagnostic] = useState(null);
  const [stats, setStats] = useState([]);
  const [effectiveRole, setEffectiveRole] = useState(null);

  useEffect(() => {
    if (session?.user) {
      const role = getEffectiveRole(session.user);
      setEffectiveRole(role);
    }
  }, [session]);

  useEffect(() => {
    if (effectiveRole) {
      fetchDiagnostics();
    }
  }, [effectiveRole, fetchDiagnostics]);

  const fetchDiagnostics = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (filter.errorType) params.append('errorType', filter.errorType);
      if (filter.resolved !== '') params.append('resolved', filter.resolved);
      if (filter.userId) params.append('userId', filter.userId);

      const response = await fetch(`/api/diagnostics?${params}`);
      const data = await response.json();
      
      setDiagnostics(data.diagnostics || []);
      setStats(data.statistics || []);
    } catch (error) {
      console.error('Failed to fetch diagnostics:', error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  const updateDiagnostic = async (diagnosticId, updates) => {
    try {
      const response = await fetch('/api/diagnostics', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          diagnosticId,
          ...updates
        })
      });

      if (response.ok) {
        fetchDiagnostics(); // Refresh the list
        if (selectedDiagnostic?._id === diagnosticId) {
          setSelectedDiagnostic({ ...selectedDiagnostic, ...updates });
        }
      }
    } catch (error) {
      console.error('Failed to update diagnostic:', error);
    }
  };

  const getErrorTypeColor = (errorType) => {
    switch (errorType) {
      case 'authentication': return 'error';
      case 'validation': return 'warning';
      case 'server-error': return 'primary';
      case 'network': return 'info';
      default: return 'default';
    }
  };

  // Authentication check
  if (status === 'loading') {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!session?.user) {
    return (
      <Box p={3}>
        <Alert severity="error">Please log in to access diagnostics.</Alert>
      </Box>
    );
  }

  // Role check
  if (!['admin', 'staff', 'dev'].includes(effectiveRole)) {
    return (
      <Box p={3}>
        <Alert severity="warning">You don&apos;t have permission to access diagnostics.</Alert>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>Loading diagnostics...</Typography>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        🔍 Artisan Application Diagnostics
      </Typography>
      
      {/* Statistics */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {stats.map((stat) => (
          <Grid item xs={12} sm={6} md={3} key={stat._id}>
            <Card>
              <CardContent>
                <Typography variant="h6" component="div">
                  {stat._id}
                </Typography>
                <Typography variant="h4" color="primary">
                  {stat.count}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {stat.resolved} resolved
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Error Type</InputLabel>
                <Select
                  value={filter.errorType}
                  label="Error Type"
                  onChange={(e) => setFilter({ ...filter, errorType: e.target.value })}
                >
                  <MenuItem value="">All Types</MenuItem>
                  <MenuItem value="authentication">Authentication</MenuItem>
                  <MenuItem value="validation">Validation</MenuItem>
                  <MenuItem value="server-error">Server Error</MenuItem>
                  <MenuItem value="network">Network</MenuItem>
                  <MenuItem value="form-data-parsing">Form Data Parsing</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={filter.resolved}
                  label="Status"
                  onChange={(e) => setFilter({ ...filter, resolved: e.target.value })}
                >
                  <MenuItem value="">All Status</MenuItem>
                  <MenuItem value="true">Resolved</MenuItem>
                  <MenuItem value="false">Unresolved</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="User ID/Email"
                value={filter.userId}
                onChange={(e) => setFilter({ ...filter, userId: e.target.value })}
                placeholder="Search by user..."
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* Diagnostics List */}
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Diagnostics ({diagnostics.length})
              </Typography>
              
              <List sx={{ maxHeight: 600, overflow: 'auto' }}>
                {diagnostics.map((diagnostic, index) => (
                  <React.Fragment key={diagnostic._id}>
                    <ListItem
                      button
                      onClick={() => setSelectedDiagnostic(diagnostic)}
                      selected={selectedDiagnostic?._id === diagnostic._id}
                    >
                      <ListItemText
                        primary={
                          <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Chip 
                              label={diagnostic.errorType} 
                              color={getErrorTypeColor(diagnostic.errorType)}
                              size="small"
                            />
                            <Box
                              sx={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                backgroundColor: diagnostic.resolved ? 'success.main' : 'error.main'
                              }}
                            />
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                              {diagnostic.error.message}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              User: {diagnostic.user.email || 'Unknown'}<br/>
                              Time: {new Date(diagnostic.timestamp).toLocaleString()}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < diagnostics.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Diagnostic Details */}
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Diagnostic Details
              </Typography>
              
              {selectedDiagnostic ? (
                <Box>
                  {/* Header */}
                  <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                    <Chip 
                      label={selectedDiagnostic.errorType} 
                      color={getErrorTypeColor(selectedDiagnostic.errorType)}
                    />
                    
                    <Button
                      variant={selectedDiagnostic.resolved ? "outlined" : "contained"}
                      color={selectedDiagnostic.resolved ? "warning" : "success"}
                      onClick={() => updateDiagnostic(selectedDiagnostic._id, { resolved: !selectedDiagnostic.resolved })}
                    >
                      {selectedDiagnostic.resolved ? 'Mark Unresolved' : 'Mark Resolved'}
                    </Button>
                  </Box>

                  {/* Error Info */}
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle1">Error Details</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                        <Typography variant="body2">
                          <strong>Message:</strong> {selectedDiagnostic.error.message}<br/>
                          <strong>Time:</strong> {new Date(selectedDiagnostic.timestamp).toLocaleString()}
                        </Typography>
                      </Paper>
                    </AccordionDetails>
                  </Accordion>

                  {/* User Info */}
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle1">User Information</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                        <Typography variant="body2">
                          <strong>Email:</strong> {selectedDiagnostic.user.email || 'N/A'}<br/>
                          <strong>Mongo ID:</strong> {selectedDiagnostic.user.mongoUserId || 'N/A'}<br/>
                          <strong>Shopify ID:</strong> {selectedDiagnostic.user.shopifyCustomerId || 'N/A'}<br/>
                          <strong>Authenticated:</strong> {selectedDiagnostic.user.isAuthenticated ? '✅' : '❌'}
                        </Typography>
                      </Paper>
                    </AccordionDetails>
                  </Accordion>

                  {/* Form Data */}
                  {selectedDiagnostic.formData?.fields && (
                    <Accordion>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="subtitle1">Form Data</Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                          <Typography variant="body2">
                            <strong>Missing Required:</strong> {selectedDiagnostic.formData.missingRequiredFields?.join(', ') || 'None'}<br/>
                            <strong>Files:</strong> {selectedDiagnostic.formData.fileCount || 0}<br/>
                            <strong>Form Size:</strong> {(selectedDiagnostic.formData.formSize || 0)} bytes
                          </Typography>
                        </Paper>
                      </AccordionDetails>
                    </Accordion>
                  )}

                  {/* Environment */}
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle1">Environment</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                        <Typography variant="body2">
                          <strong>User Agent:</strong> {selectedDiagnostic.environment?.userAgent?.substring(0, 60)}...<br/>
                          <strong>Online:</strong> {selectedDiagnostic.environment?.onLine ? '✅' : '❌'}<br/>
                          <strong>Cookies:</strong> {selectedDiagnostic.environment?.cookiesEnabled ? '✅' : '❌'}
                        </Typography>
                      </Paper>
                    </AccordionDetails>
                  </Accordion>

                  {/* Admin Notes */}
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Admin Notes
                    </Typography>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      value={selectedDiagnostic.adminNotes || ''}
                      onChange={(e) => setSelectedDiagnostic({ 
                        ...selectedDiagnostic, 
                        adminNotes: e.target.value 
                      })}
                      onBlur={(e) => updateDiagnostic(selectedDiagnostic._id, { 
                        adminNotes: e.target.value 
                      })}
                      placeholder="Add notes about this diagnostic..."
                    />
                  </Box>
                </Box>
              ) : (
                <Box textAlign="center" py={4}>
                  <Typography variant="body1" color="text.secondary">
                    Select a diagnostic to view details
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}