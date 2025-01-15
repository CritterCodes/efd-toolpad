"use client";

import * as React from 'react';
import PropTypes from 'prop-types';
import { Box, TextField, Button, Typography, Modal, Avatar, MenuItem } from '@mui/material';
import UsersService from '@/services/users';

// ✅ API call to create a new client
async function createNewClient(data) {
    try {
        const response = await UsersService.createUser(data);
        console.log('New client created:', response);
        return await response;
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
        phone: '',
        role: 'client', // ✅ Default role set to 'client'
        business: '',
        image: ''
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
        
        // ✅ Prevent sending business if not a wholesaler
        const submissionData = { ...formData };
        if (formData.role !== "wholesaler") {
            delete submissionData.business;
        }

        const newClient = await createNewClient(submissionData);
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
                {/* ✅ Centered Image Upload */}
                <label htmlFor="upload-button">
                    <input
                        type="file"
                        id="upload-button"
                        hidden
                        onChange={handleImageUpload}
                    />
                    <Avatar
                        src={imagePreview || '/default-avatar.png'}
                        sx={{ width: 100, height: 100, cursor: 'pointer' }}
                    />
                    <Typography variant="body2" sx={{ mt: 1 }}>
                        {imagePreview ? "Change Photo" : "Upload Photo (Optional)"}
                    </Typography>
                </label>

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

                    {/* ✅ Role Dropdown */}
                    <TextField
                        select
                        label="Role"
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        fullWidth
                        required
                        margin="dense"
                    >
                        <MenuItem value="client">Client</MenuItem>
                        <MenuItem value="wholesaler">Wholesaler</MenuItem>
                        <MenuItem value="admin">Admin</MenuItem>
                    </TextField>

                    {/* ✅ Business Field - Only visible for wholesalers */}
                    {formData.role === "wholesaler" && (
                        <TextField
                            label="Business Name"
                            name="business"
                            value={formData.business}
                            onChange={(e) => setFormData({ ...formData, business: e.target.value })}
                            fullWidth
                            required
                            margin="dense"
                        />
                    )}

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
