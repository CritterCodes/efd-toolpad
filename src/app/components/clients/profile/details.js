import React from 'react';
import { Box, TextField, FormControl, InputLabel, MenuItem, Select, Grid, Typography } from '@mui/material';

const roles = ["admin", "client", "wholesaler"];

const UserDetailsForm = ({ user, onEdit }) => {
    return (
        <Box sx={{ flex: 1, padding: 3 }}>
            {/* Grid layout for better spacing and structure */}
            <Grid container spacing={2}>

                {/* User Information Form */}
                <Grid item xs={12} sm={8}>
                    <Grid container spacing={2}>
                        {/* Name Fields */}
                        <Grid item xs={6}>
                            <TextField
                                label="First Name"
                                value={user.firstName || ''}
                                onChange={(e) => onEdit("firstName", e.target.value)}
                                fullWidth
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField
                                label="Last Name"
                                value={user.lastName || ''}
                                onChange={(e) => onEdit("lastName", e.target.value)}
                                fullWidth
                            />
                        </Grid>

                        {/* Contact Information */}
                        <Grid item xs={6}>
                            <TextField
                                label="Email"
                                value={user.email || ''}
                                onChange={(e) => onEdit("email", e.target.value)}
                                fullWidth
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField
                                label="Phone Number"
                                value={user.phoneNumber || ''}
                                onChange={(e) => onEdit("phoneNumber", e.target.value)}
                                fullWidth
                            />
                        </Grid>

                        {/* Role Selector */}
                        <Grid item xs={6}>
                            <FormControl fullWidth>
                                <InputLabel>Role</InputLabel>
                                <Select
                                    value={user.role || ''}
                                    onChange={(e) => onEdit("role", e.target.value)}
                                >
                                    {roles.map((role) => (
                                        <MenuItem key={role} value={role}>
                                            {role.charAt(0).toUpperCase() + role.slice(1)}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>

                        {/* ✅ Conditional Business Name Input */}
                        {user.role === 'wholesaler' && (
                            <Grid item xs={6}>
                                <TextField
                                    label="Business Name"
                                    value={user.business || ''}
                                    onChange={(e) => onEdit("business", e.target.value)}
                                    fullWidth
                                />
                            </Grid>
                        )}

                        {/* Address Section */}
                        <Grid item xs={12}>
                            <TextField
                                label="Street"
                                value={user.address?.street || ''}
                                onChange={(e) => onEdit("address.street", e.target.value)}
                                fullWidth
                            />
                        </Grid>
                        <Grid item xs={4}>
                            <TextField
                                label="City"
                                value={user.address?.city || ''}
                                onChange={(e) => onEdit("address.city", e.target.value)}
                                fullWidth
                            />
                        </Grid>
                        <Grid item xs={4}>
                            <TextField
                                label="State"
                                value={user.address?.state || ''}
                                onChange={(e) => onEdit("address.state", e.target.value)}
                                fullWidth
                            />
                        </Grid>
                        <Grid item xs={4}>
                            <TextField
                                label="Zip Code"
                                value={user.address?.zip || ''}
                                onChange={(e) => onEdit("address.zip", e.target.value)}
                                fullWidth
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                label="Country"
                                value={user.address?.country || ''}
                                onChange={(e) => onEdit("address.country", e.target.value)}
                                fullWidth
                            />
                        </Grid>
                    </Grid>
                </Grid>
            </Grid>
        </Box>
    );
};

export default UserDetailsForm;
