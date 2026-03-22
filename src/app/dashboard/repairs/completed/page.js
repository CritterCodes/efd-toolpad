'use client';

import React from 'react';
import {
    Box,
    Typography,
    Button,
    Breadcrumbs,
    Link,
    useTheme,
    useMediaQuery
} from '@mui/material';
import { Add as AddIcon, CheckCircle as CompletedIcon } from '@mui/icons-material';
import { useRouter } from 'next/navigation';

import { useCompletedRepairs } from '@/hooks/repairs/useCompletedRepairs';
import { 
    StatsCards,
    CompletedRepairsFilters,
    CompletedRepairsGrid,
    CompletedRepairsTable,
    EmptyState 
} from './components';

const CompletedRepairsPage = () => {
    const router = useRouter();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const {
        repairs,
        allCompletedRepairs,
        loading,
        searchQuery,
        setSearchQuery,
        statusFilter,
        setStatusFilter,
        sortOption,
        setSortOption,
        viewMode,
        setViewMode,
        expandedRows,
        toggleRowExpansion
    } = useCompletedRepairs();

    const handleViewRepair = (repairId) => router.push(`/dashboard/repairs/${repairId}`);
    const handleCreateRepair = () => router.push('/dashboard/repairs/new');

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <Typography>Loading completed repairs...</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ p: isMobile ? 2 : 3 }}>
            <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
                <Link
                    underline="hover"
                    color="inherit"
                    onClick={() => router.push('/dashboard')}
                    sx={{ cursor: 'pointer' }}
                >
                    Dashboard
                </Link>
                <Link
                    underline="hover"
                    color="inherit"
                    onClick={() => router.push('/dashboard/repairs')}
                    sx={{ cursor: 'pointer' }}
                >
                    Repairs
                </Link>
                <Typography color="text.primary">Completed Repairs</Typography>
            </Breadcrumbs>

            <Box sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 3,
                flexDirection: isMobile ? 'column' : 'row',
                gap: isMobile ? 2 : 0
            }}>
                <Box>
                    <Typography variant={isMobile ? "h5" : "h4"} sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CompletedIcon />
                        Completed Repairs
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        View your completed and picked up repairs
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleCreateRepair}
                    size={isMobile ? "medium" : "large"}
                >
                    Create New Repair
                </Button>
            </Box>

            <StatsCards completedRepairs={allCompletedRepairs} />

            <CompletedRepairsFilters
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                sortOption={sortOption}
                setSortOption={setSortOption}
                viewMode={viewMode}
                setViewMode={setViewMode}
                isMobile={isMobile}
            />

            {repairs.length === 0 ? (
                <EmptyState
                    completedRepairsLength={allCompletedRepairs.length}
                    handleCreateRepair={handleCreateRepair}
                />
            ) : viewMode === 'cards' ? (
                <CompletedRepairsGrid
                    repairs={repairs}
                    handleViewRepair={handleViewRepair}
                />
            ) : (
                <CompletedRepairsTable
                    repairs={repairs}
                    isMobile={isMobile}
                    expandedRows={expandedRows}
                    toggleRowExpansion={toggleRowExpansion}
                    handleViewRepair={handleViewRepair}
                />
            )}
        </Box>
    );
};

export default CompletedRepairsPage;
