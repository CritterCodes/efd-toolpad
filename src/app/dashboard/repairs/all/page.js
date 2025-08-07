"use client";
import React, { useState, useEffect } from 'react';
import RepairsGrid from '@/app/components/repairs/repairGrid';
import RepairFilters from '@/app/components/repairs/filters.component';
import { useRepairs } from '@/app/context/repairs.context';
import { PageContainer } from '@toolpad/core/PageContainer';
import { useSearchParams, useRouter } from 'next/navigation';

const RepairsPage = () => {
    const { repairs, setRepairs, loading } = useRepairs();
    const [filteredRepairs, setFilteredRepairs] = useState(repairs);
    const [statusFilter, setStatusFilter] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOrder, setSortOrder] = useState('newest');
    const [page, setPage] = useState(1); // Keep page state here
    const rowsPerPage = 6;
    const searchParams = useSearchParams();
    const router = useRouter();

    useEffect(() => {
        // Redirect to new repair page if newRepair=true is in URL
        if (searchParams.get('newRepair') === 'true') {
            router.push('/dashboard/repairs/new');
        }
    }, [searchParams, router]);

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
            setPage(1); // Reset to first page on filter change
        }
    }, [statusFilter, searchQuery, repairs, sortOrder, loading]);

    const handleNewRepair = () => {
        // Navigate to new repair page
        router.push('/dashboard/repairs/new');
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
                onOpenNewRepair={handleNewRepair}
            />

            {/* ✅ Repairs Grid with Pagination Handled Internally */}
            <RepairsGrid
                repairs={filteredRepairs}
                rowsPerPage={rowsPerPage}
                page={page}
                setPage={setPage}
            />
        </PageContainer>
    );
};

export default RepairsPage;
