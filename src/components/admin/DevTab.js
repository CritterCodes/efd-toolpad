/**
 * Dev Tab Component for Admin Settings
 * Contains development tools including role switching
 */

'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import { 
    Box,
    Card,
    CardContent,
    Typography,
    Alert,
    AlertTitle
} from '@mui/material';
import RoleSwitcher from '@/components/RoleSwitcher';
import { USER_ROLES } from '@/lib/unifiedUserService';

export default function DevTab() {
    const { data: session } = useSession();
    
    const userRole = session?.user?.role;
    const canAccessDevTools = userRole === USER_ROLES.DEV || userRole === USER_ROLES.ADMIN;

    if (!canAccessDevTools) {
        return (
            <Alert severity="error">
                <AlertTitle>Access Denied</AlertTitle>
                Dev tools are only available to developers and administrators.
            </Alert>
        );
    }

    return (
        <Box sx={{ maxWidth: 800 }}>
            <Typography variant="h6" gutterBottom>
                Development Tools
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Tools and utilities for development and testing purposes.
            </Typography>

            {/* Role View Switcher */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Role View Switcher
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Test the application from different user role perspectives. When activated, 
                        a banner will appear at the top of all pages indicating the current view role.
                    </Typography>
                    
                    <RoleSwitcher />
                </CardContent>
            </Card>

            {/* Future dev tools can be added here */}
            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Additional Dev Tools
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        More development tools will be added here as needed.
                    </Typography>
                </CardContent>
            </Card>
        </Box>
    );
}