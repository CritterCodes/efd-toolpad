"use client";
import React, { useState, useEffect } from 'react';
import RepairsGrid from '@/app/components/repairs/repairGrid';
import RepairFilters from '@/app/components/repairs/filters.component';
import NewRepairStepper from '@/app/components/repairs/newRepairStepper.component';
import { useRepairs } from '@/app/context/repairs.context';
import { Box, Pagination } from '@mui/material';

const ClientRepairsTab = ({ userID }) => {
    const { repairs, setRepairs } = useRepairs();
    const [filteredRepairs, setFilteredRepairs] = useState([]);
    const [statusFilter, setStatusFilter] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOrder, setSortOrder] = useState('newest');
    const [page, setPage] = useState(1);
    const rowsPerPage = 6;
    const [open, setOpen] = useState(false);

    useEffect(() => {
        console.log("✅ Repairs in context:", repairs);
        console.log("✅ Filtering for userID:", userID);

        // ✅ Filter repairs by userID
        let updatedRepairs = repairs.filter(repair => {
            const match = repair.userID === userID;
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
                repair.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                repair.description.toLowerCase().includes(searchQuery.toLowerCase())
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
    }, [repairs, statusFilter, searchQuery, sortOrder, userID]);

    const handleNewRepair = (newRepair) => {
        console.log("🆕 New Repair Added:", newRepair);
        setRepairs((prev) => [...prev, newRepair]);
        setFilteredRepairs((prevFiltered) => [...prevFiltered, newRepair]);
    };

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
                onOpenNewRepair={() => setOpen(true)}
            />

            {/* Logging repairs before rendering */}
            {console.log("🔍 Repairs Being Rendered:", filteredRepairs)}

            {/* Repairs Grid with Pagination */}
            <RepairsGrid
                repairs={filteredRepairs.slice((page - 1) * rowsPerPage, page * rowsPerPage)}
            />

            {/* New Repair Stepper for Creating Repairs */}
            <NewRepairStepper
                open={open}
                onClose={() => setOpen(false)}
                onSubmit={handleNewRepair}
                userID={userID}
            />
        </Box>
    );
};

export default ClientRepairsTab;
