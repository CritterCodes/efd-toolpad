"use client";
import React, { useState } from "react";
import { Box, Typography, Container, Button, Modal, TextField } from "@mui/material";
import { signIn } from "next-auth/react";

const CreateAccountModal = ({ open, onClose }) => {
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        confirmPassword: ""
    });
    const [error, setError] = useState("");

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleCreateAccount = async () => {
        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error("Failed to create account");
            }

            const result = await response.json();
            alert("Account created successfully. Please verify your email.");
            onClose(); // Close the modal after successful creation
        } catch (error) {
            setError(error.message);
        }
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            aria-labelledby="create-account-modal-title"
            aria-describedby="create-account-modal-description"
        >
            <Box
                sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    bgcolor: 'background.paper',
                    boxShadow: 24,
                    p: 4,
                    borderRadius: 2,
                    maxWidth: 400
                }}
            >
                <Typography variant="h5" id="create-account-modal-title" mb={2}>
                    Create a New Account
                </Typography>

                <TextField
                    fullWidth
                    margin="normal"
                    label="First Name"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                />
                <TextField
                    fullWidth
                    margin="normal"
                    label="Last Name"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                />
                <TextField
                    fullWidth
                    margin="normal"
                    label="Email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                />
                <TextField
                    fullWidth
                    margin="normal"
                    label="Password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleInputChange}
                />
                <TextField
                    fullWidth
                    margin="normal"
                    label="Confirm Password"
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                />

                {error && <Typography color="error" mt={1}>{error}</Typography>}

                <Button
                    fullWidth
                    variant="contained"
                    onClick={handleCreateAccount}
                    sx={{ mt: 2 }}
                >
                    Create Account
                </Button>
            </Box>
        </Modal>
    );
};

export default CreateAccountModal;
