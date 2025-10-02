"use client";
import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  CardActionArea,
  Breadcrumbs,
  Link,
  Avatar,
  Chip
} from '@mui/material';
import {
  AdminPanelSettings as AdminIcon,
  Code as DeveloperIcon,
  Storefront as WholesalerIcon,
  Palette as ArtisanIcon,
  Group as ClientIcon
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';

const UserTypeCard = ({ 
  title, 
  description, 
  icon, 
  route, 
  count, 
  color = 'primary' 
}) => {
  const router = useRouter();

  return (
    <Card sx={{ height: '100%', transition: 'all 0.2s', '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 } }}>
      <CardActionArea 
        sx={{ height: '100%', p: 3 }}
        onClick={() => router.push(route)}
      >
        <CardContent sx={{ textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Avatar 
            sx={{ 
              bgcolor: `${color}.main`, 
              width: 64, 
              height: 64, 
              mb: 2 
            }}
          >
            {icon}
          </Avatar>
          
          <Typography variant="h5" gutterBottom>
            {title}
          </Typography>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, flexGrow: 1 }}>
            {description}
          </Typography>
          
          <Chip 
            label={count !== undefined ? `${count} users` : 'Loading...'} 
            color={color}
            variant="outlined"
          />
        </CardContent>
      </CardActionArea>
    </Card>
  );
};

const USER_TYPES = [
  {
    id: 'admin',
    title: 'Administrators',
    description: 'System administrators with full access and management capabilities',
    icon: <AdminIcon sx={{ fontSize: 32 }} />,
    route: '/dashboard/users/admin',
    color: 'error'
  },
  {
    id: 'developer',
    title: 'Developers',
    description: 'Technical team members with development and maintenance access',
    icon: <DeveloperIcon sx={{ fontSize: 32 }} />,
    route: '/dashboard/users/developers',
    color: 'info'
  },
  {
    id: 'wholesaler',
    title: 'Wholesalers',
    description: 'Business partners with bulk ordering and special pricing privileges',
    icon: <WholesalerIcon sx={{ fontSize: 32 }} />,
    route: '/dashboard/users/wholesalers',
    color: 'warning'
  },
  {
    id: 'artisan',
    title: 'Artisans',
    description: 'Skilled craftspeople with specialized production workflow access',
    icon: <ArtisanIcon sx={{ fontSize: 32 }} />,
    route: '/dashboard/users/artisans',
    color: 'secondary'
  },
  {
    id: 'client',
    title: 'Clients',
    description: 'End customers with access to order tracking and communication',
    icon: <ClientIcon sx={{ fontSize: 32 }} />,
    route: '/dashboard/clients',
    color: 'primary'
  }
];

const UsersOverviewPage = () => {
  const [userCounts, setUserCounts] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserCounts = async () => {
      try {
        setLoading(true);
        const counts = {};
        
        // Fetch counts for each user type
        for (const userType of USER_TYPES) {
          try {
            const response = await fetch(`/api/users?role=${userType.id}`);
            const data = await response.json();
            counts[userType.id] = data.users?.length || 0;
          } catch (error) {
            console.error(`Failed to fetch ${userType.id} count:`, error);
            counts[userType.id] = 0;
          }
        }
        
        setUserCounts(counts);
      } catch (error) {
        console.error('Failed to fetch user counts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserCounts();
  }, []);

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Breadcrumbs sx={{ mb: 2 }}>
          <Link href="/dashboard" color="inherit">
            Dashboard
          </Link>
          <Typography color="text.primary">User Management</Typography>
        </Breadcrumbs>
        
        <Typography variant="h4" gutterBottom>
          User Management
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage different types of users across the system. Each user type has specific access levels and capabilities.
        </Typography>
      </Box>

      {/* User Type Cards */}
      <Grid container spacing={3}>
        {USER_TYPES.map((userType) => (
          <Grid item xs={12} sm={6} md={4} key={userType.id}>
            <UserTypeCard
              title={userType.title}
              description={userType.description}
              icon={userType.icon}
              route={userType.route}
              count={userCounts[userType.id]}
              color={userType.color}
            />
          </Grid>
        ))}
      </Grid>

      {/* Summary Statistics */}
      <Box sx={{ mt: 4, p: 3, bgcolor: 'background.paper', borderRadius: 2 }}>
        <Typography variant="h6" gutterBottom>
          Quick Stats
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={6} sm={3}>
            <Typography variant="h4" color="primary">
              {Object.values(userCounts).reduce((a, b) => a + b, 0)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Users
            </Typography>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="h4" color="error">
              {userCounts.admin || 0}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Administrators
            </Typography>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="h4" color="primary">
              {userCounts.client || 0}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Clients
            </Typography>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="h4" color="warning">
              {userCounts.wholesaler || 0}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Business Partners
            </Typography>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default UsersOverviewPage;