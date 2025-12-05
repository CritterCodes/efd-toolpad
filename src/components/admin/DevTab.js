/**
 * Dev Tab Component for Admin Settings
 * Contains development tools including role switching
 */

'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { 
    Box,
    Card,
    CardContent,
    Typography,
    Alert,
    AlertTitle,
    Button,
    CircularProgress
} from '@mui/material';
import { Email as EmailIcon } from '@mui/icons-material';
import RoleSwitcher from '@/components/RoleSwitcher';
import { USER_ROLES } from '@/lib/unifiedUserService';

export default function DevTab() {
    const { data: session } = useSession();
    const [emailLoading, setEmailLoading] = useState(false);
    const [emailResult, setEmailResult] = useState(null);
    
    const userRole = session?.user?.role;
    const canAccessDevTools = userRole === USER_ROLES.DEV || userRole === USER_ROLES.ADMIN;

    const handleSendTestEmail = async () => {
        setEmailLoading(true);
        setEmailResult(null);

        try {
            const response = await fetch('/api/admin/test-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    recipientEmail: session?.user?.email
                })
            });

            const data = await response.json();

            if (response.ok) {
                setEmailResult({
                    type: 'success',
                    message: `✅ Test email sent successfully to ${session?.user?.email}`,
                    details: data.messageId ? `Message ID: ${data.messageId}` : null
                });
            } else {
                setEmailResult({
                    type: 'error',
                    message: `❌ Failed to send test email: ${data.error || 'Unknown error'}`,
                    details: data.details
                });
            }
        } catch (error) {
            setEmailResult({
                type: 'error',
                message: '❌ Error sending test email',
                details: error.message
            });
        } finally {
            setEmailLoading(false);
        }
    };

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

            {/* Test Email Sender */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        📧 Test Email Configuration
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Send a test email to verify that your email notification system is working correctly.
                        The email will be sent to your registered email address.
                    </Typography>
                    
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
                        <Button
                            variant="contained"
                            startIcon={<EmailIcon />}
                            onClick={handleSendTestEmail}
                            disabled={emailLoading}
                            color="primary"
                        >
                            {emailLoading ? 'Sending...' : 'Send Test Email'}
                        </Button>
                        {emailLoading && <CircularProgress size={24} />}
                    </Box>

                    {emailResult && (
                        <Alert severity={emailResult.type} sx={{ mb: 2 }}>
                            <AlertTitle>
                                {emailResult.type === 'success' ? '✅ Success' : '❌ Error'}
                            </AlertTitle>
                            {emailResult.message}
                            {emailResult.details && (
                                <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                                    {emailResult.details}
                                </Typography>
                            )}
                        </Alert>
                    )}

                    <Typography variant="caption" color="text.secondary">
                        📬 Check your inbox and spam folder for the test email.
                    </Typography>
                </CardContent>
            </Card>

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