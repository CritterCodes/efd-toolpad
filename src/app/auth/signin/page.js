"use client";
import React, { useState, Suspense } from "react";
import { SignInPage } from "@toolpad/core/SignInPage";
import { Link, Snackbar, Alert, Typography, Box } from "@mui/material";
import { useSearchParams } from 'next/navigation';
import { providerMap } from "@/lib/auth";
import { signIn } from "next-auth/react";
import Image from 'next/image';

const ForgotPasswordLink = () => (
    <Link href="/auth/forgot-password" underline="hover">
        Forgot your password?
    </Link>
);

const InternalAppNote = () => (
    <Box sx={{ textAlign: 'center', mt: 2 }}>
        <Typography variant="body2" color="text.secondary">
            Internal Admin Access Only
        </Typography>
        <Typography variant="caption" color="text.secondary">
            Contact your administrator for account access
        </Typography>
    </Box>
);

const SignInContent = () => {
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
    const [error, setError] = useState(null);
    const [snackbarOpen, setSnackbarOpen] = useState(false);

    const handleSignIn = async (provider, formData) => {
        try {
            const email = formData.get('email');
            const password = formData.get('password');

            // Call NextAuth signin
            const result = await signIn("credentials", {
                email,
                password,
                redirect: false,
            });

            // Handle errors
            if (result?.error === 'CredentialsSignin') {
                setError("Invalid email or password");
                setSnackbarOpen(true);
                return { error: "Invalid email or password" };
            }

            if (result?.error) {
                setError(result.error);
                setSnackbarOpen(true);
                return { error: result.error };
            }

            // Success - redirect to dashboard
            if (result?.ok) {
                window.location.href = callbackUrl;
            }

            return result;
        } catch (error) {
            console.error("Sign in error:", error);
            setError("An error occurred during sign in");
            setSnackbarOpen(true);
            return { error: "An error occurred during sign in" };
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

            <Snackbar
                open={snackbarOpen}
                autoHideDuration={6000}
                onClose={() => setSnackbarOpen(false)}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
                <Alert onClose={() => setSnackbarOpen(false)} severity="error" sx={{ width: '100%' }}>
                    {error}
                </Alert>
            </Snackbar>
        </>
    );
};

const SignIn = () => {
    return (
        <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>Loading...</Box>}>
            <SignInContent />
        </Suspense>
    );
};

export default SignIn;