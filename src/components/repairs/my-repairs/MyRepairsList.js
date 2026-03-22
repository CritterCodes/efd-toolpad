import React from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  Grid,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';

export default function MyRepairsList({ 
  filteredRepairs, 
  activeTab 
}) {
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

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

  if (filteredRepairs.length === 0) {
    return (
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
    );
  }

  return (
    <Grid container spacing={2}>
      {filteredRepairs.map((repair) => (
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
  );
}