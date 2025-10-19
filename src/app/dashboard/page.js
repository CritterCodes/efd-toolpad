'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Box, CircularProgress, Alert, Button, Paper, Typography } from '@mui/material';
import { USER_ROLES } from '@/lib/unifiedUserService';
import { getEffectiveRole } from '@/lib/roleBasedNavigation';
import ArtisanDashboardContent from '@/components/dashboards/ArtisanDashboard';
import WholesalerDashboardContent from '@/components/dashboards/WholesalerDashboard';
// Import the original dashboard for staff/admin/dev roles
import AdminDashboardContent from './AdminDashboardContent';
import { forceLogout, logoutIfWrongRole } from '@/lib/auth-utils';

export default function DashboardPage() {
    const { data: session, status } = useSession();
    const [effectiveRole, setEffectiveRole] = useState(null);
    
    console.log('🏠 [DASHBOARD] Component mounted - Status:', status, 'Session:', session);
    
    // Update effective role when session loads or role view changes
    useEffect(() => {
        if (!session?.user?.role) return;

        const updateEffectiveRole = () => {
            const newEffectiveRole = getEffectiveRole(session.user.role);
            setEffectiveRole(newEffectiveRole);
            console.log('🎯 [DASHBOARD] Effective role updated:', newEffectiveRole);
        };

        // Initial setup
        updateEffectiveRole();

        // Listen for role view changes
        const handleRoleChange = () => {
            updateEffectiveRole();
        };

        window.addEventListener('roleViewChanged', handleRoleChange);
        window.addEventListener('storage', handleRoleChange);

        return () => {
            window.removeEventListener('roleViewChanged', handleRoleChange);
            window.removeEventListener('storage', handleRoleChange);
        };
    }, [session?.user?.role]);
    
    if (status === 'loading' || !effectiveRole) {
        console.log('🔄 [DASHBOARD] Loading state - Status:', status, 'EffectiveRole:', effectiveRole);
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                <CircularProgress />
            </Box>
        );
    }
    
    console.log('🎯 [DASHBOARD] Rendering dashboard for role:', effectiveRole);

    if (!session?.user) {
        return (
            <Alert severity="error">
                Please sign in to access the dashboard.
            </Alert>
        );
    }

    // 🚨 TEMPORARY: Debugging section to help with role issues
    const handleForceLogout = async () => {
        console.log('🚨 [DEBUG] Force logout triggered by user');
        await forceLogout();
    };

    const debugInfo = (
        <Paper elevation={2} sx={{ p: 2, mb: 2, bgcolor: 'grey.100' }}>
            <Typography variant="h6" color="primary">🔧 Debug Info (Temporary)</Typography>
            <Typography>Session Role: {session?.user?.role}</Typography>
            <Typography>Effective Role: {effectiveRole}</Typography>
            <Typography>Email: {session?.user?.email}</Typography>
            <Box sx={{ mt: 1 }}>
                <Button 
                    variant="contained" 
                    color="warning" 
                    onClick={handleForceLogout}
                    size="small"
                >
                    🚪 Force Logout & Clear Session
                </Button>
            </Box>
        </Paper>
    );

    const userRole = effectiveRole; // Use effective role for dashboard display
    const actualRole = session.user.role; // Use actual role for security checks

    // Block client role access completely (check actual role for security)
    if (actualRole === USER_ROLES.CLIENT) {
        return (
            <Alert severity="error">
                Access denied. Client accounts cannot access the admin dashboard.
            </Alert>
        );
    }

    // Render role-specific dashboard content
    const renderDashboardContent = () => {
        switch (userRole) {
            case USER_ROLES.WHOLESALER:
                return <WholesalerDashboardContent />;
                
            case USER_ROLES.ARTISAN_APPLICANT:
                return (
                    <Box>
                        <Alert severity="info" sx={{ mb: 3 }}>
                            Your artisan application is pending review. You will receive email notification once approved.
                        </Alert>
                        <ArtisanDashboardContent />
                    </Box>
                );
                
            case USER_ROLES.ARTISAN:
                return <ArtisanDashboardContent />;
                
            case USER_ROLES.STAFF:
            case USER_ROLES.DEV:
            case USER_ROLES.ADMIN:
                return <AdminDashboardContent />;
                
            default:
                return (
                    <Alert severity="warning">
                        Dashboard not configured for role: {userRole}
                    </Alert>
                );
        }
    };

    return (
        <Box>
            {debugInfo}
            {renderDashboardContent()}
        </Box>
    );
}