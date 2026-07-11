'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    Box, Typography, Grid, Button, CircularProgress, Alert,
    IconButton, Breadcrumbs, Stack, Link,
} from '@mui/material';
import {
    ArrowBack as ArrowBackIcon, Publish as PublishIcon, Drafts as DraftsIcon,
} from '@mui/icons-material';
import GemstoneDetails from './components/GemstoneDetails';
import GemstonePricing from './components/GemstonePricing';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';

const EMPTY = {
    title: '', species: '', subspecies: '', naturalSynthetic: 'natural',
    carat: '', cut: '', cutStyle: '', color: '', clarity: '', treatment: '',
    dimensions: '', locale: '', description: '', internalNotes: '',
    price: '', compareAtPrice: '', acquisitionPrice: '', supplier: '', certification: '',
    status: 'draft',
};

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
        } catch (e) {
            setError(e.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
                <CircularProgress sx={{ color: REPAIRS_UI.accent }} />
            </Box>
        );
    }

    return (
        <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 }, maxWidth: '100%', overflowX: 'hidden' }}>
            <Box sx={{
                display: 'flex', alignItems: { xs: 'flex-start', sm: 'center' },
                flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 2, sm: 0 }, mb: 3,
            }}>
                <IconButton
                    onClick={() => router.push('/dashboard/products/gemstones')}
                    sx={{ mr: { sm: 2 }, color: REPAIRS_UI.textSecondary }}
                    aria-label="Back to gemstones"
                >
                    <ArrowBackIcon />
                </IconButton>
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: { xs: '1.75rem', sm: '2.125rem' }, fontWeight: 600, color: REPAIRS_UI.textHeader, overflowWrap: 'anywhere' }}>
                        {isNew ? 'New Gemstone' : form.title || 'Edit Gemstone'}
                    </Typography>
                    <Breadcrumbs aria-label="breadcrumb" sx={{ '& .MuiBreadcrumbs-separator': { color: REPAIRS_UI.textMuted } }}>
                        <Link href="/dashboard" sx={{ color: REPAIRS_UI.textSecondary, '&:hover': { color: REPAIRS_UI.accent } }} underline="hover">Dashboard</Link>
                        <Link href="/dashboard/products/gemstones" sx={{ color: REPAIRS_UI.textSecondary, '&:hover': { color: REPAIRS_UI.accent } }} underline="hover">Gemstones</Link>
                        <Typography sx={{ color: REPAIRS_UI.textHeader }}>{isNew ? 'New' : 'Edit'}</Typography>
                    </Breadcrumbs>
                </Box>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ width: { xs: '100%', sm: 'auto' } }}>
                    <Button
                        variant="outlined" startIcon={<DraftsIcon />}
                        onClick={() => handleSave('draft')} disabled={saving} fullWidth
                        sx={{ borderColor: REPAIRS_UI.border, color: REPAIRS_UI.textPrimary, '&:hover': { borderColor: REPAIRS_UI.accent, backgroundColor: REPAIRS_UI.bgCard } }}
                    >
                        Save Draft
                    </Button>
                    <Button
                        variant="contained" startIcon={<PublishIcon />}
                        onClick={() => handleSave('active')} disabled={saving} fullWidth
                        sx={{ backgroundColor: REPAIRS_UI.accent, color: '#1A1A1A', fontWeight: 600, '&:hover': { backgroundColor: '#C19B2E' } }}
                    >
                        Publish
                    </Button>
                </Stack>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 3, backgroundColor: '#4A1D1D', color: '#F8BBBB', border: '1px solid #7A2E2E' }}>
                    {error}
                </Alert>
            )}

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
