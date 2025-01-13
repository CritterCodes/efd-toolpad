// src/app/auth/register/page.js
"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
    TextField,
    Button,
    Typography,
    Container,
    Box,
    Grid,
    Paper,
    Alert,
    MenuItem
} from "@mui/material";

const RegisterPage = () => {
    const [form, setForm] = useState({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        phoneNumber: "",
        image: "",
        role: "client"
    });
    const [error, setError] = useState("");
    const router = useRouter();

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
                router.push("/dashboard");
            } else {
                const errorData = await response.json();
                setError(errorData.message || "Registration failed. Please try again.");
            }
        } catch (error) {
            setError("Error connecting to the server.");
        }
    };

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    return (
        <Container component="main" maxWidth="xs">
            <Paper elevation={3} sx={{ padding: 3, marginTop: 8 }}>
                <Typography component="h1" variant="h4" align="center" gutterBottom>
                    Register
                </Typography>

                {error && (
                    <Alert severity="error" sx={{ marginBottom: 2 }}>
                        {error}
                    </Alert>
                )}

                <form onSubmit={handleSubmit}>
                    <Grid container spacing={2}>
                        {/* First Name */}
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="First Name"
                                name="firstName"
                                variant="outlined"
                                value={form.firstName}
                                onChange={handleChange}
                                required
                            />
                        </Grid>

                        {/* Last Name */}
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Last Name"
                                name="lastName"
                                variant="outlined"
                                value={form.lastName}
                                onChange={handleChange}
                                required
                            />
                        </Grid>

                        {/* Email */}
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Email Address"
                                name="email"
                                type="email"
                                variant="outlined"
                                value={form.email}
                                onChange={handleChange}
                                required
                            />
                        </Grid>

                        {/* Password */}
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Password"
                                name="password"
                                type="password"
                                variant="outlined"
                                value={form.password}
                                onChange={handleChange}
                                required
                            />
                        </Grid>

                        {/* Phone Number */}
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Phone Number"
                                name="phoneNumber"
                                type="tel"
                                variant="outlined"
                                value={form.phoneNumber}
                                onChange={handleChange}
                            />
                        </Grid>

                        {/* Submit Button */}
                        <Grid item xs={12}>
                            <Button
                                fullWidth
                                variant="contained"
                                color="primary"
                                type="submit"
                                sx={{ padding: 1 }}
                            >
                                Register
                            </Button>
                        </Grid>
                    </Grid>
                </form>

                {/* Redirect to Sign In */}
                <Box mt={2}>
                    <Typography variant="body2" align="center">
                        Already have an account?{" "}
                        <Button
                            variant="text"
                            onClick={() => router.push("/auth/signin")}
                        >
                            Sign in here
                        </Button>
                    </Typography>
                </Box>
            </Paper>
        </Container>
    );
};

export default RegisterPage;
