"use client";
import React from "react";
import { TextField, Grid, Box, Typography, Button, Divider } from "@mui/material";

const DetailsStep = ({ selectedRole, form, setForm, handleNext, handleBack }) => {
    const handleChange = (e) => {
        const { name, value } = e.target;

        if (name.startsWith("address.")) {
            // Handle nested address fields for the business
            const field = name.split(".")[1];
            setForm({ ...form, address: { ...form.address, [field]: value } });
        } else {
            // Handle other fields
            setForm({ ...form, [name]: value });
        }
    };

    return (
        <Box>
            <Grid container spacing={2}>
                {/* User Details (Common Fields) */}
                <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>
                        User Details
                    </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                    <TextField
                        fullWidth
                        label="First Name"
                        name="firstName"
                        value={form.firstName}
                        onChange={handleChange}
                        required
                    />
                </Grid>
                <Grid item xs={12} sm={6}>
                    <TextField
                        fullWidth
                        label="Last Name"
                        name="lastName"
                        value={form.lastName}
                        onChange={handleChange}
                        required
                    />
                </Grid>
                <Grid item xs={12}>
                    <TextField
                        fullWidth
                        label="Phone Number"
                        name="phoneNumber"
                        type="tel"
                        value={form.phoneNumber}
                        onChange={handleChange}
                        required
                    />
                </Grid>

                {/* Divider between User Details and Business Details */}
                {selectedRole === "store" && (
                    <>
                        <Grid item xs={12}>
                            <Divider sx={{ my: 2 }} />
                        </Grid>

                        {/* Business Details */}
                        <Grid item xs={12}>
                            <Typography variant="h6" gutterBottom>
                                Business Details
                            </Typography>
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Business Name"
                                name="business"
                                value={form.business || ""}
                                onChange={handleChange}
                                required
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Street Address"
                                name="address.street"
                                value={form.address?.street || ""}
                                onChange={handleChange}
                                required
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField
                                fullWidth
                                label="City"
                                name="address.city"
                                value={form.address?.city || ""}
                                onChange={handleChange}
                                required
                            />
                        </Grid>
                        <Grid item xs={3}>
                            <TextField
                                fullWidth
                                label="State"
                                name="address.state"
                                value={form.address?.state || ""}
                                onChange={handleChange}
                                required
                            />
                        </Grid>
                        <Grid item xs={3}>
                            <TextField
                                fullWidth
                                label="ZIP Code"
                                name="address.zip"
                                value={form.address?.zip || ""}
                                onChange={handleChange}
                                required
                            />
                        </Grid>
                    </>
                )}
            </Grid>
            <Box sx={{ display: "flex", justifyContent: "space-between", mt: 4 }}>
                <Button variant="outlined" onClick={handleBack}>
                    Back
                </Button>
                <Button variant="contained" onClick={handleNext}>
                    Next
                </Button>
            </Box>
        </Box>
    );
};

export default DetailsStep;
