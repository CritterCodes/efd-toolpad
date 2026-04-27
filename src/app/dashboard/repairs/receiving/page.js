"use client";
import React, { useState, useCallback } from 'react';
import {
    Box,
    Typography,
    Grid,
    Button,
    TextField,
    InputAdornment,
    Fab,
    CircularProgress,
    Checkbox,
    Slide,
    Paper,
    IconButton,
    Tooltip
} from '@mui/material';
import {
    Search as SearchIcon,
    Add as AddIcon,
    MoveUp as MoveIcon,
    LocalShipping as ReceivingIcon,
    Inventory2 as InventoryIcon,
    Today as TodayIcon,
    PriorityHigh as PriorityIcon,
    CheckBox as CheckBoxIcon,
    CheckBoxOutlineBlank as CheckBoxBlankIcon,
    Close as CloseIcon,
    SelectAll as SelectAllIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useRepairs } from '@/app/context/repairs.context';
import RepairCard from '@/components/business/repairs/RepairCard';
import BulkMoveDialog from '@/components/repairs/BulkMoveDialog';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';

const statCards = [
    { key: 'total', label: 'Total in Receiving', icon: InventoryIcon },
    { key: 'today', label: 'Received Today', icon: TodayIcon },
    { key: 'urgent', label: 'Urgent / Due Date', icon: PriorityIcon }
];

const ReceivingPage = () => {
    const { data: session, status: authStatus } = useSession();
    const { repairs, fetchRepairs } = useRepairs();
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [selected, setSelected] = useState(new Set());
    const [moveDialogOpen, setMoveDialogOpen] = useState(false);

    if (authStatus === 'loading') {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 320 }}>
                <CircularProgress sx={{ color: REPAIRS_UI.accent }} />
            </Box>
        );
    }

    const isAdmin = session?.user?.role === 'admin';
    const isOnsiteReceiving = session?.user?.staffCapabilities?.repairOps === true
        && session?.user?.staffCapabilities?.receiving === true
        && session?.user?.employment?.isOnsite === true;

    if (!session?.user || (!isAdmin && !isOnsiteReceiving)) {
        router.push('/dashboard');
        return null;
    }

    const receivingRepairs = repairs.filter((repair) => repair.status === 'RECEIVING');

    const filteredRepairs = receivingRepairs.filter((repair) => {
        if (!searchQuery) return true;
        const searchLower = searchQuery.toLowerCase();
        return (
            repair.repairID?.toLowerCase().includes(searchLower) ||
            repair.clientName?.toLowerCase().includes(searchLower) ||
            repair.description?.toLowerCase().includes(searchLower) ||
            repair.businessName?.toLowerCase().includes(searchLower)
        );
    });

    const todayReceived = receivingRepairs.filter((repair) => {
        if (!repair.createdAt) return false;
        const repairDate = new Date(repair.createdAt).toDateString();
        const today = new Date().toDateString();
        return repairDate === today;
    });

    const urgentRepairs = receivingRepairs.filter((repair) => repair.isRush || repair.promiseDate);

    const stats = {
        total: receivingRepairs.length,
        today: todayReceived.length,
        urgent: urgentRepairs.length
    };

    const toggleSelect = (repairID) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(repairID)) next.delete(repairID);
            else next.add(repairID);
            return next;
        });
    };

    const selectAll = () => setSelected(new Set(filteredRepairs.map((r) => r.repairID)));
    const clearSelection = () => setSelected(new Set());

    const handleMoveSuccess = () => {
        clearSelection();
        if (typeof fetchRepairs === 'function') fetchRepairs();
    };

    const handleViewRepair = (repairID) => router.push(`/dashboard/repairs/${repairID}`);
    const handleMoveSingle = (repairID) => router.push(`/dashboard/repairs/move?repairID=${repairID}`);

    const allFilteredSelected = filteredRepairs.length > 0 && filteredRepairs.every((r) => selected.has(r.repairID));

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
                        <ReceivingIcon sx={{ fontSize: 16, color: REPAIRS_UI.accent }} />
                        Intake queue
                    </Typography>

                    <Typography sx={{ fontSize: { xs: 28, md: 36 }, fontWeight: 600, color: REPAIRS_UI.textHeader, mb: 1 }}>
                        Receiving
                    </Typography>
                    <Typography sx={{ color: REPAIRS_UI.textSecondary, lineHeight: 1.6, mb: 2.5 }}>
                        Review every repair waiting in intake, search the queue quickly, and move tickets into the next stage of the workflow.
                    </Typography>
                </Box>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                    <Button
                        variant="outlined"
                        startIcon={<AddIcon />}
                        onClick={() => router.push('/dashboard/repairs/new')}
                        sx={{ color: REPAIRS_UI.textPrimary, borderColor: REPAIRS_UI.border, backgroundColor: REPAIRS_UI.bgCard }}
                    >
                        New Repair
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<MoveIcon />}
                        onClick={() => router.push('/dashboard/repairs/move')}
                        sx={{ color: REPAIRS_UI.textPrimary, borderColor: REPAIRS_UI.border, backgroundColor: REPAIRS_UI.bgCard }}
                    >
                        Move Repairs
                    </Button>
                </Box>
            </Box>

            {/* Stats */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                {statCards.map(({ key, label, icon: Icon }) => (
                    <Grid item xs={12} sm={4} key={key}>
                        <Box
                            sx={{
                                backgroundColor: REPAIRS_UI.bgPanel,
                                border: `1px solid ${REPAIRS_UI.border}`,
                                borderRadius: 3,
                                boxShadow: REPAIRS_UI.shadow,
                                p: 2.25,
                                height: '100%'
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Box
                                    sx={{
                                        width: 42, height: 42, borderRadius: 2,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        border: `1px solid ${REPAIRS_UI.border}`,
                                        backgroundColor: REPAIRS_UI.bgCard
                                    }}
                                >
                                    <Icon sx={{ color: REPAIRS_UI.accent, fontSize: 20 }} />
                                </Box>
                                <Box>
                                    <Typography sx={{ fontSize: { xs: '1.8rem', md: '2rem' }, lineHeight: 1.1, fontWeight: 700, color: REPAIRS_UI.textHeader }}>
                                        {stats[key]}
                                    </Typography>
                                    <Typography sx={{ color: REPAIRS_UI.textSecondary }}>{label}</Typography>
                                </Box>
                            </Box>
                        </Box>
                    </Grid>
                ))}
            </Grid>

            {/* Search + select-all row */}
            <Box
                sx={{
                    backgroundColor: { xs: 'transparent', sm: REPAIRS_UI.bgPanel },
                    border: { xs: 'none', sm: `1px solid ${REPAIRS_UI.border}` },
                    borderRadius: { xs: 0, sm: 3 },
                    boxShadow: { xs: 'none', sm: REPAIRS_UI.shadow },
                    p: { xs: 0.5, sm: 2.5 },
                    mb: 3
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                    <Typography variant="overline" sx={{ color: REPAIRS_UI.textSecondary, fontWeight: 700, letterSpacing: '0.08em', flex: 1 }}>
                        Search
                    </Typography>
                    {filteredRepairs.length > 0 && (
                        <Tooltip title={allFilteredSelected ? 'Deselect all' : 'Select all visible'}>
                            <Button
                                size="small"
                                startIcon={allFilteredSelected ? <CheckBoxIcon /> : <CheckBoxBlankIcon />}
                                onClick={allFilteredSelected ? clearSelection : selectAll}
                                sx={{ color: REPAIRS_UI.textSecondary, fontSize: '0.75rem' }}
                            >
                                {allFilteredSelected ? 'Deselect all' : `Select all (${filteredRepairs.length})`}
                            </Button>
                        </Tooltip>
                    )}
                </Box>
                <TextField
                    fullWidth
                    placeholder="Search by repair ID, client, business, or description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    size="small"
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon sx={{ color: REPAIRS_UI.textMuted }} />
                            </InputAdornment>
                        ),
                    }}
                />
            </Box>

            {filteredRepairs.length === 0 ? (
                <Box
                    sx={{
                        backgroundColor: REPAIRS_UI.bgPanel,
                        border: `1px solid ${REPAIRS_UI.border}`,
                        borderRadius: 3,
                        boxShadow: REPAIRS_UI.shadow,
                        px: 3, py: 5, textAlign: 'center'
                    }}
                >
                    <ReceivingIcon sx={{ fontSize: 48, color: REPAIRS_UI.textMuted, mb: 2 }} />
                    <Typography variant="h6" sx={{ color: REPAIRS_UI.textHeader, mb: 1 }}>
                        {receivingRepairs.length === 0 ? 'Receiving is clear' : 'No repairs match the current search'}
                    </Typography>
                    <Typography sx={{ color: REPAIRS_UI.textSecondary, mb: 2.5 }}>
                        {receivingRepairs.length === 0
                            ? 'There are no repairs waiting in the intake area right now.'
                            : `No repairs matched "${searchQuery}".`}
                    </Typography>
                    {receivingRepairs.length === 0 && (
                        <Button
                            variant="outlined"
                            startIcon={<AddIcon />}
                            onClick={() => router.push('/dashboard/repairs/new')}
                            sx={{ color: REPAIRS_UI.textPrimary, borderColor: REPAIRS_UI.border, backgroundColor: REPAIRS_UI.bgCard }}
                        >
                            Create Repair
                        </Button>
                    )}
                </Box>
            ) : (
                <Grid container spacing={2}>
                    {filteredRepairs.map((repair) => (
                        <Grid item xs={12} sm={6} xl={4} key={repair.repairID}>
                            <Box sx={{ position: 'relative' }}>
                                {/* Selection checkbox overlay */}
                                <Box
                                    sx={{
                                        position: 'absolute',
                                        top: 8, left: 8,
                                        zIndex: 2,
                                    }}
                                >
                                    <Checkbox
                                        checked={selected.has(repair.repairID)}
                                        onChange={() => toggleSelect(repair.repairID)}
                                        onClick={(e) => e.stopPropagation()}
                                        sx={{
                                            color: REPAIRS_UI.border,
                                            '&.Mui-checked': { color: REPAIRS_UI.accent },
                                            backgroundColor: `${REPAIRS_UI.bgPanel}cc`,
                                            borderRadius: 1,
                                            p: 0.5,
                                        }}
                                    />
                                </Box>

                                {/* Highlight selected cards */}
                                <Box
                                    sx={{
                                        borderRadius: 3,
                                        outline: selected.has(repair.repairID)
                                            ? `2px solid ${REPAIRS_UI.accent}`
                                            : '2px solid transparent',
                                        transition: 'outline 0.15s ease',
                                    }}
                                >
                                    <RepairCard
                                        repair={repair}
                                        actions={
                                            <>
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    onClick={() => handleViewRepair(repair.repairID)}
                                                    sx={{ flex: 1, color: REPAIRS_UI.textPrimary, borderColor: REPAIRS_UI.border, backgroundColor: REPAIRS_UI.bgPanel }}
                                                >
                                                    View
                                                </Button>
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    startIcon={<MoveIcon />}
                                                    onClick={() => handleMoveSingle(repair.repairID)}
                                                    sx={{ flex: 1, color: REPAIRS_UI.textPrimary, borderColor: REPAIRS_UI.border, backgroundColor: REPAIRS_UI.bgPanel }}
                                                >
                                                    Move
                                                </Button>
                                            </>
                                        }
                                    />
                                </Box>
                            </Box>
                        </Grid>
                    ))}
                </Grid>
            )}

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

            {/* Bulk move dialog */}
            <BulkMoveDialog
                open={moveDialogOpen}
                onClose={() => setMoveDialogOpen(false)}
                repairIDs={Array.from(selected)}
                onSuccess={handleMoveSuccess}
            />

            <Fab
                aria-label="add new repair"
                sx={{
                    position: 'fixed',
                    bottom: 16,
                    right: 16,
                    backgroundColor: REPAIRS_UI.bgPanel,
                    color: REPAIRS_UI.textPrimary,
                    border: `1px solid ${REPAIRS_UI.border}`,
                    boxShadow: REPAIRS_UI.shadow,
                    '&:hover': { backgroundColor: REPAIRS_UI.bgCard }
                }}
                onClick={() => router.push('/dashboard/repairs/new')}
            >
                <AddIcon />
            </Fab>
        </Box>
    );
};

export default ReceivingPage;
