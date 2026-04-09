import React from 'react';
import { Card, CardContent, Typography, Box, Button } from '@mui/material';
import { 
    People as PeopleIcon,
    Handyman as HandymanIcon,
    Analytics as AnalyticsIcon,
    Assignment as AssignmentIcon,
    Settings as SettingsIcon
} from '@mui/icons-material';

export default function AdminQuickActions({ router }) {
    return (
        <Card>
            <CardContent>
                <Typography variant="h6" gutterBottom>
                    Quick Actions
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Button
                        variant="contained"
                        startIcon={<PeopleIcon />}
                        onClick={() => router.push('/dashboard/clients')}
                        fullWidth
                    >
                        Manage Clients
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<HandymanIcon />}
                        onClick={() => router.push('/dashboard/repairs')}
                        fullWidth
                    >
                        View All Repairs
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<AnalyticsIcon />}
                        onClick={() => router.push('/dashboard/admin/analytics')}
                        fullWidth
                    >
                        View Analytics
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<AssignmentIcon />}
                        onClick={() => router.push('/dashboard/design-requests')}
                        fullWidth
                    >
                        Design Requests
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<SettingsIcon />}
                        onClick={() => router.push('/dashboard/admin/settings')}
                        fullWidth
                    >
                        Admin Settings
                    </Button>
                </Box>
            </CardContent>
        </Card>
    );
}
