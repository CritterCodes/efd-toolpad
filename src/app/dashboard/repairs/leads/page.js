"use client";
import React, { useState } from 'react';
import {
    Box,
    Typography,
    Grid,
    Button,
    TextField,
    InputAdornment,
    Alert,
    Stack,
    Chip,
    Divider,
    Snackbar,
    CircularProgress,
    Checkbox,
    Slide,
    Paper,
    IconButton,
    Tooltip,
} from '@mui/material';
import {
    Search as SearchIcon,
    Phone as PhoneIcon,
    Email as EmailIcon,
    ChatBubble as ChatIcon,
    MoveUp as ConvertIcon,
    SmartToy as BotIcon,
    Inventory2 as InventoryIcon,
    Today as TodayIcon,
    Image as ImageIcon,
    AutoAwesome as AiIcon,
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

const formatDate = (d) => {
    if (!d) return 'Unknown';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || ''));

const LeadCard = ({ lead, onConvert, converting, isSelected, onToggleSelect }) => {
    const contact = lead.leadContact || lead.notes?.replace('Contact: ', '') || '';
    const contactIsEmail = isEmail(contact);

    return (
        <Box sx={{ position: 'relative' }}>
            <Box
                sx={{
                    position: 'absolute',
                    top: 8, left: 8,
                    zIndex: 2,
                }}
            >
                <Checkbox
                    checked={!!isSelected}
                    onChange={() => onToggleSelect?.(lead.repairID)}
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
            <Box
                sx={{
                    borderRadius: 3,
                    outline: isSelected ? `2px solid ${REPAIRS_UI.accent}` : '2px solid transparent',
                    transition: 'outline 0.15s ease',
                }}
            >
        <Box
            sx={{
                backgroundColor: REPAIRS_UI.bgPanel,
                border: `1px solid ${REPAIRS_UI.border}`,
                borderRadius: 3,
                boxShadow: REPAIRS_UI.shadow,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                height: '100%'
            }}
        >
            {lead.picture && (
                <Box
                    component="img"
                    src={lead.picture}
                    alt="Repair item"
                    sx={{ width: '100%', height: 160, objectFit: 'cover', borderBottom: `1px solid ${REPAIRS_UI.border}` }}
                />
            )}
            <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1, flex: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Typography sx={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '0.78rem', color: REPAIRS_UI.textMuted }}>
                        {lead.repairID}
                    </Typography>
                    <Chip
                        icon={<BotIcon sx={{ fontSize: 12 }} />}
                        label="GEMINI Lead"
                        size="small"
                        sx={{
                            backgroundColor: REPAIRS_UI.bgCard,
                            color: REPAIRS_UI.accent,
                            border: `1px solid ${REPAIRS_UI.border}`,
                            fontSize: '0.68rem',
                            fontWeight: 600,
                            '& .MuiChip-icon': { color: REPAIRS_UI.accent }
                        }}
                    />
                </Box>

                <Typography sx={{ fontWeight: 600, fontSize: '1rem', color: REPAIRS_UI.textHeader, lineHeight: 1.3 }}>
                    {lead.clientName}
                </Typography>

                {contact && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {contactIsEmail
                            ? <EmailIcon sx={{ fontSize: 13, color: REPAIRS_UI.textMuted }} />
                            : <PhoneIcon sx={{ fontSize: 13, color: REPAIRS_UI.textMuted }} />
                        }
                        <Typography
                            variant="body2"
                            component={contactIsEmail ? 'a' : 'span'}
                            href={contactIsEmail ? `mailto:${contact}` : undefined}
                            sx={{ color: REPAIRS_UI.accent, textDecoration: 'none', fontSize: '0.82rem', '&:hover': { textDecoration: contactIsEmail ? 'underline' : 'none' } }}
                        >
                            {contact}
                        </Typography>
                    </Box>
                )}

                <Typography
                    variant="body2"
                    sx={{
                        color: REPAIRS_UI.textSecondary,
                        flex: 1,
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        fontSize: '0.82rem'
                    }}
                >
                    {lead.description || 'No description provided.'}
                </Typography>

                {lead.taskHints?.length > 0 && (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {lead.taskHints.map((hint) => (
                            <Chip
                                key={hint}
                                label={hint}
                                size="small"
                                sx={{
                                    fontSize: '0.68rem',
                                    backgroundColor: REPAIRS_UI.bgCard,
                                    color: REPAIRS_UI.textSecondary,
                                    border: `1px solid ${REPAIRS_UI.border}`
                                }}
                            />
                        ))}
                    </Box>
                )}

                {(lead.metalType || lead.karat) && (
                    <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }}>
                        {[lead.metalType, lead.karat, lead.goldColor].filter(Boolean).join(' · ')}
                        {lead.isRing ? ' · Ring' : ''}
                    </Typography>
                )}

                <Divider sx={{ borderColor: REPAIRS_UI.border }} />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }}>
                        {formatDate(lead.createdAt)}
                    </Typography>
                    {lead.aiConfidence > 0 && (
                        <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }}>
                            AI {Math.round(lead.aiConfidence * 100)}% confident
                        </Typography>
                    )}
                </Box>

                <Stack direction="row" spacing={1}>
                    <Button
                        size="small"
                        variant="outlined"
                        fullWidth
                        href={`/dashboard/repairs/${lead.repairID}`}
                        onClick={(e) => { e.stopPropagation(); }}
                        sx={{ color: REPAIRS_UI.textPrimary, borderColor: REPAIRS_UI.border, backgroundColor: REPAIRS_UI.bgCard }}
                    >
                        View
                    </Button>
                    <Button
                        size="small"
                        variant="outlined"
                        fullWidth
                        startIcon={converting === lead.repairID ? <CircularProgress size={12} sx={{ color: REPAIRS_UI.accent }} /> : <ConvertIcon />}
                        onClick={() => onConvert(lead.repairID)}
                        disabled={!!converting}
                        sx={{
                            color: REPAIRS_UI.accent,
                            borderColor: REPAIRS_UI.accent,
                            backgroundColor: REPAIRS_UI.bgCard,
                            '&:hover': { backgroundColor: REPAIRS_UI.bgTertiary }
                        }}
                    >
                        {converting === lead.repairID ? 'Converting...' : 'Accept'}
                    </Button>
                </Stack>
            </Box>
        </Box>
            </Box>
        </Box>
    );
};

const statCards = [
    { key: 'total', label: 'Total Leads', icon: InventoryIcon, getValue: (leads) => leads.length },
    { key: 'today', label: 'New Today', icon: TodayIcon, getValue: (leads) => leads.filter(r => r.createdAt && new Date(r.createdAt).toDateString() === new Date().toDateString()).length },
    { key: 'photo', label: 'With Photo', icon: ImageIcon, getValue: (leads) => leads.filter(r => r.picture).length },
    { key: 'ai', label: 'AI Analyzed', icon: AiIcon, getValue: (leads) => leads.filter(r => (r.taskHints?.length || 0) > 0).length },
];

export default function LeadsPage() {
    const { data: session, status: authStatus } = useSession();
    const { repairs, updateRepair, fetchRepairs } = useRepairs();
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [converting, setConverting] = useState(null);
    const [snackbar, setSnackbar] = useState({ open: false, message: '' });
    const [selected, setSelected] = useState(new Set());
    const [moveDialogOpen, setMoveDialogOpen] = useState(false);

    if (authStatus === 'loading') return null;
    if (!session?.user || session.user.role !== 'admin') {
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

    const handleConvert = async (repairID) => {
        setConverting(repairID);
        try {
            const res = await fetch(`/api/repairs?repairID=${repairID}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'READY FOR WORK' }),
            });
            if (!res.ok) throw new Error('Update failed');
            updateRepair(repairID, { status: 'READY FOR WORK' });
            setSnackbar({ open: true, message: 'Lead converted to Ready for Work' });
        } catch {
            setSnackbar({ open: true, message: 'Failed to convert lead. Try again.' });
        } finally {
            setConverting(null);
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

                    <Typography sx={{ fontSize: { xs: 28, md: 36 }, fontWeight: 600, color: REPAIRS_UI.textHeader, mb: 1 }}>
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
                                onConvert={handleConvert}
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

            <Snackbar
                open={snackbar.open}
                autoHideDuration={3500}
                onClose={() => setSnackbar({ open: false, message: '' })}
                message={snackbar.message}
            />
        </Box>
    );
}
