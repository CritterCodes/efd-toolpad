'use client';

import React, { useState } from 'react';
import {
    Box,
    Typography,
    Button,
    CircularProgress,
    Slide,
    Paper,
    IconButton,
    Tooltip,
} from '@mui/material';
import {
    Add as AddIcon,
    AccessTime as ClockIcon,
    MoveUp as MoveIcon,
    CheckBox as CheckBoxIcon,
    CheckBoxOutlineBlank as CheckBoxBlankIcon,
    Close as CloseIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useCurrentRepairs } from '@/hooks/repairs/useCurrentRepairs';
import RepairsStatsCards from './components/RepairsStatsCards';
import FiltersBar from './components/FiltersBar';
import CurrentRepairsList from './components/CurrentRepairsList';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';
import BulkMoveDialog from '@/components/repairs/BulkMoveDialog';

const CurrentRepairsPage = () => {
    const router = useRouter();
    const [selected, setSelected] = useState(new Set());
    const [moveDialogOpen, setMoveDialogOpen] = useState(false);

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
        setSortOption,
        refetch,
    } = useCurrentRepairs();

    const handleViewRepair = (repairId) => {
        router.push(`/dashboard/repairs/${repairId}`);
    };

    const handleCreateRepair = () => {
        router.push('/dashboard/repairs/new');
    };

    const toggleSelect = (id) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };
    const selectAll = () => setSelected(new Set(repairs.map((r) => r.repairID || r._id)));
    const clearSelection = () => setSelected(new Set());
    const handleMoveSuccess = () => {
        clearSelection();
        if (typeof refetch === 'function') refetch();
    };
    const allSelected = repairs.length > 0 && repairs.every((r) => selected.has(r.repairID || r._id));

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
                selectAllButton={repairs.length > 0 ? (
                    <Tooltip title={allSelected ? 'Deselect all' : 'Select all visible'}>
                        <Button
                            size="small"
                            startIcon={allSelected ? <CheckBoxIcon /> : <CheckBoxBlankIcon />}
                            onClick={allSelected ? clearSelection : selectAll}
                            sx={{ color: REPAIRS_UI.textSecondary, fontSize: '0.75rem' }}
                        >
                            {allSelected ? 'Deselect all' : `Select all (${repairs.length})`}
                        </Button>
                    </Tooltip>
                ) : null}
            />

            <CurrentRepairsList
                repairs={repairs}
                handleCreateRepair={handleCreateRepair}
                handleViewRepair={handleViewRepair}
                currentRepairsCount={currentRepairsCount}
                selected={selected}
                onToggleSelect={toggleSelect}
            />

            {/* Floating selection action bar */}
            <Slide direction="up" in={selected.size > 0} mountOnEnter unmountOnExit>
                <Paper
                    elevation={8}
                    sx={{
                        position: 'fixed',
                        bottom: 24,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 1300,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        px: 3,
                        py: 1.5,
                        backgroundColor: REPAIRS_UI.bgPanel,
                        border: `1px solid ${REPAIRS_UI.border}`,
                        borderRadius: 3,
                        minWidth: 320,
                    }}
                >
                    <Typography sx={{ color: REPAIRS_UI.textSecondary, fontSize: '0.875rem', flex: 1 }}>
                        <Box component="span" sx={{ fontWeight: 700, color: REPAIRS_UI.accent }}>{selected.size}</Box>
                        {' '}repair{selected.size !== 1 ? 's' : ''} selected
                    </Typography>
                    <Button
                        variant="contained"
                        size="small"
                        startIcon={<MoveIcon />}
                        onClick={() => setMoveDialogOpen(true)}
                        sx={{
                            backgroundColor: REPAIRS_UI.accent,
                            color: '#0D0F12',
                            fontWeight: 700,
                            '&:hover': { backgroundColor: '#c9a227' },
                        }}
                    >
                        Move Selected
                    </Button>
                    <Tooltip title="Clear selection">
                        <IconButton size="small" onClick={clearSelection} sx={{ color: REPAIRS_UI.textSecondary }}>
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Paper>
            </Slide>

            <BulkMoveDialog
                open={moveDialogOpen}
                onClose={() => setMoveDialogOpen(false)}
                repairIDs={Array.from(selected)}
                onSuccess={handleMoveSuccess}
            />
        </Box>
    );
};

export default CurrentRepairsPage;
