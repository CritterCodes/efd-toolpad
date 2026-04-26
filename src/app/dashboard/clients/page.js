"use client";
import React, { useState, useEffect } from 'react';
import {
    Box, Pagination, Typography, Button, TextField, InputAdornment, IconButton
} from '@mui/material';
import {
    Add as AddIcon,
    Search as SearchIcon,
    Sort as SortIcon,
    Group as ClientsIcon
} from '@mui/icons-material';
import NewClientForm from '@/app/components/clients/newClientForm.component';
import ClientCardGrid from '@/app/components/clients/cardGrid';
import { useRouter } from 'next/navigation';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';

const ClientsPage = () => {
    const [clients, setClients] = useState([]);
    const [filteredClients, setFilteredClients] = useState([]);
    const [openNewClientModal, setOpenNewClientModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOrder, setSortOrder] = useState('asc');
    const [page, setPage] = useState(1);
    const rowsPerPage = 9;
    const router = useRouter();

    const fetchClients = async () => {
        try {
            const response = await fetch('/api/users?role=customer');
            const data = await response.json();
            const users = data.data || data.users || [];
            setClients(users);
            setFilteredClients(users);
        } catch (error) {
            console.error("Failed to fetch clients:", error);
        }
    };

    useEffect(() => { fetchClients(); }, []);

    const handleClientCreated = (newClient) => {
        setClients((prev) => [...prev, newClient]);
        setFilteredClients((prev) => [...prev, newClient]);
    };

    const handleOpenProfile = (userID) => {
        router.push(`/dashboard/clients/${userID}`);
    };

    const handleSearch = (event) => {
        const query = event.target.value.toLowerCase();
        setSearchQuery(query);
        setFilteredClients(clients.filter((client) =>
            client.firstName.toLowerCase().includes(query) ||
            client.lastName.toLowerCase().includes(query) ||
            client.email.toLowerCase().includes(query)
        ));
        setPage(1);
    };

    const handleSort = () => {
        const order = sortOrder === 'asc' ? 'desc' : 'asc';
        setSortOrder(order);
        setFilteredClients(prev =>
            [...prev].sort((a, b) => a.firstName.localeCompare(b.firstName) * (order === 'asc' ? 1 : -1))
        );
    };

    return (
        <Box sx={{ pb: 10, position: 'relative' }}>
            <Box
                sx={{
                    backgroundColor: { xs: 'transparent', sm: REPAIRS_UI.bgPanel },
                    border: { xs: 'none', sm: `1px solid ${REPAIRS_UI.border}` },
                    borderRadius: { xs: 0, sm: 3 },
                    boxShadow: { xs: 'none', sm: REPAIRS_UI.shadow },
                    p: { xs: 0.5, sm: 2.5, md: 3 },
                    mb: 3
                }}
            >
                <Box sx={{ maxWidth: 920, mb: 2 }}>
                    <Typography
                        sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 1,
                            px: 1.25,
                            py: 0.5,
                            mb: 1.5,
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            letterSpacing: '0.08em',
                            color: REPAIRS_UI.textPrimary,
                            backgroundColor: REPAIRS_UI.bgCard,
                            border: `1px solid ${REPAIRS_UI.border}`,
                            borderRadius: 2,
                            textTransform: 'uppercase'
                        }}
                    >
                        <ClientsIcon sx={{ fontSize: 16, color: REPAIRS_UI.accent }} />
                        Client roster
                    </Typography>

                    <Typography sx={{ fontSize: { xs: 28, md: 36 }, fontWeight: 600, color: REPAIRS_UI.textHeader, mb: 1 }}>
                        Client Management
                    </Typography>
                    <Typography sx={{ color: REPAIRS_UI.textSecondary, lineHeight: 1.6 }}>
                        {clients.length} client{clients.length !== 1 ? 's' : ''} registered.
                    </Typography>
                </Box>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
                    <Button
                        variant="outlined"
                        startIcon={<AddIcon />}
                        onClick={() => setOpenNewClientModal(true)}
                        sx={{ color: REPAIRS_UI.textPrimary, borderColor: REPAIRS_UI.border, backgroundColor: REPAIRS_UI.bgCard }}
                    >
                        Add Client
                    </Button>
                    <TextField
                        placeholder="Search clients..."
                        size="small"
                        value={searchQuery}
                        onChange={handleSearch}
                        InputProps={{
                            startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: REPAIRS_UI.textMuted }} /></InputAdornment>,
                        }}
                        sx={{ minWidth: 220 }}
                    />
                    <IconButton
                        onClick={handleSort}
                        size="small"
                        sx={{ color: REPAIRS_UI.textSecondary, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 1.5, backgroundColor: REPAIRS_UI.bgCard }}
                    >
                        <SortIcon fontSize="small" />
                    </IconButton>
                </Box>
            </Box>

            <ClientCardGrid
                clients={filteredClients.slice((page - 1) * rowsPerPage, page * rowsPerPage)}
                onCardClick={handleOpenProfile}
            />

            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                <Pagination
                    count={Math.ceil(filteredClients.length / rowsPerPage)}
                    page={page}
                    onChange={(e, value) => setPage(value)}
                    sx={{
                        '& .MuiPaginationItem-root': { color: REPAIRS_UI.textPrimary, borderColor: REPAIRS_UI.border },
                        '& .Mui-selected': { backgroundColor: `${REPAIRS_UI.bgCard} !important`, borderColor: `${REPAIRS_UI.accent} !important` }
                    }}
                />
            </Box>

            <NewClientForm
                open={openNewClientModal}
                onClose={() => setOpenNewClientModal(false)}
                onClientCreated={handleClientCreated}
            />
        </Box>
    );
};

export default ClientsPage;
