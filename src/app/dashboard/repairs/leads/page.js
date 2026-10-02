"use client";
import React, { useState } from 'react';
import {
    Box,
    Typography,
    Grid,
    Button,
    TextField,
    InputAdornment,
    Snackbar,
    Slide,
    Paper,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
    Tooltip,
} from '@mui/material';
import {
    Search as SearchIcon,
    ChatBubble as ChatIcon,
    MoveUp as MoveIcon,
    CheckBox as CheckBoxIcon,
    CheckBoxOutlineBlank as CheckBoxBlankIcon,
    Close as CloseIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useRepairs } from '@/app/context/repairs.context';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';
import BulkMoveDialog from '@/components/repairs/BulkMoveDialog';
import QuoteDialog from './QuoteDialog';
import { canAccessLeads } from '@/lib/repairAccess';
import { LeadCard, statCards } from './LeadCard';

export default function LeadsPage() {
    const { data: session, status: authStatus } = useSession();
    const { repairs, updateRepair, fetchRepairs } = useRepairs();
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [converting, setConverting] = useState(null);
    const [snackbar, setSnackbar] = useState({ open: false, message: '' });
    const [selected, setSelected] = useState(new Set());
    const [moveDialogOpen, setMoveDialogOpen] = useState(false);
    const [quoteLead, setQuoteLead] = useState(null);
    // Drop-off is the first moment a promise date can honestly be given: the
    // piece is on the counter and the queue is known. Quotes carry none.
    const [dropoff, setDropoff] = useState(null);

    if (authStatus === 'loading') return null;
    if (!canAccessLeads(session)) {
        router.push('/dashboard');
        return null;
    }

    const leads = repairs.filter((r) => r.status === 'lead');

    const filteredLeads = leads.filter((r) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            r.repairID?.toLowerCase().includes(q) ||
            r.clientName?.toLowerCase().includes(q) ||
            r.description?.toLowerCase().includes(q) ||
            r.leadContact?.toLowerCase().includes(q) ||
            r.notes?.toLowerCase().includes(q)
        );
    });

    const toggleSelect = (repairID) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(repairID)) next.delete(repairID);
            else next.add(repairID);
            return next;
        });
    };
    const selectAll = () => setSelected(new Set(filteredLeads.map((r) => r.repairID)));
    const clearSelection = () => setSelected(new Set());
    const handleMoveSuccess = () => {
        clearSelection();
        if (typeof fetchRepairs === 'function') fetchRepairs();
    };
    const allFilteredSelected = filteredLeads.length > 0 && filteredLeads.every((r) => selected.has(r.repairID));

    // Sending is best-effort on the mail side, so say plainly when the customer
    // was not actually emailed — otherwise staff assume the quote is with them.
    const handleQuoteSaved = (action, json) => {
        if (action === 'save') {
            setSnackbar({ open: true, message: 'Estimate saved as a draft.' });
        } else if (json?.notified?.sent) {
            setSnackbar({ open: true, message: 'Estimate emailed to the customer.' });
        } else {
            setSnackbar({
                open: true,
                message: `Estimate saved, but the email did NOT go (${json?.notified?.reason || 'unknown'}). Call them.`,
            });
        }
        if (typeof fetchRepairs === 'function') fetchRepairs();
    };

    const openDropoff = (lead) => {
        const inAWeek = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
        setDropoff({ lead, promiseDate: inAWeek });
    };

    const handleConvert = async (repairID, promiseDate) => {
        setConverting(repairID);
        try {
            // The dedicated endpoint carries the accepted quote's tasks and
            // totals onto the repair, so the bench works to the figure the
            // customer agreed to rather than an empty shell.
            const res = await fetch(`/api/repairs/${repairID}/dropoff`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ promiseDate }),
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.error || 'Update failed');
            updateRepair(repairID, { status: 'READY FOR WORK' });
            setSnackbar({
                open: true,
                message: json.fromQuote
                    ? 'Dropped off — the quoted work is on the repair.'
                    : 'Dropped off — now on the bench list.',
            });
        } catch {
            setSnackbar({ open: true, message: 'Could not convert that lead. Try again.' });
        } finally {
            setConverting(null);
            setDropoff(null);
        }
    };

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
                        <ChatIcon sx={{ fontSize: 16, color: REPAIRS_UI.accent }} />
                        Retail inquiries
                    </Typography>

                    <Typography component="h1" sx={{ fontSize: { xs: 28, md: 36 }, fontWeight: 600, color: REPAIRS_UI.textHeader, mb: 1 }}>
                        Repair Leads
                    </Typography>
                    <Typography sx={{ color: REPAIRS_UI.textSecondary, lineHeight: 1.6, mb: 2.5 }}>
                        Inquiries submitted via the GEMINI chat on the shop site. Accept a lead to move it into Ready for Work.
                    </Typography>
                </Box>
            </Box>

            <Grid container spacing={2} sx={{ mb: 3 }}>
                {statCards.map(({ key, label, icon: Icon, getValue }) => (
                    <Grid item xs={6} sm={3} key={key}>
                        <Box
                            sx={{
                                backgroundColor: REPAIRS_UI.bgPanel,
                                border: `1px solid ${REPAIRS_UI.border}`,
                                borderRadius: 3,
                                boxShadow: REPAIRS_UI.shadow,
                                p: 2.25
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Box
                                    sx={{
                                        width: 38,
                                        height: 38,
                                        borderRadius: 2,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: `1px solid ${REPAIRS_UI.border}`,
                                        backgroundColor: REPAIRS_UI.bgCard
                                    }}
                                >
                                    <Icon sx={{ color: REPAIRS_UI.accent, fontSize: 18 }} />
                                </Box>
                                <Box>
                                    <Typography sx={{ fontSize: '1.6rem', fontWeight: 700, lineHeight: 1.1, color: REPAIRS_UI.textHeader }}>
                                        {getValue(leads)}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: REPAIRS_UI.textSecondary }}>
                                        {label}
                                    </Typography>
                                </Box>
                            </Box>
                        </Box>
                    </Grid>
                ))}
            </Grid>

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
                    {filteredLeads.length > 0 && (
                        <Tooltip title={allFilteredSelected ? 'Deselect all' : 'Select all visible'}>
                            <Button
                                size="small"
                                startIcon={allFilteredSelected ? <CheckBoxIcon /> : <CheckBoxBlankIcon />}
                                onClick={allFilteredSelected ? clearSelection : selectAll}
                                sx={{ color: REPAIRS_UI.textSecondary, fontSize: '0.75rem' }}
                            >
                                {allFilteredSelected ? 'Deselect all' : `Select all (${filteredLeads.length})`}
                            </Button>
                        </Tooltip>
                    )}
                </Box>
                <TextField
                    fullWidth
                    placeholder="Search by name, contact, description..."
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

            {filteredLeads.length === 0 ? (
                <Box
                    sx={{
                        backgroundColor: REPAIRS_UI.bgPanel,
                        border: `1px solid ${REPAIRS_UI.border}`,
                        borderRadius: 3,
                        boxShadow: REPAIRS_UI.shadow,
                        px: 3,
                        py: 5,
                        textAlign: 'center'
                    }}
                >
                    <ChatIcon sx={{ fontSize: 48, color: REPAIRS_UI.textMuted, mb: 2 }} />
                    <Typography variant="h6" sx={{ color: REPAIRS_UI.textHeader, mb: 1 }}>
                        {leads.length === 0 ? 'No leads yet' : 'No leads match the current search'}
                    </Typography>
                    <Typography sx={{ color: REPAIRS_UI.textSecondary }}>
                        {leads.length === 0
                            ? "When customers chat on the shop site, they'll show up here."
                            : `No leads matched "${searchQuery}".`}
                    </Typography>
                </Box>
            ) : (
                <Grid container spacing={2}>
                    {filteredLeads.map((lead) => (
                        <Grid item xs={12} sm={6} md={4} lg={3} key={lead.repairID}>
                            <LeadCard
                                lead={lead}
                                onConvert={openDropoff}
                                onQuote={setQuoteLead}
                                converting={converting}
                                isSelected={selected.has(lead.repairID)}
                                onToggleSelect={toggleSelect}
                            />
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
                        // Centred WITHOUT a transform: this Paper is inside a MUI <Slide>, which sets its own transform for the
                        // animation and overwrites a half-width centring transform, leaving the bar off-centre by half its width
                        // and off the screen entirely on a phone.
                        left: 0,
                        right: 0,
                        mx: 'auto',
                        width: 'fit-content',
                        maxWidth: 'calc(100% - 32px)',
                        zIndex: 1300,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        px: 3,
                        py: 1.5,
                        backgroundColor: REPAIRS_UI.bgPanel,
                        border: `1px solid ${REPAIRS_UI.border}`,
                        borderRadius: 3,
                        minWidth: { xs: 0, sm: 320 },
                    }}
                >
                    <Typography sx={{ color: REPAIRS_UI.textSecondary, fontSize: '0.875rem', flex: 1 }}>
                        <Box component="span" sx={{ fontWeight: 700, color: REPAIRS_UI.accent }}>{selected.size}</Box>
                        {' '}lead{selected.size !== 1 ? 's' : ''} selected
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
                            '&:hover': { backgroundColor: '#FFCF4D' },
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

            <Dialog
                open={Boolean(dropoff)}
                onClose={() => !converting && setDropoff(null)}
                PaperProps={{ sx: { backgroundColor: REPAIRS_UI.bgPanel, color: REPAIRS_UI.textPrimary, backgroundImage: 'none' } }}
            >
                <DialogTitle>Taking in {dropoff?.lead?.clientName || 'this piece'}</DialogTitle>
                <DialogContent sx={{ minWidth: 340 }}>
                    <Typography sx={{ color: REPAIRS_UI.textSecondary, fontSize: 14, mb: 2 }}>
                        {dropoff?.lead?.quote?.status === 'accepted'
                            ? `They accepted $${Number(dropoff.lead.quote.total || 0).toFixed(2)} — that work carries onto the repair.`
                            : 'No accepted estimate on this lead, so it converts as-is.'}
                    </Typography>
                    <TextField
                        fullWidth
                        size="small"
                        type="date"
                        label="Promise date"
                        InputLabelProps={{ shrink: true }}
                        value={dropoff?.promiseDate || ''}
                        onChange={(e) => setDropoff((d) => ({ ...d, promiseDate: e.target.value }))}
                        sx={{ '& .MuiInputBase-root': { color: REPAIRS_UI.textPrimary } }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button disabled={Boolean(converting)} onClick={() => setDropoff(null)} sx={{ color: REPAIRS_UI.textSecondary }}>
                        Back
                    </Button>
                    <Button
                        disabled={Boolean(converting) || !dropoff?.promiseDate}
                        onClick={() => handleConvert(dropoff.lead.repairID, dropoff.promiseDate)}
                        sx={{ color: REPAIRS_UI.accent }}
                    >
                        {converting ? 'Working…' : 'Take it in'}
                    </Button>
                </DialogActions>
            </Dialog>

            <QuoteDialog
                open={Boolean(quoteLead)}
                lead={quoteLead}
                onClose={() => setQuoteLead(null)}
                onSaved={handleQuoteSaved}
            />

            <Snackbar
                open={snackbar.open}
                autoHideDuration={7000}
                onClose={() => setSnackbar({ open: false, message: '' })}
                message={snackbar.message}
            />
        </Box>
    );
}
