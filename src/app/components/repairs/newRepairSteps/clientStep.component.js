"use client";

import * as React from 'react';
import PropTypes from 'prop-types';
import { TextField, Autocomplete, CircularProgress, Button, Box, Typography, Avatar } from '@mui/material';
import NewClientForm from '../../clients/newClientForm.component';
import UsersService from '@/services/users';

// ✅ Fetch all clients once on component load
async function fetchAllClients() {
    try {
        const response = await UsersService.getAllUsers();
        console.log("✅ All clients loaded:", response);
        if (!Array.isArray(response.users)) {
            throw new Error('Invalid data format received');
        }
        return response.users;
    } catch (error) {
        console.error('❌ Error fetching all clients:', error.response?.data || error.message);
        return [];
    }
}

export default function ClientStep({ formData, setFormData, handleNext, userID = null }) {
    const [clientOptions, setClientOptions] = React.useState([]);
    const [loading, setLoading] = React.useState(false);
    const [inputValue, setInputValue] = React.useState('');
    const [showAddClient, setShowAddClient] = React.useState(false);
    const [openModal, setOpenModal] = React.useState(false);

    // ✅ Load all clients and auto-select the provided user
    React.useEffect(() => {
        async function loadClients() {
            setLoading(true);
            const clients = await fetchAllClients();
            setClientOptions(clients);

            if (userID) {
                const selectedUser = clients.find(client => client.userID === userID);
                if (selectedUser) {
                    console.log("✅ Auto-selected User:", selectedUser);
                    setFormData(prev => ({
                        ...prev,
                        selectedClient: selectedUser,
                        userID: selectedUser.userID,
                        firstName: selectedUser.firstName,
                        lastName: selectedUser.lastName
                    }));
                    handleNext();
                } else {
                    console.warn(`⚠️ No user found for userID: ${userID}`);
                }
            }
            setLoading(false);
        }
        loadClients();
    }, [userID, setFormData, handleNext]);

    const handleClientSearch = async (event, value) => {
        setInputValue(value);
        if (value.length < 3) {
            setShowAddClient(false);
            return;
        }

        const filteredClients = clientOptions.filter(client =>
            client.firstName.toLowerCase().includes(value.toLowerCase()) ||
            client.lastName.toLowerCase().includes(value.toLowerCase()) ||
            client.userID.includes(value)
        );

        setShowAddClient(filteredClients.length === 0);
        setClientOptions(filteredClients);
    };

    const handleClientSelect = (event, newValue) => {
        const selectedClient = clientOptions.find(client => client.userID === newValue?.value);
        if (selectedClient) {
            setFormData(prev => ({
                ...prev,
                selectedClient,
                userID: selectedClient.userID,
                firstName: selectedClient.firstName,
                lastName: selectedClient.lastName
            }));
            handleNext(); 
        }
    };

    const handleAddNewClient = () => setOpenModal(true);

    const handleClientCreated = (newClient) => {
        setClientOptions(prev => [...prev, newClient]);
        setFormData(prev => ({
            ...prev,
            selectedClient: newClient,
            userID: newClient.userID,
            firstName: newClient.firstName,
            lastName: newClient.lastName
        }));
        setOpenModal(false);
        handleNext();
    };

    const clearSelectedClient = () => {
        setFormData({
            userID: '',
            firstName: '',
            lastName: '',
            selectedClient: null
        });
        setInputValue('');
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* ✅ Client Search and Selection */}
            <Autocomplete
                freeSolo
                options={clientOptions.map(client => ({
                    label: `${client.firstName} ${client.lastName} (${client.userID})`,
                    value: client.userID
                }))}
                inputValue={inputValue}
                onInputChange={handleClientSearch}
                onChange={handleClientSelect}
                loading={loading}
                isOptionEqualToValue={(option, value) => option.value === value.value}
                renderInput={(params) => (
                    <TextField
                        {...params}
                        label="Search for a Client (Name or UserID)"
                        fullWidth
                        InputProps={{
                            ...params.InputProps,
                            endAdornment: (
                                <>
                                    {loading ? <CircularProgress size={20} /> : null}
                                    {params.InputProps.endAdornment}
                                </>
                            ),
                        }}
                    />
                )}
            />

            {/* ✅ Selected Client Information Display */}
            {formData.selectedClient && (
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        padding: 2,
                        border: '1px solid #ccc',
                        borderRadius: 2,
                        boxShadow: 1,
                    }}
                >
                    <Avatar
                        alt={`${formData.selectedClient.firstName}`}
                        src={formData.selectedClient.image || '/default-avatar.png'}
                    />
                    <Box>
                        <Typography variant="h6">
                            {formData.selectedClient.firstName} {formData.selectedClient.lastName}
                        </Typography>
                        <Typography variant="body2">
                            Phone: {formData.selectedClient.phoneNumber || 'N/A'}
                        </Typography>
                    </Box>
                    <Button variant="outlined" color="secondary" onClick={clearSelectedClient}>
                        Change Client
                    </Button>
                </Box>
            )}

            {/* ✅ Add New Client Button */}
            {!formData.selectedClient && showAddClient && (
                <Button variant="contained" onClick={handleAddNewClient} fullWidth>
                    Add New Client
                </Button>
            )}

            {/* ✅ New Client Form Modal */}
            <NewClientForm
                open={openModal}
                onClose={() => setOpenModal(false)}
                onClientCreated={handleClientCreated}
            />
        </Box>
    );
}

ClientStep.propTypes = {
    formData: PropTypes.object.isRequired,
    setFormData: PropTypes.func.isRequired,
    handleNext: PropTypes.func.isRequired, 
    userID: PropTypes.string 
};
