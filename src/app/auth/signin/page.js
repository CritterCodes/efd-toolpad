"use client";
import React, { useState } from "react";
import { SignInPage } from "@toolpad/core/SignInPage";
import { Link, Snackbar, Alert } from "@mui/material";
import { useSearchParams } from 'next/navigation';  // ✅ Import the correct Next.js hook
import { providerMap } from "../../../../auth";
import { signIn } from "next-auth/react";

const ForgotPasswordLink = () => {
    return (
        <Link href="/auth/forgot-password" underline="hover">
            Forgot your password?
        </Link>
    );
};

const CreateAnAccount = () => {
    return (
        <Link href="/auth/forgot-password" underline="hover">
            Need an account?
        </Link>
    );
}

const SignIn = () => {
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';  // ✅ Fallback if missing
    const [error, setError] = useState(null);
    const [snackbarOpen, setSnackbarOpen] = useState(false);

    const handleSnackbarClose = () => {
        setSnackbarOpen(false);
    };

    const handleSignIn = async (provider, formData) => {
        try {
            if (provider.id === 'credentials') {
                const response = await signIn("credentials", {
                    redirect: true,
                    email: formData.get('email'),
                    password: formData.get('password'),
                    callbackUrl
                });
                if (!response || response.error) {
                    throw new Error("Invalid credentials. Please try again.");
                }
                return response;
            } else {
                return signIn(provider.id, { callbackUrl });
            }
        } catch (error) {
            setError(error.message || "An error occurred during sign-in.");
            setSnackbarOpen(true);
        }
    };

    return (
        <>
            <SignInPage
                signIn={handleSignIn}
                providers={providerMap}
                slotProps={{
                    forgotPasswordLink: ForgotPasswordLink,
                    signUpLink: CreateAnAccount,
                    emailField: { autoFocus: true }
                }}
            />

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
