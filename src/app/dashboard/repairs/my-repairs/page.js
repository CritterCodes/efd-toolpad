'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  Grid,
  Alert,
  Tabs,
  Tab,
  Badge,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { PageContainer } from '@toolpad/core/PageContainer';
import { Add as AddIcon } from '@mui/icons-material';
import { useRouter } from 'next/navigation';

export default function MyRepairsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [repairs, setRepairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    if (session?.user) {
      fetchMyRepairs();
    }
  }, [session?.user]);

  const fetchMyRepairs = async (status = null) => {
    try {
      setLoading(true);
      const url = status ? `/api/repairs/my-repairs?status=${status}` : '/api/repairs/my-repairs';
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setRepairs(data.repairs || []);
      } else {
        setError('Failed to fetch repairs');
      }
    } catch (error) {
      console.error('Error fetching repairs:', error);
      setError('An error occurred while fetching repairs');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    const statusFilters = [null, 'current', 'completed']; // All, Current, Completed
    fetchMyRepairs(statusFilters[newValue]);
  };

  const getFilteredRepairs = () => {
    if (activeTab === 0) return repairs; // All repairs
    if (activeTab === 1) { // Current repairs
      return repairs.filter(repair => 
        !['completed', 'ready_for_pickup', 'cancelled'].includes(repair.status?.toLowerCase())
      );
    }
    if (activeTab === 2) { // Completed repairs
      return repairs.filter(repair => 
        ['completed', 'ready_for_pickup'].includes(repair.status?.toLowerCase())
      );
    }
    return repairs;
  };

  const getCurrentRepairsCount = () => {
    return repairs.filter(repair => 
      !['completed', 'ready_for_pickup', 'cancelled'].includes(repair.status?.toLowerCase())
    ).length;
  };

  const getCompletedRepairsCount = () => {
    return repairs.filter(repair => 
      ['completed', 'ready_for_pickup'].includes(repair.status?.toLowerCase())
    ).length;
  };

  const getStatusColor = (status) => {
    const statusColors = {
      'received': 'info',
      'in_progress': 'warning',
      'ready_for_pickup': 'success',
      'completed': 'success',
      'on_hold': 'error'
    };
    return statusColors[status] || 'default';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <PageContainer title="My Repairs">
        <Typography>Loading your repairs...</Typography>
      </PageContainer>
    );
  }

  return (
    <PageContainer 
      title="My Repairs"
      slots={{
        toolbar: () => (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => router.push('/dashboard/repairs/new')}
            sx={{ ml: 'auto' }}
          >
            Create New Repair
          </Button>
        )
      }}
    >
      <Box sx={{ p: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Repair Status Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange} 
            aria-label="repair status tabs"
            variant={isMobile ? "scrollable" : "standard"}
            scrollButtons={isMobile ? "auto" : false}
            allowScrollButtonsMobile
            sx={{
              '& .MuiTab-root': {
                minWidth: isMobile ? 120 : 'auto',
                fontSize: isMobile ? '0.875rem' : '1rem'
              }
            }}
          >
            <Tab 
              label={
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: isMobile ? 0.5 : 1,
                  flexDirection: isMobile ? 'column' : 'row'
                }}>
                  <span style={{ fontSize: isMobile ? '0.75rem' : '1rem' }}>
                    {isMobile ? 'All' : 'All Repairs'}
                  </span>
                  <Badge 
                    badgeContent={repairs.length} 
                    color="primary" 
                    showZero
                    sx={{
                      '& .MuiBadge-badge': {
                        fontSize: '0.65rem',
                        height: isMobile ? '16px' : '18px',
                        minWidth: isMobile ? '16px' : '18px'
                      }
                    }}
                  >
                    <Box sx={{ width: isMobile ? 4 : 8 }} />
                  </Badge>
                </Box>
              } 
            />
            <Tab 
              label={
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: isMobile ? 0.5 : 1,
                  flexDirection: isMobile ? 'column' : 'row'
                }}>
                  <span style={{ fontSize: isMobile ? '0.75rem' : '1rem' }}>
                    {isMobile ? 'Current' : 'Current Repairs'}
                  </span>
                  <Badge 
                    badgeContent={getCurrentRepairsCount()} 
                    color="warning" 
                    showZero
                    sx={{
                      '& .MuiBadge-badge': {
                        fontSize: '0.65rem',
                        height: isMobile ? '16px' : '18px',
                        minWidth: isMobile ? '16px' : '18px'
                      }
                    }}
                  >
                    <Box sx={{ width: isMobile ? 4 : 8 }} />
                  </Badge>
                </Box>
              } 
            />
            <Tab 
              label={
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: isMobile ? 0.5 : 1,
                  flexDirection: isMobile ? 'column' : 'row'
                }}>
                  <span style={{ fontSize: isMobile ? '0.75rem' : '1rem' }}>
                    {isMobile ? 'Done' : 'Completed Repairs'}
                  </span>
                  <Badge 
                    badgeContent={getCompletedRepairsCount()} 
                    color="success" 
                    showZero
                    sx={{
                      '& .MuiBadge-badge': {
                        fontSize: '0.65rem',
                        height: isMobile ? '16px' : '18px',
                        minWidth: isMobile ? '16px' : '18px'
                      }
                    }}
                  >
                    <Box sx={{ width: isMobile ? 4 : 8 }} />
                  </Badge>
                </Box>
              } 
            />
          </Tabs>
        </Box>

        {getFilteredRepairs().length === 0 ? (
          <Box sx={{ 
            textAlign: 'center', 
            py: isMobile ? 4 : 8,
            px: isMobile ? 2 : 0
          }}>
            <Typography 
              variant={isMobile ? "h6" : "h5"} 
              color="text.secondary" 
              gutterBottom
              sx={{ 
                fontSize: isMobile ? '1.25rem' : '1.5rem'
              }}
            >
              {activeTab === 0 && 'No repairs found'}
              {activeTab === 1 && 'No current repairs'}
              {activeTab === 2 && 'No completed repairs yet'}
            </Typography>
            <Typography 
              variant="body2" 
              color="text.secondary" 
              sx={{ 
                mb: 3,
                fontSize: isMobile ? '0.875rem' : '1rem',
                maxWidth: isMobile ? '300px' : '400px',
                mx: 'auto'
              }}
            >
              {activeTab === 0 && "You haven't submitted any repairs yet."}
              {activeTab === 1 && 'All your repairs are either completed or picked up.'}
              {activeTab === 2 && 'Complete some repairs to see them here.'}
            </Typography>
            <Button
              variant="contained"
              size={isMobile ? "medium" : "large"}
              startIcon={<AddIcon />}
              onClick={() => router.push('/dashboard/repairs/new')}
              sx={{
                minHeight: isMobile ? '42px' : '48px',
                fontSize: isMobile ? '0.875rem' : '1rem',
                px: isMobile ? 2 : 3
              }}
            >
              Create New Repair
            </Button>
          </Box>
        ) : (
          <Grid container spacing={2}>
            {getFilteredRepairs().map((repair) => (
              <Grid item xs={12} sm={6} md={4} key={repair._id}>
                <Card 
                  elevation={2}
                  sx={{ 
                    height: '100%',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      elevation: 4,
                      transform: 'translateY(-2px)'
                    }
                  }}
                >
                  <CardContent sx={{ 
                    p: isMobile ? 1.5 : 2,
                    '&:last-child': { pb: isMobile ? 1.5 : 2 }
                  }}>
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'flex-start',
                      mb: 1,
                      flexDirection: isMobile ? 'column' : 'row',
                      gap: isMobile ? 1 : 0
                    }}>
                      <Typography 
                        variant={isMobile ? "body1" : "h6"} 
                        component="h3"
                        sx={{ 
                          fontWeight: 'bold',
                          fontSize: isMobile ? '1rem' : '1.25rem'
                        }}
                      >
                        Repair #{repair.repairNumber}
                      </Typography>
                      <Chip 
                        label={repair.status} 
                        color={getStatusColor(repair.status)}
                        size={isMobile ? "small" : "medium"}
                        sx={{ 
                          fontWeight: 'bold',
                          alignSelf: isMobile ? 'flex-start' : 'center'
                        }}
                      />
                    </Box>
                    
                    <Typography 
                      variant="body2" 
                      color="text.secondary" 
                      gutterBottom
                      sx={{ 
                        fontSize: isMobile ? '0.875rem' : '1rem',
                        fontWeight: 'medium'
                      }}
                    >
                      <strong>Client:</strong> {repair.clientFirstName} {repair.clientLastName}
                    </Typography>
                    
                    <Typography 
                      variant="body2" 
                      color="text.secondary" 
                      gutterBottom
                      sx={{ 
                        fontSize: isMobile ? '0.875rem' : '1rem',
                        display: '-webkit-box',
                        WebkitLineClamp: isMobile ? 2 : 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      <strong>Item:</strong> {repair.repairDescription || 'No description'}
                    </Typography>
                    
                    <Typography 
                      variant="body2" 
                      color="text.secondary" 
                      gutterBottom
                      sx={{ 
                        fontSize: isMobile ? '0.875rem' : '1rem'
                      }}
                    >
                      <strong>Submitted:</strong> {formatDate(repair.createdAt)}
                    </Typography>

                    {repair.dueDate && (
                      <Typography 
                        variant="body2" 
                        color="text.secondary" 
                        gutterBottom
                        sx={{ 
                          fontSize: isMobile ? '0.875rem' : '1rem'
                        }}
                      >
                        <strong>Due Date:</strong> {formatDate(repair.dueDate)}
                      </Typography>
                    )}

                    <Box sx={{ 
                      mt: 2, 
                      display: 'flex', 
                      gap: 1,
                      justifyContent: 'flex-end'
                    }}>
                      <Button
                        size={isMobile ? "small" : "medium"}
                        variant="outlined"
                        onClick={() => router.push(`/dashboard/repairs/${repair._id}`)}
                        sx={{
                          minHeight: isMobile ? '36px' : '42px',
                          fontSize: isMobile ? '0.75rem' : '0.875rem',
                          px: isMobile ? 1.5 : 2
                        }}
                      >
                        View Details
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    </PageContainer>
  );
}