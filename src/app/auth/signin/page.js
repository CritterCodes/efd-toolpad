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

    const handleSnackbarClose = () => {
        setSnackbarOpen(false);
    };

    const handleSignIn = async (provider, formData, callbackUrl) => {
        try {
            const email = formData.get('email');
            const password = formData.get('password');

            console.log('Starting signin process for:', email);

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
            const result = await signIn("credentials", {
                email,
                password,
                redirect: false,
            });

            console.log("NextAuth SignIn result:", result);

            // Check if NextAuth is trying to redirect back to signin (production issue)
            if (result?.url && result.url.includes('/auth/signin')) {
                console.error('NextAuth redirecting back to signin - checking session...');
                
                // Wait a moment for session to propagate, then check
                await new Promise(resolve => setTimeout(resolve, 500));
                
                try {
                    const sessionCheck = await fetch('/api/auth/session');
                    const session = await sessionCheck.json();
                    console.log('Session check after signin redirect:', session);
                    
                    if (session?.user) {
                        console.log('Session exists despite redirect URL - proceeding to dashboard');
                        router.push(callbackUrl || '/dashboard');
                        return { type: 'CredentialsSignin' };
                    } else {
                        console.error('No session found after signin redirect');
                        const errorMsg = "Authentication failed. Please try again.";
                        setError(errorMsg);
                        setSnackbarOpen(true);
                        return { error: errorMsg };
                    }
                } catch (sessionError) {
                    console.error('Session check failed:', sessionError);
                    const errorMsg = "Authentication failed. Please try again.";
                    setError(errorMsg);
                    setSnackbarOpen(true);
                    return { error: errorMsg };
                }
            }

            // NextAuth success conditions: ok=true AND status=200
            // Note: error='CredentialsSignin' is actually SUCCESS when ok=true
            if (result?.ok && result?.status === 200) {
                console.log('NextAuth successful, redirecting to dashboard');
                
                // Double-check session was created by checking auth state
                try {
                    const sessionCheck = await fetch('/api/auth/session');
                    const session = await sessionCheck.json();
                    console.log('Session check result:', session);
                    
                    if (session?.user) {
                        // Session confirmed, safe to redirect
                        router.push(callbackUrl || '/dashboard');
                        return { type: 'CredentialsSignin' };
                    } else {
                        console.error('Session not created despite successful auth');
                        const errorMsg = "Session creation failed. Please try again.";
                        setError(errorMsg);
                        setSnackbarOpen(true);
                        return { error: errorMsg };
                    }
                } catch (sessionError) {
                    console.error('Session check failed:', sessionError);
                    // Proceed with redirect anyway - might be a temporary issue
                    router.push(callbackUrl || '/dashboard');
                    return { type: 'CredentialsSignin' };
                }
            } else if (result?.error && result?.error !== 'CredentialsSignin') {
                // Only treat as error if it's not the success indicator
                console.log('NextAuth actual error:', result.error);
                const errorMsg = "Invalid email or password";
                setError(errorMsg);
                setSnackbarOpen(true);
                return { error: errorMsg };
            } else {
                // Fallback for other failure cases
                console.log('NextAuth failed with unknown state:', result);
                const errorMsg = "An error occurred during sign in";
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