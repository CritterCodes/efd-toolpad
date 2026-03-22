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
import { Add as AddIcon, AccessTime as ClockIcon } from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useCurrentRepairs } from '@/hooks/repairs/useCurrentRepairs';
import RepairsStatsCards from './components/RepairsStatsCards';
import FiltersBar from './components/FiltersBar';
import CurrentRepairsList from './components/CurrentRepairsList';

const CurrentRepairsPage = () => {
    const { data: session } = useSession();
    const router = useRouter();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

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
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <Typography>Loading current repairs...</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ p: isMobile ? 2 : 3 }}>
            {/* Breadcrumbs */}
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
                <Typography color="text.primary">Current Repairs</Typography>
            </Breadcrumbs>

            {/* Header */}
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
                        <ClockIcon />
                        Current Repairs
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        All active repairs (any status except completed/picked up)
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

            {/* Stats Cards Component */}
            <RepairsStatsCards
                currentRepairsCount={currentRepairsCount}
                inProgressCount={inProgressCount}
                readyForPickupCount={readyForPickupCount}
            />

            {/* Filters Component */}
            <FiltersBar
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                sortOption={sortOption}
                setSortOption={setSortOption}
            />

            {/* Repairs List / Grid Component */}
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
