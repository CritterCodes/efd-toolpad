"use client";
import React, { useState, useEffect } from "react";
import { SignInPage } from "@toolpad/core/SignInPage";
import { Link, Snackbar, Alert, Typography, Box, CircularProgress } from "@mui/material";
import { useSearchParams, useRouter } from 'next/navigation';
import { providerMap } from "../../../../auth";
import { signIn, useSession } from "next-auth/react";
import Image from 'next/image';

const ForgotPasswordLink = () => {
    return (
        <Link href="/auth/forgot-password" underline="hover">
            Forgot your password?
        </Link>
    );
};

// Remove the Create Account link for internal app
const InternalAppNote = () => {
    return (
        <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
                Internal Admin Access Only
            </Typography>
            <Typography variant="caption" color="text.secondary">
                Contact your administrator for account access
            </Typography>
        </Box>
    );
};

const SignIn = () => {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { data: session, status } = useSession();
    const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
    const [error, setError] = useState(null);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [isRedirecting, setIsRedirecting] = useState(false);

    // If user is already authenticated, redirect them
    useEffect(() => {
        console.log('🔍 [SIGNIN] Session status:', status, 'Session:', session);
        if (status === 'authenticated' && session?.user) {
            console.log('🔄 [SIGNIN] User already authenticated, checking current location...');
            // Only redirect if we're actually on the signin page to prevent loops
            if (window.location.pathname === '/auth/signin') {
                console.log('🚀 [SIGNIN] Redirecting to dashboard from signin page...');
                setIsRedirecting(true);
                
                // Try router first, with window.location as backup
                router.replace('/dashboard');
                
                // Backup redirect in case router fails
                setTimeout(() => {
                    if (window.location.pathname === '/auth/signin') {
                        console.log('🔄 [SIGNIN] Router redirect failed, using window.location...');
                        window.location.href = '/dashboard';
                    }
                }, 2000);
            }
        }
    }, [status, session, router]);

    // Show loading state if we're authenticated and redirecting
    if (status === 'authenticated' && session?.user && isRedirecting) {
        return (
            <Box sx={{ 
                minHeight: '100vh', 
                display: 'flex', 
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'background.default'
            }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                    Redirecting to dashboard...
                </Typography>
                <CircularProgress />
            </Box>
        );
    }

    const handleSnackbarClose = () => {
        setSnackbarOpen(false);
    };

    const handleSignIn = async (provider, formData) => {
        try {
            if (provider.id === 'credentials') {
                console.log('🔐 Starting client-side signin...');
                await signIn("credentials", {
                    redirect: true,
                    email: formData.get('email'),
                    password: formData.get('password'),
                    callbackUrl
                });
                // When redirect: true, signIn doesn't return a response - it redirects
                // So we don't need to check response here
                return;
            } else {
                return signIn(provider.id, { callbackUrl });
            }
        } catch (error) {
            console.error('❌ Client-side signin error:', error);
            setError(error.message || "An error occurred during sign-in.");
            setSnackbarOpen(true);
        }
    };

    return (
        <>
            <Box sx={{ 
                minHeight: '100vh', 
                display: 'flex', 
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'background.default'
            }}>
                <Box sx={{ mb: 4, textAlign: 'center' }}>
                    <Image 
                        src="/logos/[efd]LogoBlack.png" 
                        alt="Engel Fine Design" 
                        width={200}
                        height={100}
                        style={{ marginBottom: '16px' }}
                    />
                    <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
                        Admin Dashboard
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Sign in to access the Engel Fine Design management system
                    </Typography>
                </Box>

                <Box sx={{ width: '100%', maxWidth: '400px' }}>
                    <SignInPage
                        signIn={handleSignIn}
                        providers={providerMap}
                        slotProps={{
                            forgotPasswordLink: ForgotPasswordLink,
                            signUpLink: InternalAppNote,
                            emailField: { autoFocus: true }
                        }}
                    />
                </Box>
            </Box>

            {/* ✅ Snackbar for Error Handling */}
            <Snackbar
                open={snackbarOpen}
                autoHideDuration={6000}
                onClose={handleSnackbarClose}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
                <Alert onClose={handleSnackbarClose} severity="error" sx={{ width: '100%' }}>
                    {error}
                </Alert>
            </Snackbar>
        </>
    );
};

export default SignIn;
