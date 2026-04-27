'use client';
import React, { useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, MenuItem, Select, FormControl, InputLabel,
    Typography, Box, CircularProgress, Alert
} from '@mui/material';
import { MoveUp as MoveIcon } from '@mui/icons-material';

const REPAIR_UI = {
    bgPanel: '#15181D',
    bgCard: '#171A1F',
    border: '#2A2F38',
    textPrimary: '#E6E8EB',
    textHeader: '#D1D5DB',
    textSecondary: '#9CA3AF',
    accent: '#D4AF37',
};

const MOVEABLE_STATUSES = [
    { value: 'RECEIVING',               label: 'Receiving' },
    { value: 'NEEDS QUOTE',             label: 'Needs Quote' },
    { value: 'COMMUNICATION REQUIRED',  label: 'Communication Required' },
    { value: 'NEEDS PARTS',             label: 'Needs Parts' },
    { value: 'PARTS ORDERED',           label: 'Parts Ordered' },
    { value: 'READY FOR WORK',          label: 'Ready for Work' },
    { value: 'READY FOR PICKUP',        label: 'Ready for Pickup' },
    { value: 'DELIVERY BATCHED',        label: 'Delivery Batched' },
    { value: 'PAID_CLOSED',             label: 'Paid / Closed' },
];

/**
 * Reusable bulk-move dialog.
 *
 * Props:
 *   open         – boolean
 *   onClose      – () => void
 *   repairIDs    – string[]   IDs to move
 *   onSuccess    – (newStatus) => void   called after a successful move
 */
const BulkMoveDialog = ({ open, onClose, repairIDs = [], onSuccess }) => {
    const [targetStatus, setTargetStatus] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleMove = async () => {
        if (!targetStatus) return;
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/repairs/move', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    repairIDs,
                    status: targetStatus,
                    actorMode: 'admin',
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || 'Move failed');
            onSuccess?.(targetStatus);
            handleClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (loading) return;
        setTargetStatus('');
        setError('');
        onClose();
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="xs"
            fullWidth
            PaperProps={{
                sx: {
                    backgroundColor: REPAIR_UI.bgPanel,
                    border: `1px solid ${REPAIR_UI.border}`,
                    borderRadius: 3,
                }
            }}
        >
            <DialogTitle sx={{ color: REPAIR_UI.textHeader, fontWeight: 700, pb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <MoveIcon sx={{ color: REPAIR_UI.accent }} />
                    Move {repairIDs.length} Repair{repairIDs.length !== 1 ? 's' : ''}
                </Box>
            </DialogTitle>

            <DialogContent sx={{ pt: 1 }}>
                <Typography sx={{ color: REPAIR_UI.textSecondary, mb: 2.5, fontSize: '0.875rem' }}>
                    Select the destination status for all selected repairs.
                </Typography>

                <FormControl fullWidth size="small">
                    <InputLabel sx={{ color: REPAIR_UI.textSecondary }}>Move to</InputLabel>
                    <Select
                        value={targetStatus}
                        onChange={(e) => setTargetStatus(e.target.value)}
                        label="Move to"
                        sx={{
                            color: REPAIR_UI.textPrimary,
                            backgroundColor: REPAIR_UI.bgCard,
                            '.MuiOutlinedInput-notchedOutline': { borderColor: REPAIR_UI.border },
                            '.MuiSvgIcon-root': { color: REPAIR_UI.textSecondary },
                        }}
                        MenuProps={{
                            PaperProps: {
                                sx: {
                                    backgroundColor: REPAIR_UI.bgCard,
                                    border: `1px solid ${REPAIR_UI.border}`,
                                    '& .MuiMenuItem-root': { color: REPAIR_UI.textPrimary },
                                    '& .MuiMenuItem-root:hover': { backgroundColor: REPAIR_UI.bgPanel },
                                    '& .MuiMenuItem-root.Mui-selected': { backgroundColor: `${REPAIR_UI.accent}22` },
                                }
                            }
                        }}
                    >
                        {MOVEABLE_STATUSES.map(({ value, label }) => (
                            <MenuItem key={value} value={value}>{label}</MenuItem>
                        ))}
                    </Select>
                </FormControl>

                {error && (
                    <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
                )}
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
                <Button
                    onClick={handleClose}
                    disabled={loading}
                    sx={{ color: REPAIR_UI.textSecondary }}
                >
                    Cancel
                </Button>
                <Button
                    variant="contained"
                    onClick={handleMove}
                    disabled={!targetStatus || loading}
                    startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <MoveIcon />}
                    sx={{
                        backgroundColor: REPAIR_UI.accent,
                        color: '#0D0F12',
                        fontWeight: 700,
                        '&:hover': { backgroundColor: '#c9a227' },
                        '&:disabled': { backgroundColor: REPAIR_UI.border, color: REPAIR_UI.textSecondary }
                    }}
                >
                    {loading ? 'Moving…' : 'Move'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default BulkMoveDialog;
