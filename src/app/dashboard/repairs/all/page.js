"use client";
import React, { useState, useEffect } from 'react';
import RepairsGrid from '@/app/components/repairs/repairGrid';
import RepairFilters from '@/app/components/repairs/filters.component';
import NewRepairStepper from '@/app/components/repairs/newRepairStepper.component';
import { useRepairs } from '@/app/context/repairs.context';
import { PageContainer } from '@toolpad/core/PageContainer';
import { useSearchParams } from 'next/navigation';

const RepairsPage = () => {
    const { repairs, setRepairs, loading } = useRepairs();
    const [open, setOpen] = useState(false);
    const [filteredRepairs, setFilteredRepairs] = useState(repairs);
    const [statusFilter, setStatusFilter] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOrder, setSortOrder] = useState('newest');
    const [page, setPage] = useState(1);
    const rowsPerPage = 6;
    const searchParams = useSearchParams(); // ✅ Using searchParams to access the query

    useEffect(() => {
        // ✅ Open the New Repair Stepper if 'newRepair=true' is present in the URL
        if (searchParams.get('newRepair') === 'true') {
            setOpen(true);
        }
    }, [searchParams]);

    useEffect(() => {
        if (!loading) {
            let updatedRepairs = [...repairs];

            // ✅ Apply status filter
            if (statusFilter) {
                updatedRepairs = updatedRepairs.filter(repair => repair.status === statusFilter);
            }

            // ✅ Apply search filter
            if (searchQuery) {
                updatedRepairs = updatedRepairs.filter(repair =>
                    repair.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    repair.description.toLowerCase().includes(searchQuery.toLowerCase())
                );
            }

            // ✅ Apply sorting
            updatedRepairs.sort((a, b) => {
                const dateA = new Date(a.promiseDate || a.createdAt);
                const dateB = new Date(b.promiseDate || b.createdAt);
                return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
            });

            setFilteredRepairs(updatedRepairs);
        }
    }, [statusFilter, searchQuery, repairs, sortOrder, loading]);

    const handleNewRepair = (newRepair) => {
        setRepairs((prev) => [...prev, newRepair]);
        setFilteredRepairs((prevFiltered) => [...prevFiltered, newRepair]);
    };

    return (
        <PageContainer
            title="Repairs"
            breadcrumbs={[
                { title: 'Dashboard', path: '/dashboard' },
                { title: 'Repairs', path: '/repairs' }
            ]}
        >
            {/* ✅ Repair Filters */}
            <RepairFilters
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                sortOrder={sortOrder}
                setSortOrder={setSortOrder}
                onOpenNewRepair={() => setOpen(true)}
            />

            {/* ✅ Repairs Grid with Pagination and Filtering Applied */}
            <RepairsGrid
                repairs={filteredRepairs.slice((page - 1) * rowsPerPage, page * rowsPerPage)}
            />

            {/* ✅ New Repair Stepper Modal */}
            <NewRepairStepper
                open={open}
                onClose={() => setOpen(false)}
                onSubmit={handleNewRepair}
            />
        </PageContainer>
    );
};

export default RepairsPage;
