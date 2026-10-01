"use client";
import React, { useState, useEffect } from 'react';
import RepairsGrid from '@/app/components/repairs/repairGrid';
import RepairFilters from '@/app/components/repairs/filters.component';
import { useRouter } from 'next/navigation';
import { useRepairs } from '@/app/context/repairs.context';
import { Box } from '@mui/material';

const normalizeIdentifier = (value) => {
    if (!value) return '';
    if (typeof value === 'object') {
        if (value.$oid) return String(value.$oid);
        if (value._id) return normalizeIdentifier(value._id);
    }
    return String(value).trim();
};

const uniqueIdentifiers = (values) => [...new Set(values.map(normalizeIdentifier).filter(Boolean))];

const getClientIdentifiers = (userID, user) => uniqueIdentifiers([
    userID,
    user?.userID,
    user?._id,
    user?.id,
    user?.email,
]);

const repairBelongsToClient = (repair, clientIdentifiers) => {
    if (!repair || clientIdentifiers.length === 0) return false;

    const repairIdentifiers = uniqueIdentifiers([
        repair.userID,
        repair.clientID,
        repair.clientId,
        repair.customerID,
        repair.customerId,
        repair.client?._id,
        repair.client?.id,
        repair.client?.userID,
        repair.clientEmail,
        repair.email,
    ]);

    return repairIdentifiers.some((identifier) => clientIdentifiers.includes(identifier));
};

const ClientRepairsTab = ({ userID, user }) => {
    const { repairs } = useRepairs();
    const router = useRouter();
    const [filteredRepairs, setFilteredRepairs] = useState([]);
    const [statusFilter, setStatusFilter] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOrder, setSortOrder] = useState('newest');
    const [page] = useState(1);
    const rowsPerPage = 6;

    useEffect(() => {
        console.log("✅ Repairs in context:", repairs);
        console.log("✅ Filtering for userID:", userID);

        // ✅ Filter repairs by userID
        const clientIdentifiers = getClientIdentifiers(userID, user);
        let updatedRepairs = repairs.filter(repair => {
            const match = repairBelongsToClient(repair, clientIdentifiers);
            if (!match) {
                console.log(`❌ Repair filtered out - ID: ${repair.repairID}, userID: ${repair.userID}`);
            }
            return match;
        });

        console.log("✅ Repairs after userID filter:", updatedRepairs);

        // ✅ Apply status filter
        if (statusFilter) {
            updatedRepairs = updatedRepairs.filter(repair => repair.status === statusFilter);
            console.log("✅ Repairs after status filter:", updatedRepairs);
        }

        // ✅ Apply search query filter
        if (searchQuery) {
            updatedRepairs = updatedRepairs.filter(repair =>
                (repair.clientName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (repair.description || '').toLowerCase().includes(searchQuery.toLowerCase())
            );
            console.log("✅ Repairs after search query filter:", updatedRepairs);
        }

        // ✅ Sort repairs
        updatedRepairs.sort((a, b) => {
            const dateA = new Date(a.promiseDate || a.createdAt);
            const dateB = new Date(b.promiseDate || b.createdAt);
            return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
        });

        console.log("✅ Repairs after sorting:", updatedRepairs);
        setFilteredRepairs(updatedRepairs);
    }, [repairs, statusFilter, searchQuery, sortOrder, userID, user]);

    return (
        <Box>
            {/* Repair Filters for Search, Sorting, and Adding New Repairs */}
            <RepairFilters
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                sortOrder={sortOrder}
                setSortOrder={setSortOrder}
                // THE intake, preset to this client — one intake, one pricing engine.
                onOpenNewRepair={() => router.push(`/dashboard/repairs/new?clientID=${encodeURIComponent(user?.userID || userID)}`)}
            />

            {/* Logging repairs before rendering */}
            {console.log("🔍 Repairs Being Rendered:", filteredRepairs)}

            {/* Repairs Grid with Pagination */}
            <RepairsGrid
                repairs={filteredRepairs.slice((page - 1) * rowsPerPage, page * rowsPerPage)}
            />

        </Box>
    );
};

export default ClientRepairsTab;
