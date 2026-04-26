'use client';

import React from 'react';
import {
    Box,
    Typography,
    Button,
    CircularProgress
} from '@mui/material';
import { Add as AddIcon, AccessTime as ClockIcon } from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useCurrentRepairs } from '@/hooks/repairs/useCurrentRepairs';
import RepairsStatsCards from './components/RepairsStatsCards';
import FiltersBar from './components/FiltersBar';
import CurrentRepairsList from './components/CurrentRepairsList';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';

const CurrentRepairsPage = () => {
    const router = useRouter();

    const {
        repairs,
        currentRepairsCount,
        inProgressCount,
        readyForPickupCount,
        loading,
        searchQuery,
        setSearchQuery,
        statusFilter,
        setStatusFilter,
        sortOption,
        setSortOption
    } = useCurrentRepairs();

    const handleViewRepair = (repairId) => {
        router.push(`/dashboard/repairs/${repairId}`);
    };

    const handleCreateRepair = () => {
        router.push('/dashboard/repairs/new');
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 320 }}>
                <CircularProgress sx={{ color: REPAIRS_UI.accent }} />
            </Box>
        );
    }

    return (
        <Box sx={{ pb: 10 }}>
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
                <Box sx={{ maxWidth: 920 }}>
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
                        <ClockIcon sx={{ fontSize: 16, color: REPAIRS_UI.accent }} />
                        Active workflow
                    </Typography>

                    <Typography sx={{ fontSize: { xs: 28, md: 36 }, fontWeight: 600, color: REPAIRS_UI.textHeader, mb: 1 }}>
                        Current repairs
                    </Typography>
                    <Typography sx={{ color: REPAIRS_UI.textSecondary, lineHeight: 1.6, mb: 2.5 }}>
                        Monitor every active repair in flight, review queue status, and move directly into the repair detail workflow.
                    </Typography>
                </Box>

                <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={handleCreateRepair}
                    sx={{ color: REPAIRS_UI.textPrimary, borderColor: REPAIRS_UI.border, backgroundColor: REPAIRS_UI.bgCard }}
                >
                    Create Repair
                </Button>
            </Box>

            <RepairsStatsCards
                currentRepairsCount={currentRepairsCount}
                inProgressCount={inProgressCount}
                readyForPickupCount={readyForPickupCount}
            />

            <FiltersBar
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                sortOption={sortOption}
                setSortOption={setSortOption}
            />

            <CurrentRepairsList
                repairs={repairs}
                handleCreateRepair={handleCreateRepair}
                handleViewRepair={handleViewRepair}
                currentRepairsCount={currentRepairsCount}
            />
        </Box>
    );
};

export default CurrentRepairsPage;
