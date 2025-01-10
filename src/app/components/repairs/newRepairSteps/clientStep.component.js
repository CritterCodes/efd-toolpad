"use client";

import * as React from 'react';
import PropTypes from 'prop-types';
import { TextField, Autocomplete, CircularProgress, Button, Box, Typography, Avatar } from '@mui/material';
import NewClientForm from '../../clients/newClientForm.component';

// ✅ Fetch clients API call
async function fetchClients(query) {
    try {
        const response = await fetch(`/api/users?query=${query}`);
        if (!response.ok) throw new Error('Failed to fetch clients');
        return await response.json();
    } catch (error) {
        console.error('Error fetching clients:', error);
        return [];
    }
}

export default function ClientStep({ formData, setFormData }) {
    const [clientOptions, setClientOptions] = React.useState([]);
    const [loading, setLoading] = React.useState(false);
    const [inputValue, setInputValue] = React.useState("");
    const [showAddClient, setShowAddClient] = React.useState(false);
    const [openModal, setOpenModal] = React.useState(false);

    // ✅ Fetch clients based on search
    const handleClientSearch = async (event, value) => {
        setInputValue(value);
        if (value.length > 2) {
            setLoading(true);
            try {
                const results = await fetchClients(value);
                setClientOptions(results);
                setShowAddClient(results.length === 0);
            } catch (error) {
                setClientOptions([]);
                setShowAddClient(true);
            } finally {
                setLoading(false);
            }
        } else {
            setClientOptions([]);
            setShowAddClient(false);
        }
    };

    // ✅ Handle Client Selection and Ensure Proper Data Storage
    const handleClientSelect = (event, newValue) => {
        if (newValue && newValue.value) {
            const selectedClient = clientOptions.find(client => client.userID === newValue.value);
            if (selectedClient) {
                setFormData((prev) => ({
                    ...prev,
                    selectedClient,
                    userID: selectedClient.userID,
                    firstName: selectedClient.firstName,
                    lastName: selectedClient.lastName
                }));
            }
        }
    };

    // ✅ Handle Adding a New Client
    const handleAddNewClient = () => {
        setOpenModal(true);
    };

    // ✅ Handle New Client Created and Select
    const handleClientCreated = (newClient) => {
        setClientOptions((prev) => [...prev, newClient]);
        setFormData((prev) => ({
            ...prev,
            selectedClient: newClient,
            userID: newClient.userID,
            firstName: newClient.firstName,
            lastName: newClient.lastName
        }));
        setOpenModal(false);
    };

    // ✅ Clear Selected Client and Reset Form
    const clearSelectedClient = () => {
        setFormData((prev) => ({
            ...prev,
            selectedClient: null,
            userID: "",
            firstName: "",
            lastName: ""
        }));
        setInputValue("");
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* ✅ Client Search and Selection */}
            <Autocomplete
                freeSolo
                options={clientOptions.map(client => ({
                    label: `${client.firstName} ${client.lastName}`,
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
                        label="Search for a Client"
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

            {/* ✅ Display Selected Client Information */}
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
                        src={formData.selectedClient.profilePicture || '/default-avatar.png'}
                    />
                    <Box>
                        <Typography variant="h6">{formData.selectedClient.firstName} {formData.selectedClient.lastName}</Typography>
                        <Typography variant="body2">Phone: {formData.selectedClient.phoneNumber || 'N/A'}</Typography>
                    </Box>
                    <Button variant="outlined" color="secondary" onClick={clearSelectedClient}>
                        Change Client
                    </Button>
                </Box>
            )}

            {/* ✅ Show 'Add New Client' Button if No Results and No Client Selected */}
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
};
