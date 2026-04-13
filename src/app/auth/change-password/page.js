"use client";
import React, { useState } from "react";
import {
    Box,
    Card,
    CardContent,
    Typography,
    TextField,
    Button,
    Alert,
    CircularProgress
} from "@mui/material";
import { signOut } from "next-auth/react";

export default function ChangePasswordPage() {
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (newPassword.length < 8) {
            setError("New password must be at least 8 characters.");
            return;
        }

        if (newPassword !== confirmPassword) {
            setError("New passwords do not match.");
            return;
        }

        if (currentPassword === newPassword) {
            setError("New password must be different from current password.");
            return;
        }

        setLoading(true);
        try {
            const response = await fetch("/api/auth/change-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ currentPassword, newPassword }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || "Failed to change password.");
                return;
            }

            setSuccess(true);
            // Sign out after 2 seconds so they re-login with new password
            setTimeout(() => {
                signOut({ callbackUrl: "/auth/signin" });
            }, 2000);
        } catch (err) {
            setError("An error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box
            sx={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: "background.default",
                p: 2,
            }}
        >
            <Card sx={{ maxWidth: 440, width: "100%" }}>
                <CardContent sx={{ p: 4 }}>
                    <Typography variant="h5" fontWeight="bold" gutterBottom>
                        Change Your Password
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        You are required to change your password before continuing.
                    </Typography>

                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {error}
                        </Alert>
                    )}

                    {success ? (
                        <Alert severity="success">
                            Password changed successfully. Redirecting to sign in...
                        </Alert>
                    ) : (
                        <Box component="form" onSubmit={handleSubmit}>
                            <TextField
                                label="Current Password"
                                type="password"
                                fullWidth
                                required
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                sx={{ mb: 2 }}
                                autoFocus
                            />
                            <TextField
                                label="New Password"
                                type="password"
                                fullWidth
                                required
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                helperText="Minimum 8 characters"
                                sx={{ mb: 2 }}
                            />
                            <TextField
                                label="Confirm New Password"
                                type="password"
                                fullWidth
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                sx={{ mb: 3 }}
                            />
                            <Button
                                type="submit"
                                variant="contained"
                                fullWidth
                                size="large"
                                disabled={loading}
                            >
                                {loading ? <CircularProgress size={24} /> : "Change Password"}
                            </Button>
                        </Box>
                    )}
                </CardContent>
            </Card>
        </Box>
    );
}
