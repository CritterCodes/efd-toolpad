import React from 'react';
import {
  Grid,
  Card,
  CardContent,
  Box,
  Avatar,
  Typography,
  Chip,
  Tooltip,
  IconButton
} from '@mui/material';
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Business as BusinessIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  AdminPanelSettings as AdminIcon,
  Code as DeveloperIcon,
  Storefront as WholesalerIcon,
  Palette as ArtisanIcon,
  Group as ClientIcon
} from '@mui/icons-material';

const getUserIcon = (role) => {
  switch (role) {
    case 'admin':
      return <AdminIcon color="error" />;
    case 'developer':
      return <DeveloperIcon color="info" />;
    case 'wholesaler':
      return <WholesalerIcon color="warning" />;
    case 'artisan':
      return <ArtisanIcon color="secondary" />;
    case 'client':
      return <ClientIcon color="primary" />;
    default:
      return <PersonIcon />;
  }
};

const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'active':
    case 'verified':
      return 'success';
    case 'pending':
      return 'warning';
    case 'inactive':
    case 'suspended':
      return 'error';
    default:
      return 'default';
  }
};

const formatUserName = (user = {}) => {
  const firstName = String(user?.firstName || '').trim();
  const lastName = String(user?.lastName || '').trim();
  const fullName = `${firstName} ${lastName}`.trim();

  return fullName || user?.name || user?.email || 'Unnamed User';
};

const UserGridList = ({ paginatedUsers, loading, title, userRole, searchQuery }) => {
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <Typography>Loading {title.toLowerCase()}...</Typography>
      </Box>
    );
  }

  if (paginatedUsers.length === 0) {
    return (
      <Card sx={{ textAlign: 'center', py: 8 }}>
        <CardContent>
          {getUserIcon(userRole)}
          <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
            No {title.toLowerCase()} found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {searchQuery ? 'Try adjusting your search criteria' : `No ${title.toLowerCase()} have been added yet`}
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Grid container spacing={3}>
      {paginatedUsers.filter(Boolean).map((user) => (
        <Grid item xs={12} sm={6} md={4} lg={3} key={user.userID || user._id || user.email}>
          <Card 
            sx={{ 
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              transition: 'all 0.2s',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: 4
              }
            }}
          >
            <CardContent sx={{ flexGrow: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                  {getUserIcon(user.role)}
                </Avatar>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" noWrap>
                    {formatUserName(user)}
                  </Typography>
                  <Chip 
                    label={user.status || 'Active'} 
                    size="small" 
                    color={getStatusColor(user.status)}
                  />
                </Box>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <EmailIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                  <Typography variant="body2" noWrap>
                    {user.email}
                  </Typography>
                </Box>
                
                {user.phoneNumber && (
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <PhoneIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                    <Typography variant="body2" noWrap>
                      {user.phoneNumber}
                    </Typography>
                  </Box>
                )}
                
                {user.business && (
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <BusinessIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                    <Typography variant="body2" noWrap>
                      {user.business}
                    </Typography>
                  </Box>
                )}
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                <Tooltip title="Edit User">
                  <IconButton 
                    size="small"
                    onClick={() => {/* TODO: Implement edit */}}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete User">
                  <IconButton 
                    size="small" 
                    color="error"
                    onClick={() => {/* TODO: Implement delete */}}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

export default UserGridList;