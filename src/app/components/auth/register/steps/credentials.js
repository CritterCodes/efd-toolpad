import React, { useState } from "react";
import { Button, TextField, Typography, Box, Divider, Alert } from "@mui/material";
import { signIn, useSession } from "next-auth/react";

const CredentialsStep = ({ form, setForm, handleNext }) => {
    const [error, setError] = useState("");
    const { data: session, status } = useSession(); // Access session data
    const [snackbarMessage, setSnackbarMessage] = useState("");
    const [snackbarSeverity, setSnackbarSeverity] = useState("info");

    const handleGoogleSignIn = async () => {
        try {
            // Store the form data in sessionStorage for use after Google sign-in
            sessionStorage.setItem("pendingUserData", JSON.stringify(form));
    
            // Trigger Google sign-in and redirect to the callback URL
            await signIn("google", { callbackUrl: "/auth/complete-registration" });
        } catch (error) {
            console.error("Google sign-in error:", error);
            setSnackbarMessage("Failed to sign in with Google.");
            setSnackbarSeverity("error");
        }
    };
    

    // Handle form submission for email/password registration
    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");

        try {
            const response = await fetch("/api/auth/register", {
                method: "POST",
                body: JSON.stringify(form),
                headers: { "Content-Type": "application/json" },
            });

            if (response.ok) {
                handleNext();
            } else {
                const errorData = await response.json();
                setError(errorData.message || "Registration failed. Please try again.");
            }
        } catch (err) {
            setError("Error connecting to the server.");
        }
    };

    return (
        <Box component="form" onSubmit={handleSubmit} sx={{ width: "100%" }}>
            <Typography variant="h5" gutterBottom>
                Create Your Credentials
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                Create an account using your email or sign in with Google.
            </Typography>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            <TextField
                fullWidth
                label="Email Address"
                name="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                sx={{ mb: 2 }}
            />
            <TextField
                fullWidth
                label="Password"
                name="password"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                sx={{ mb: 2 }}
            />

            <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
                <Button
                    fullWidth
                    variant="contained"
                    color="primary"
                    type="submit"
                    sx={{ py: 1.5 }}
                >
                    Register with Email
                </Button>
                <Button
                    fullWidth
                    variant="outlined"
                    onClick={handleGoogleSignIn}
                    sx={{ py: 1.5 }}
                >
                    Sign in with Google
                </Button>
            </Box>

            <Divider sx={{ my: 3 }} />

            <Typography variant="body2" align="center">
                Already have an account?{" "}
                <Button variant="text" onClick={() => signIn()}>
                    Sign in here
                </Button>
            </Typography>
        </Box>
    );
};

export default CredentialsStep;
