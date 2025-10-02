"use client";
import React, { useState, useEffect } from 'react';
import { Box, Pagination, Breadcrumbs, Link, Typography } from '@mui/material';
import NewClientForm from '@/app/components/clients/newClientForm.component';
import ClientCardGrid from '@/app/components/clients/cardGrid';
import ClientHeader from '@/app/components/clients/header';
import UsersService from '@/services/users';
import { useRouter } from 'next/navigation';

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
            // Fetch only users with 'client' role
            const response = await fetch('/api/users?role=client');
            const data = await response.json();
            setClients(data.users || []);
            setFilteredClients(data.users || []);
        } catch (error) {
            console.error("Failed to fetch clients:", error);
        }
    };

    useEffect(() => {
        fetchClients();
    }, []);

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
        const filtered = clients.filter((client) =>
            client.firstName.toLowerCase().includes(query) ||
            client.lastName.toLowerCase().includes(query) ||
            client.email.toLowerCase().includes(query)
        );
        setFilteredClients(filtered);
    };

    const handleSort = () => {
        const order = sortOrder === 'asc' ? 'desc' : 'asc';
        const sortedClients = [...filteredClients].sort((a, b) =>
            a.firstName.localeCompare(b.firstName) * (order === 'asc' ? 1 : -1)
        );
        setSortOrder(order);
        setFilteredClients(sortedClients);
    };

    const handlePageChange = (event, value) => {
        setPage(value);
    };

    return (
        <Box sx={{ padding: 3 }}>
            {/* ✅ Breadcrumbs Section */}
            <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
                <Link
                    underline="hover"
                    color="inherit"
                    onClick={() => router.push('/dashboard')}
                    sx={{ cursor: 'pointer' }}
                >
                    Dashboard
                </Link>
                <Typography color="text.primary">Clients</Typography>
            </Breadcrumbs>

            {/* ✅ Client Header Component (Replaced Inline Controls) */}
            <ClientHeader
                searchQuery={searchQuery}
                handleSearch={handleSearch}
                handleSort={handleSort}
                onAddClient={() => setOpenNewClientModal(true)}
            />

            {/* ✅ Client Card Grid Component Call */}
            <ClientCardGrid
                clients={filteredClients.slice((page - 1) * rowsPerPage, page * rowsPerPage)}
                onCardClick={handleOpenProfile}
            />

            {/* ✅ Pagination Section */}
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                <Pagination
                    count={Math.ceil(filteredClients.length / rowsPerPage)}
                    page={page}
                    onChange={handlePageChange}
                    color="primary"
                />
            </Box>

            {/* ✅ New Client Modal */}
            <NewClientForm
                open={openNewClientModal}
                onClose={() => setOpenNewClientModal(false)}
                onClientCreated={handleClientCreated}
            />
        </Box>
    );
};

export default ClientsPage;
