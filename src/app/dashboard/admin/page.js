'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import {
  Build as TasksIcon,
  Settings as SettingsIcon,
  Inventory as MaterialsIcon,
  Engineering as ProcessesIcon,
  Add as AddIcon,
  List as ListIcon,
  Person as ArtisanIcon
} from '@mui/icons-material';
import { PageContainer } from '@toolpad/core/PageContainer';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
  const router = useRouter();

  const adminSections = [
    {
      title: 'Task Management',
      description: 'Manage all tasks including repair work, laser engraving, and 3D design',
      icon: <TasksIcon sx={{ fontSize: 48 }} />,
      color: 'primary',
      actions: [
        {
          label: 'View All Tasks',
          path: '/dashboard/admin/tasks',
          icon: <ListIcon />,
          variant: 'contained'
        },
        {
          label: 'Create Task',
          path: '/dashboard/admin/tasks/create',
          icon: <AddIcon />,
          variant: 'outlined'
        }
      ]
    },
    {
      title: 'Materials Management', 
      description: 'Manage repair materials, supplies, and inventory',
      icon: <MaterialsIcon sx={{ fontSize: 48 }} />,
      color: 'secondary',
      actions: [
        {
          label: 'Manage Materials',
          path: '/dashboard/admin/tasks/materials',
          icon: <MaterialsIcon />,
          variant: 'contained'
        }
      ]
    },
    {
      title: 'Processes Management',
      description: 'Configure repair processes, labor time, and complexity',
      icon: <ProcessesIcon sx={{ fontSize: 48 }} />,
      color: 'info',
      actions: [
        {
          label: 'Manage Processes',
          path: '/dashboard/admin/tasks/processes',
          icon: <ProcessesIcon />,
          variant: 'contained'
        }
      ]
    },
    {
      title: 'Artisan Management',
      description: 'Review and manage artisan partnership applications',
      icon: <ArtisanIcon sx={{ fontSize: 48 }} />,
      color: 'success',
      actions: [
        {
          label: 'Manage Applications',
          path: '/dashboard/admin/artisans',
          icon: <ArtisanIcon />,
          variant: 'contained'
        }
      ]
    },
    {
      title: 'System Settings',
      description: 'Configure pricing, business settings, and system preferences',
      icon: <SettingsIcon sx={{ fontSize: 48 }} />,
      color: 'warning',
      actions: [
        {
          label: 'System Settings',
          path: '/dashboard/admin/settings',
          icon: <SettingsIcon />,
          variant: 'contained'
        }
      ]
    }
  ];

  return (
    <PageContainer title="Admin Dashboard">
      <Box sx={{ pb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Admin Dashboard
        </Typography>
        <Typography color="text.secondary" paragraph>
          Manage your business operations, tasks, and system settings
        </Typography>

        <Grid container spacing={3}>
          {adminSections.map((section) => (
            <Grid item xs={12} sm={6} md={6} key={section.title}>
              <Card 
                sx={{ 
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  borderTop: 3,
                  borderTopColor: `${section.color}.main`
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box display="flex" alignItems="center" gap={2} mb={2}>
                    <Box color={`${section.color}.main`}>
                      {section.icon}
                    </Box>
                    <Typography variant="h5" component="h2">
                      {section.title}
                    </Typography>
                  </Box>
                  
                  <Typography color="text.secondary" paragraph>
                    {section.description}
                  </Typography>
                </CardContent>

                <CardActions sx={{ p: 2, pt: 0 }}>
                  <Box display="flex" gap={1} flexWrap="wrap">
                    {section.actions.map((action) => (
                      <Button
                        key={action.label}
                        variant={action.variant}
                        color={section.color}
                        startIcon={action.icon}
                        onClick={() => router.push(action.path)}
                        size="small"
                      >
                        {action.label}
                      </Button>
                    ))}
                  </Box>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Quick Stats */}
        <Box mt={4}>
          <Typography variant="h5" gutterBottom>
            Quick Actions
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => router.push('/dashboard/admin/tasks/create')}
                sx={{ py: 2 }}
              >
                Create New Task
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<MaterialsIcon />}
                onClick={() => router.push('/dashboard/admin/tasks/materials')}
                sx={{ py: 2 }}
              >
                Add Material
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<ProcessesIcon />}
                onClick={() => router.push('/dashboard/admin/tasks/processes')}
                sx={{ py: 2 }}
              >
                Add Process
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<SettingsIcon />}
                onClick={() => router.push('/dashboard/admin/settings')}
                sx={{ py: 2 }}
              >
                Settings
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Box>
    </PageContainer>
  );
}
