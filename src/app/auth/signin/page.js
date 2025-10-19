"use client";
import React, { useState } from "react";
import { SignInPage } from "@toolpad/core/SignInPage";
import { Link, Snackbar, Alert, Typography, Box } from "@mui/material";
import { useSearchParams, useRouter } from 'next/navigation';
import { providerMap } from "../../../../auth";
import { signIn } from "next-auth/react";
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
    const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
    const [error, setError] = useState(null);
    const [snackbarOpen, setSnackbarOpen] = useState(false);

    // Debug logging
    console.log('🔍 [SIGNIN PAGE] Search params:', Object.fromEntries(searchParams.entries()));
    console.log('🔍 [SIGNIN PAGE] Extracted callbackUrl:', callbackUrl);
    console.log('🔍 [SIGNIN PAGE] Current URL:', typeof window !== 'undefined' ? window.location.href : 'server-side');

    const handleSnackbarClose = () => {
        setSnackbarOpen(false);
    };

    const handleSignIn = async (provider, formData, toolpadCallbackUrl) => {
        try {
            const email = formData.get('email');
            const password = formData.get('password');

            console.log('🔥 [SIGNIN HANDLER] Starting signin process for:', email);
            console.log('🔥 [SIGNIN HANDLER] Original callbackUrl from search params:', callbackUrl);
            console.log('🔥 [SIGNIN HANDLER] Toolpad callbackUrl parameter:', toolpadCallbackUrl);
            console.log('🔥 [SIGNIN HANDLER] Provider:', provider);
            console.log('🔥 [SIGNIN HANDLER] Current window location:', typeof window !== 'undefined' ? window.location.href : 'server-side');

            // First, check if this would be a client access issue by calling our API directly
            const preCheckResponse = await fetch('/api/auth/signin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            console.log('Pre-check response status:', preCheckResponse.status);

            if (preCheckResponse.status === 403) {
                // Client user trying to access admin panel
                const errorData = await preCheckResponse.json();
                const adminOnlyMsg = errorData.message || "This login is for admin users only. Please visit our shop to access your customer account.";
                setError(adminOnlyMsg);
                setSnackbarOpen(true);
                return { error: adminOnlyMsg };
            }

            if (!preCheckResponse.ok && preCheckResponse.status !== 401) {
                // Some other error
                console.log('Pre-check failed with status:', preCheckResponse.status);
                const errorMsg = "An error occurred during sign in";
                setError(errorMsg);
                setSnackbarOpen(true);
                return { error: errorMsg };
            }

            // If we get here, either it's valid admin credentials (200) or invalid credentials (401)
            if (preCheckResponse.status === 401) {
                // Invalid credentials
                const errorMsg = "Invalid email or password";
                setError(errorMsg);
                setSnackbarOpen(true);
                return { error: errorMsg };
            }

            // If precheck was successful (200), proceed with NextAuth
            console.log('Pre-check successful, proceeding with NextAuth');
            console.log('Using callbackUrl:', callbackUrl);
            const result = await signIn("credentials", {
                email,
                password,
                callbackUrl: callbackUrl,
                redirect: false, // Handle redirect manually
            });

            console.log("NextAuth SignIn result:", result);
            
            if (result?.ok) {
                console.log('✅ NextAuth signin successful, redirecting to:', callbackUrl);
                
                // Check if this is a cross-origin redirect (different port)
                if (callbackUrl.includes('localhost:3002') || callbackUrl.includes('localhost:3000')) {
                    console.log('🔄 Cross-origin redirect detected, generating auth token...');
                    
                    // Generate a temporary auth token for cross-origin redirect
                    try {
                        const tokenResponse = await fetch('/api/auth/generate-token', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email, callbackUrl })
                        });
                        
                        if (tokenResponse.ok) {
                            const { token } = await tokenResponse.json();
                            const urlWithToken = `${callbackUrl}${callbackUrl.includes('?') ? '&' : '?'}auth_token=${token}`;
                            console.log('🔄 Redirecting with auth token:', urlWithToken);
                            window.location.href = urlWithToken;
                        } else {
                            console.log('Failed to generate token, using direct redirect');
                            window.location.href = callbackUrl;
                        }
                    } catch (error) {
                        console.error('Error generating auth token:', error);
                        window.location.href = callbackUrl;
                    }
                } else {
                    // Same-origin redirect, use normal redirect
                    window.location.href = callbackUrl;
                }
                return { success: true };
            } else {
                console.log('❌ NextAuth signin failed:', result?.error);
                const errorMsg = result?.error || "Authentication failed";
                setError(errorMsg);
                setSnackbarOpen(true);
                return { error: errorMsg };
            }
        } catch (error) {
            console.error("Sign in error:", error);
            const errorMsg = "An error occurred during sign in";
            setError(errorMsg);
            setSnackbarOpen(true);
            return { error: errorMsg };
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