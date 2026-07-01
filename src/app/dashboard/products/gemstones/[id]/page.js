'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    Box, Typography, Grid, Button, CircularProgress, Alert,
    IconButton, Breadcrumbs, Link, Stack,
} from '@mui/material';
import {
    ArrowBack as ArrowBackIcon, Publish as PublishIcon, Drafts as DraftsIcon,
} from '@mui/icons-material';
import GemstoneDetails from './components/GemstoneDetails';
import GemstonePricing from './components/GemstonePricing';

const EMPTY = {
    title: '', species: '', subspecies: '', naturalSynthetic: 'natural',
    carat: '', cut: '', cutStyle: '', color: '', clarity: '', treatment: '',
    dimensions: '', locale: '', description: '', internalNotes: '',
    price: '', compareAtPrice: '', acquisitionPrice: '', supplier: '', certification: '',
    status: 'draft',
};

// Gemstone editor (rebuilt — the prior GemstoneDetails/GemstonePricing were empty `return null` stubs
// from an incomplete refactor, leaving this page blank). Mirrors the jewelry editor: load-on-edit,
// new-on 'new', Save Draft / Publish → POST /api/products/gemstones or PUT .../[id].
export default function GemstonePage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id;
    const isNew = id === 'new';

    const [form, setForm] = useState(EMPTY);
    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isNew) return;
        (async () => {
            try {
                const res = await fetch(`/api/products/gemstones/${id}`);
                if (!res.ok) throw new Error('Failed to load gemstone');
                const data = await res.json();
                const g = data.gemstone || data;
                setForm({
                    title: g.title || '', species: g.species || '', subspecies: g.subspecies || '',
                    naturalSynthetic: g.naturalSynthetic || 'natural', carat: g.carat || '', cut: g.cut || '',
                    cutStyle: g.cutStyle || '', color: g.color || '', clarity: g.clarity || '', treatment: g.treatment || '',
                    dimensions: g.dimensions || '', locale: g.locale || '', description: g.description || '',
                    internalNotes: g.internalNotes || '',
                    price: g.pricing?.retailPrice ?? g.price ?? '', compareAtPrice: g.pricing?.compareAtPrice ?? '',
                    acquisitionPrice: g.pricing?.costBasis ?? g.acquisitionPrice ?? '', supplier: g.supplier || '',
                    certification: g.certification || '',
                    status: g.status || (g.publishing?.visible ? 'active' : 'draft'),
                });
            } catch (e) {
                setError(e.message);
            } finally {
                setLoading(false);
            }
        })();
    }, [id, isNew]);

    const handleChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

    const handleSave = async (targetStatus) => {
        if (!form.title || !form.species) { setError('Title and species are required.'); return; }
        try {
            setSaving(true); setError('');
            const payload = { ...form, status: targetStatus || form.status, retailPrice: form.price };
            const res = isNew
                ? await fetch('/api/products/gemstones', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
                : await fetch(`/api/products/gemstones/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to save gemstone');
            const pid = data.gemstone?.productId || data.productId || id;
            if (isNew && pid && pid !== 'new') router.push(`/dashboard/products/gemstones/${pid}`);
            else router.push('/dashboard/products/gemstones');
        } catch (e) {
            setError(e.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>;
    }

    return (
        <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 }, maxWidth: '100%', overflowX: 'hidden' }}>
            <Box sx={{ display: 'flex', alignItems: { xs: 'flex-start', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 2, sm: 0 }, mb: 3 }}>
                <IconButton onClick={() => router.push('/dashboard/products/gemstones')} sx={{ mr: { sm: 2 } }} aria-label="Back to gemstones">
                    <ArrowBackIcon />
                </IconButton>
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography variant="h4" sx={{ fontSize: { xs: '1.75rem', sm: '2.125rem' }, overflowWrap: 'anywhere' }}>
                        {isNew ? 'New Gemstone' : form.title || 'Edit Gemstone'}
                    </Typography>
                    <Breadcrumbs aria-label="breadcrumb">
                        <Link color="inherit" href="/dashboard">Dashboard</Link>
                        <Link color="inherit" href="/dashboard/products/gemstones">Gemstones</Link>
                        <Typography color="text.primary">{isNew ? 'New' : 'Edit'}</Typography>
                    </Breadcrumbs>
                </Box>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ width: { xs: '100%', sm: 'auto' } }}>
                    <Button variant="outlined" startIcon={<DraftsIcon />} onClick={() => handleSave('draft')} disabled={saving} fullWidth>Save Draft</Button>
                    <Button variant="contained" startIcon={<PublishIcon />} onClick={() => handleSave('active')} disabled={saving} fullWidth>Publish</Button>
                </Stack>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

            <Grid container spacing={3}>
                <Grid item xs={12} md={8}>
                    <GemstoneDetails form={form} onChange={handleChange} />
                </Grid>
                <Grid item xs={12} md={4}>
                    <GemstonePricing form={form} onChange={handleChange} />
                </Grid>
            </Grid>
        </Box>
    );
}
