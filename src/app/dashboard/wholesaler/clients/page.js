'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Button, TextField,
    Table, TableBody, TableCell, TableHead, TableRow,
    Dialog, DialogTitle, DialogContent, DialogActions,
    CircularProgress, Alert, Snackbar, IconButton
} from '@mui/material';
import {
    Add as AddIcon, Refresh as RefreshIcon, Edit as EditIcon, People as PeopleIcon
} from '@mui/icons-material';
import { wholesaleClientsAPIClient } from '@/api-clients/wholesaleClients.client';
import { REPAIRS_UI as UI } from '@/app/dashboard/repairs/components/repairsUi';

const TH = ({ children, align }) => (
    <TableCell align={align} sx={{ color: UI.textMuted, fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: `1px solid ${UI.border}`, backgroundColor: UI.bgTertiary }}>
        {children}
    </TableCell>
);

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
        <Box sx={{ pb: 10 }}>
            {/* Header */}
            <Box
                sx={{
                    backgroundColor: { xs: 'transparent', sm: UI.bgPanel },
                    border: { xs: 'none', sm: `1px solid ${UI.border}` },
                    borderRadius: { xs: 0, sm: 3 },
                    boxShadow: { xs: 'none', sm: UI.shadow },
                    p: { xs: 0.5, sm: 2.5, md: 3 },
                    mb: 3,
                }}
            >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2, mb: 1 }}>
                    <Box>
                        <Typography
                            sx={{
                                display: 'inline-flex', alignItems: 'center', gap: 1,
                                px: 1.25, py: 0.5, mb: 1.5,
                                fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em',
                                color: UI.textPrimary, backgroundColor: UI.bgCard,
                                border: `1px solid ${UI.border}`, borderRadius: 2, textTransform: 'uppercase',
                            }}
                        >
                            <PeopleIcon sx={{ fontSize: 16, color: UI.accent }} />
                            Wholesale
                        </Typography>
                        <Typography sx={{ fontSize: { xs: 28, md: 36 }, fontWeight: 600, color: UI.textHeader, mb: 1 }}>
                            My Clients
                        </Typography>
                        <Typography sx={{ color: UI.textSecondary, lineHeight: 1.6 }}>
                            Manage the clients associated with your wholesale account.
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                            variant="outlined"
                            startIcon={<RefreshIcon />}
                            onClick={loadClients}
                            disabled={loading}
                            sx={{ color: UI.textPrimary, borderColor: UI.border, backgroundColor: UI.bgCard }}
                        >
                            Refresh
                        </Button>
                        <Button
                            variant="outlined"
                            startIcon={<AddIcon />}
                            onClick={openCreateForm}
                            sx={{ color: UI.accent, borderColor: UI.accent, backgroundColor: UI.bgCard }}
                        >
                            Add Client
                        </Button>
                    </Box>
                </Box>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress sx={{ color: UI.accent }} />
                </Box>
            ) : clients.length === 0 ? (
                <Box sx={{ p: 4, textAlign: 'center', border: `1px solid ${UI.border}`, borderRadius: 2, backgroundColor: UI.bgCard }}>
                    <Typography sx={{ color: UI.textSecondary, mb: 2 }}>
                        No clients yet. Add your first client to get started.
                    </Typography>
                    <Button
                        variant="outlined"
                        startIcon={<AddIcon />}
                        onClick={openCreateForm}
                        sx={{ color: UI.accent, borderColor: UI.accent, backgroundColor: UI.bgCard }}
                    >
                        Add Client
                    </Button>
                </Box>
            ) : (
                <Box sx={{ border: `1px solid ${UI.border}`, borderRadius: 2, overflow: 'hidden' }}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TH>Name</TH>
                                <TH>Email</TH>
                                <TH>Phone</TH>
                                <TH>Business</TH>
                                <TH align="right">Actions</TH>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {clients.map(client => (
                                <TableRow
                                    key={client.clientID || client.userID}
                                    sx={{
                                        backgroundColor: UI.bgCard,
                                        '&:hover': { backgroundColor: UI.bgTertiary },
                                        '&:not(:last-child) td': { borderBottom: `1px solid ${UI.border}` },
                                        '&:last-child td': { borderBottom: 'none' },
                                    }}
                                >
                                    <TableCell sx={{ fontWeight: 500, color: UI.textPrimary }}>
                                        {client.fullName || `${client.firstName} ${client.lastName}`}
                                    </TableCell>
                                    <TableCell sx={{ color: UI.textSecondary }}>{client.email || '—'}</TableCell>
                                    <TableCell sx={{ color: UI.textSecondary }}>{client.phoneNumber || '—'}</TableCell>
                                    <TableCell sx={{ color: UI.textSecondary }}>{client.business || '—'}</TableCell>
                                    <TableCell align="right">
                                        <IconButton size="small" onClick={() => openEditForm(client)} sx={{ color: UI.textMuted }}>
                                            <EditIcon fontSize="small" />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Box>
            )}

            {/* Create/Edit Dialog */}
            <Dialog
                open={showForm}
                onClose={() => setShowForm(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{ sx: { backgroundColor: UI.bgPanel, border: `1px solid ${UI.border}` } }}
            >
                <DialogTitle sx={{ color: UI.textHeader }}>{editingClient ? 'Edit Client' : 'Add New Client'}</DialogTitle>
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
