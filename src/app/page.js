"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Box, CircularProgress, Typography } from '@mui/material';

export default function HomePage() {
    const router = useRouter();
    const { data: session, status } = useSession();

    useEffect(() => {
        if (status === 'loading') return; // Still loading
        
        if (session) {
            // User is authenticated, redirect to dashboard
            router.replace('/dashboard');
        } else {
            // User is not authenticated, redirect to sign-in
            router.replace('/auth/signin');
        }
    }, [session, status, router]);

    // Show loading while redirecting
    return (
        <Box 
            sx={{ 
                display: 'flex', 
                flexDirection: 'column',
                justifyContent: 'center', 
                alignItems: 'center', 
                minHeight: '100vh',
                gap: 2
            }}
        >
            <CircularProgress />
            <Typography variant="body1">
                Redirecting to Engel Fine Design Admin...
            </Typography>
        </Box>
    );
}
