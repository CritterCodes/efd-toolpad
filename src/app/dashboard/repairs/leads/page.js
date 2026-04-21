"use client";
import React, { useState } from 'react';
import {
    Box,
    Typography,
    Grid,
    Card,
    CardContent,
    CardMedia,
    Button,
    Breadcrumbs,
    Link,
    TextField,
    InputAdornment,
    Alert,
    Stack,
    Chip,
    Divider,
    Snackbar,
    CircularProgress,
} from '@mui/material';
import {
    Search as SearchIcon,
    Phone as PhoneIcon,
    Email as EmailIcon,
    ChatBubble as ChatIcon,
    MoveUp as ConvertIcon,
    SmartToy as BotIcon,
    CheckCircle as CheckIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useRepairs } from '@/app/context/repairs.context';

const formatDate = (d) => {
    if (!d) return 'Unknown';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || ''));

const LeadCard = ({ lead, onConvert, converting }) => {
    const contact = lead.leadContact || lead.notes?.replace('Contact: ', '') || '';
    const contactIsEmail = isEmail(contact);

    return (
        <Card elevation={2} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {lead.picture && (
                <CardMedia
                    component="img"
                    height="160"
                    image={lead.picture}
                    alt="Repair item"
                    sx={{ objectFit: 'cover' }}
                />
            )}
            <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                {/* Header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', fontFamily: 'monospace', color: 'text.secondary' }}>
                        {lead.repairID}
                    </Typography>
                    <Chip
                        icon={<BotIcon sx={{ fontSize: 14 }} />}
                        label="GEMINI Lead"
                        size="small"
                        color="secondary"
                        variant="outlined"
                        sx={{ fontSize: 11 }}
                    />
                </Box>

                {/* Client */}
                <Typography variant="h6" sx={{ fontWeight: 'bold', lineHeight: 1.2 }}>
                    {lead.clientName}
                </Typography>

                {/* Contact */}
                {contact && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {contactIsEmail
                            ? <EmailIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                            : <PhoneIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                        }
                        <Typography
                            variant="body2"
                            component={contactIsEmail ? 'a' : 'span'}
                            href={contactIsEmail ? `mailto:${contact}` : undefined}
                            sx={{ color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: contactIsEmail ? 'underline' : 'none' } }}
                        >
                            {contact}
                        </Typography>
                    </Box>
                )}

                {/* Description */}
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, flex: 1, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                    {lead.description || 'No description provided.'}
                </Typography>

                {/* AI hints */}
                {lead.taskHints?.length > 0 && (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                        {lead.taskHints.map((hint) => (
                            <Chip key={hint} label={hint} size="small" variant="filled" sx={{ fontSize: 10, bgcolor: 'action.hover' }} />
                        ))}
                    </Box>
                )}

                {/* Metal / karat */}
                {(lead.metalType || lead.karat) && (
                    <Typography variant="caption" color="text.secondary">
                        {[lead.metalType, lead.karat, lead.goldColor].filter(Boolean).join(' · ')}
                        {lead.isRing ? ' · Ring' : ''}
                    </Typography>
                )}

                <Divider sx={{ my: 0.5 }} />

                {/* Footer */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" color="text.secondary">
                        {formatDate(lead.createdAt)}
                    </Typography>
                    {lead.aiConfidence > 0 && (
                        <Typography variant="caption" color="text.secondary">
                            AI {Math.round(lead.aiConfidence * 100)}% confident
                        </Typography>
                    )}
                </Box>

                {/* Actions */}
                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                    <Button
                        size="small"
                        variant="outlined"
                        fullWidth
                        href={`/dashboard/repairs/${lead.repairID}`}
                        onClick={(e) => { e.stopPropagation(); }}
                    >
                        View
                    </Button>
                    <Button
                        size="small"
                        variant="contained"
                        fullWidth
                        color="success"
                        startIcon={converting === lead.repairID ? <CircularProgress size={12} color="inherit" /> : <ConvertIcon />}
                        onClick={() => onConvert(lead.repairID)}
                        disabled={!!converting}
                    >
                        {converting === lead.repairID ? 'Converting...' : 'Accept'}
                    </Button>
                </Stack>
            </CardContent>
        </Card>
    );
};

export default function LeadsPage() {
    const { data: session, status: authStatus } = useSession();
    const { repairs, updateRepair } = useRepairs();
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [converting, setConverting] = useState(null);
    const [snackbar, setSnackbar] = useState({ open: false, message: '' });

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

    const todayLeads = leads.filter((r) => {
        if (!r.createdAt) return false;
        return new Date(r.createdAt).toDateString() === new Date().toDateString();
    });

    const handleConvert = async (repairID) => {
        setConverting(repairID);
        try {
            const res = await fetch(`/api/repairs?repairID=${repairID}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'RECEIVING' }),
            });

            if (!res.ok) throw new Error('Update failed');

            updateRepair(repairID, { status: 'RECEIVING' });
            setSnackbar({ open: true, message: `Lead converted to Receiving` });
        } catch {
            setSnackbar({ open: true, message: 'Failed to convert lead. Try again.' });
        } finally {
            setConverting(null);
        }
    };

    return (
        <Box sx={{ padding: '20px', position: 'relative' }}>
            {/* Breadcrumbs */}
            <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
                <Link underline="hover" color="inherit" onClick={() => router.push('/dashboard')} sx={{ cursor: 'pointer' }}>
                    Dashboard
                </Link>
                <Link underline="hover" color="inherit" onClick={() => router.push('/dashboard/repairs')} sx={{ cursor: 'pointer' }}>
                    Repairs
                </Link>
                <Typography color="text.primary">Leads</Typography>
            </Breadcrumbs>

            <Typography variant="h4" sx={{ mb: 1, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                <ChatIcon />
                Repair Leads
            </Typography>

            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Retail inquiries submitted via the GEMINI chat on the shop site. Accept a lead to move it into Receiving.
            </Typography>

            {/* Stats */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent sx={{ textAlign: 'center' }}>
                            <Typography variant="h4" color="secondary" sx={{ fontWeight: 'bold' }}>
                                {leads.length}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">Total Leads</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent sx={{ textAlign: 'center' }}>
                            <Typography variant="h4" color="success.main" sx={{ fontWeight: 'bold' }}>
                                {todayLeads.length}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">New Today</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent sx={{ textAlign: 'center' }}>
                            <Typography variant="h4" color="info.main" sx={{ fontWeight: 'bold' }}>
                                {leads.filter((r) => r.picture).length}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">With Photo</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent sx={{ textAlign: 'center' }}>
                            <Typography variant="h4" color="warning.main" sx={{ fontWeight: 'bold' }}>
                                {leads.filter((r) => (r.taskHints?.length || 0) > 0).length}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">AI Analyzed</Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Search */}
            <TextField
                fullWidth
                placeholder="Search by name, contact, description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start">
                            <SearchIcon />
                        </InputAdornment>
                    ),
                }}
                sx={{ mb: 3 }}
            />

            {/* Content */}
            {filteredLeads.length === 0 ? (
                <Alert severity={leads.length === 0 ? 'info' : 'warning'}>
                    {leads.length === 0
                        ? 'No repair leads yet. When customers chat on the shop site, they\'ll show up here.'
                        : `No leads matching "${searchQuery}"`
                    }
                </Alert>
            ) : (
                <Grid container spacing={2}>
                    {filteredLeads.map((lead) => (
                        <Grid item xs={12} sm={6} md={4} lg={3} key={lead.repairID}>
                            <LeadCard lead={lead} onConvert={handleConvert} converting={converting} />
                        </Grid>
                    ))}
                </Grid>
            )}

            <Snackbar
                open={snackbar.open}
                autoHideDuration={3500}
                onClose={() => setSnackbar({ open: false, message: '' })}
                message={snackbar.message}
            />
        </Box>
    );
}
