"use client";
import { Button, CircularProgress } from "@mui/material";
import { signIn } from "next-auth/react";
import GoogleIcon from "@mui/icons-material/Google";
import { useState } from "react";

const GoogleLoginButton = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await signIn("google", {
                callbackUrl: "/dashboard" // Redirect after successful sign-in
            });
            if (!result?.ok) {
                throw new Error("Google sign-in failed.");
            }
        } catch (error) {
            setError("Failed to sign in with Google. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Button
                variant="contained"
                startIcon={<GoogleIcon />}
                onClick={handleGoogleLogin}
                disabled={loading}
                sx={{ mt: 2 }}
            >
                {loading ? <CircularProgress size={24} /> : "Sign in with Google"}
            </Button>
            {error && <p style={{ color: "red", marginTop: "10px" }}>{error}</p>}
        </>
    );
};

export default GoogleLoginButton;
