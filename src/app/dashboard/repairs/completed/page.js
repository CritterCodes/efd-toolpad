'use client';

import React from 'react';
import { Box, Typography, Button, CircularProgress } from '@mui/material';
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
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';

const CompletedRepairsPage = () => {
    const router = useRouter();

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
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 320 }}>
                <CircularProgress sx={{ color: REPAIRS_UI.accent }} />
            </Box>
        );
    }

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
                        <CompletedIcon sx={{ fontSize: 16, color: REPAIRS_UI.accent }} />
                        Archive
                    </Typography>

                    <Typography sx={{ fontSize: { xs: 28, md: 36 }, fontWeight: 600, color: REPAIRS_UI.textHeader, mb: 1 }}>
                        Completed Repairs
                    </Typography>
                    <Typography sx={{ color: REPAIRS_UI.textSecondary, lineHeight: 1.6 }}>
                        View completed and picked up repairs.
                    </Typography>
                </Box>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                    <Button
                        variant="outlined"
                        startIcon={<AddIcon />}
                        onClick={handleCreateRepair}
                        sx={{ color: REPAIRS_UI.textPrimary, borderColor: REPAIRS_UI.border, backgroundColor: REPAIRS_UI.bgCard }}
                    >
                        Create New Repair
                    </Button>
                </Box>
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
                isMobile={false}
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
                    isMobile={false}
                    expandedRows={expandedRows}
                    toggleRowExpansion={toggleRowExpansion}
                    handleViewRepair={handleViewRepair}
                />
            )}
        </Box>
    );
};

export default CompletedRepairsPage;
