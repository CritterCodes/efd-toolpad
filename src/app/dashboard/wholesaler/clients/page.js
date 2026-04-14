'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Button, Paper, TextField,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Dialog, DialogTitle, DialogContent, DialogActions,
    CircularProgress, Alert, Snackbar, IconButton
} from '@mui/material';
import {
    Add as AddIcon, Refresh as RefreshIcon,
    Edit as EditIcon, Phone as PhoneIcon, Email as EmailIcon
} from '@mui/icons-material';
import { wholesaleClientsAPIClient } from '@/api-clients/wholesaleClients.client';

export default function WholesalerClientsPage() {
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [editingClient, setEditingClient] = useState(null);
    const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', phoneNumber: '', business: '' });
    const [formErrors, setFormErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    const loadClients = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await wholesaleClientsAPIClient.fetchMyClients();
            setClients(data.data || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadClients(); }, [loadClients]);

    const openCreateForm = () => {
        setEditingClient(null);
        setFormData({ firstName: '', lastName: '', email: '', phoneNumber: '', business: '' });
        setFormErrors({});
        setShowForm(true);
    };

    const openEditForm = (client) => {
        setEditingClient(client);
        setFormData({
            firstName: client.firstName || '',
            lastName: client.lastName || '',
            email: client.email || '',
            phoneNumber: client.phoneNumber || '',
            business: client.business || ''
        });
        setFormErrors({});
        setShowForm(true);
    };

    const validateForm = () => {
        const errors = {};
        if (!formData.firstName.trim()) errors.firstName = 'First name is required';
        if (!formData.lastName.trim()) errors.lastName = 'Last name is required';
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;
        setSubmitting(true);
        try {
            if (editingClient) {
                await wholesaleClientsAPIClient.updateClient(editingClient.clientID, formData);
                setSnackbar({ open: true, message: 'Client updated!', severity: 'success' });
            } else {
                await wholesaleClientsAPIClient.createClient(formData);
                setSnackbar({ open: true, message: 'Client created!', severity: 'success' });
            }
            setShowForm(false);
            await loadClients();
        } catch (err) {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4">My Clients</Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button startIcon={<RefreshIcon />} onClick={loadClients} disabled={loading}>Refresh</Button>
                    <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateForm}>
                        Add Client
                    </Button>
                </Box>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
            ) : clients.length === 0 ? (
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                    <Typography color="text.secondary" sx={{ mb: 2 }}>
                        No clients yet. Add your first client to get started.
                    </Typography>
                    <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateForm}>
                        Add Client
                    </Button>
                </Paper>
            ) : (
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Name</TableCell>
                                <TableCell>Email</TableCell>
                                <TableCell>Phone</TableCell>
                                <TableCell>Business</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {clients.map(client => (
                                <TableRow key={client.clientID || client.userID} hover>
                                    <TableCell sx={{ fontWeight: 500 }}>
                                        {client.fullName || `${client.firstName} ${client.lastName}`}
                                    </TableCell>
                                    <TableCell>{client.email || '—'}</TableCell>
                                    <TableCell>{client.phoneNumber || '—'}</TableCell>
                                    <TableCell>{client.business || '—'}</TableCell>
                                    <TableCell align="right">
                                        <IconButton size="small" onClick={() => openEditForm(client)}>
                                            <EditIcon fontSize="small" />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* Create/Edit Dialog */}
            <Dialog open={showForm} onClose={() => setShowForm(false)} maxWidth="sm" fullWidth>
                <DialogTitle>{editingClient ? 'Edit Client' : 'Add New Client'}</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <TextField
                                label="First Name" required fullWidth
                                value={formData.firstName}
                                onChange={(e) => setFormData(p => ({ ...p, firstName: e.target.value }))}
                                error={!!formErrors.firstName} helperText={formErrors.firstName}
                            />
                            <TextField
                                label="Last Name" required fullWidth
                                value={formData.lastName}
                                onChange={(e) => setFormData(p => ({ ...p, lastName: e.target.value }))}
                                error={!!formErrors.lastName} helperText={formErrors.lastName}
                            />
                        </Box>
                        <TextField
                            label="Email" type="email" fullWidth
                            value={formData.email}
                            onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
                        />
                        <TextField
                            label="Phone" fullWidth
                            value={formData.phoneNumber}
                            onChange={(e) => setFormData(p => ({ ...p, phoneNumber: e.target.value }))}
                        />
                        <TextField
                            label="Business Name" fullWidth
                            value={formData.business}
                            onChange={(e) => setFormData(p => ({ ...p, business: e.target.value }))}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowForm(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSubmit} disabled={submitting}>
                        {submitting ? <CircularProgress size={20} /> : editingClient ? 'Update' : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar(p => ({ ...p, open: false }))}>
                <Alert severity={snackbar.severity} onClose={() => setSnackbar(p => ({ ...p, open: false }))}>{snackbar.message}</Alert>
            </Snackbar>
        </Box>
    );
}
