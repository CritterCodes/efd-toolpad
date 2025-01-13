"use client";

import * as React from 'react';
import PropTypes from 'prop-types';
import { Box, TextField, Button, Typography, Modal, Avatar } from '@mui/material';
import UsersService from '@/services/users';
import User from '@/app/api/users/class';

// ✅ API call to create a new client
async function createNewClient(data) {
    try {
        const response = await UsersService.createClient(data);

        // Log full response details for debugging
        console.log('Response:', response);

        if (!response.ok) {
            const errorDetails = await response.text();
            console.error('Server Error:', errorDetails);
            throw new Error('Failed to create client');
        }

        return await response.json();
    } catch (error) {
        console.error('Error creating client:', error);
        return null;
    }
}


export default function NewClientForm({ open, onClose, onClientCreated }) {
    const [formData, setFormData] = React.useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: ''
    });
    const [imagePreview, setImagePreview] = React.useState(null);

    // ✅ Handle Image Upload
    const handleImageUpload = (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                setImagePreview(reader.result);
                setFormData((prevData) => ({ ...prevData, image: reader.result }));
            };
            reader.readAsDataURL(file);
        }
    };

    // ✅ Handle Form Submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        const newClient = await createNewClient(formData);
        if (newClient) {
            onClientCreated(newClient);
            onClose();
        }
    };

    return (
        <Modal open={open} onClose={onClose}>
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
                    width: '90%',
                    maxWidth: 400,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                }}
            >

                {/* ✅ Form Section */}
                <form onSubmit={handleSubmit} style={{ width: '100%' }}>
                    <TextField
                        label="First Name"
                        name="firstName"
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        fullWidth
                        required
                        margin="dense"
                    />
                    <TextField
                        label="Last Name"
                        name="lastName"
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        fullWidth
                        required
                        margin="dense"
                    />
                    <TextField
                        label="Email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        fullWidth
                        required
                        margin="dense"
                    />
                    <TextField
                        label="Phone"
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        fullWidth
                        required
                        margin="dense"
                    />
                    {/* ✅ Submit Button */}
                    <Button
                        type="submit"
                        variant="contained"
                        fullWidth
                        sx={{ mt: 2 }}
                    >
                        Submit
                    </Button>
                </form>
            </Box>
        </Modal>
    );
}

NewClientForm.propTypes = {
    open: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onClientCreated: PropTypes.func.isRequired,
};
