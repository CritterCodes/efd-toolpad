'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    Box, Typography, Grid, Button, CircularProgress, Alert,
    IconButton, Breadcrumbs, Stack, Link
} from '@mui/material';
import {
    ArrowBack as ArrowBackIcon, Publish as PublishIcon,
    Drafts as DraftsIcon
} from '@mui/icons-material';

import { useJewelryEditor } from '@/hooks/jewelry/useJewelryEditor';
import JewelryBasicInfo from './components/JewelryBasicInfo';
import JewelryMaterials from './components/JewelryMaterials';
import JewelryPricing from './components/JewelryPricing';
import JewelryMedia from './components/JewelryMedia';
import JewelryPublishing from './components/JewelryPublishing';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';

export default function JewelryEditorPage() {
    const router = useRouter();
    const params = useParams();
    const jewelryId = params.id;

    const {
        formData, handleInputChange, loading, saving, error, isNew,
        availableGemstones, metalPrices, handleImageUpload, handleRemoveNewImage,
        handleRemoveExistingImage, handleFileUpload, handleDeleteFile,
        handleSave
    } = useJewelryEditor(jewelryId);

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
                <CircularProgress sx={{ color: REPAIRS_UI.accent }} />
            </Box>
        );
    }

    return (
        <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 }, maxWidth: '100%', overflowX: 'hidden' }}>
            {/* Header */}
            <Box sx={{
                display: 'flex',
                alignItems: { xs: 'flex-start', sm: 'center' },
                flexDirection: { xs: 'column', sm: 'row' },
                gap: { xs: 2, sm: 0 },
                mb: 3,
            }}>
                <IconButton
                    onClick={() => router.push('/dashboard/products/jewelry')}
                    sx={{ mr: { sm: 2 }, alignSelf: { xs: 'flex-start', sm: 'center' }, color: REPAIRS_UI.textSecondary }}
                    aria-label="Back to jewelry products"
                >
                    <ArrowBackIcon />
                </IconButton>
                <Box sx={{ flexGrow: 1, minWidth: 0, width: { xs: '100%', sm: 'auto' } }}>
                    <Typography sx={{ fontSize: { xs: '1.75rem', sm: '2.125rem' }, fontWeight: 600, color: REPAIRS_UI.textHeader, overflowWrap: 'anywhere' }}>
                        {isNew ? 'New Jewelry' : formData.title || 'Edit Jewelry'}
                    </Typography>
                    <Breadcrumbs aria-label="breadcrumb" sx={{ '& .MuiBreadcrumbs-ol': { flexWrap: 'wrap' }, '& .MuiBreadcrumbs-separator': { color: REPAIRS_UI.textMuted } }}>
                        <Link href="/dashboard" sx={{ color: REPAIRS_UI.textSecondary, '&:hover': { color: REPAIRS_UI.accent } }} underline="hover">Dashboard</Link>
                        <Link href="/dashboard/products/jewelry" sx={{ color: REPAIRS_UI.textSecondary, '&:hover': { color: REPAIRS_UI.accent } }} underline="hover">Jewelry</Link>
                        <Typography sx={{ color: REPAIRS_UI.textHeader }}>{isNew ? 'New' : 'Edit'}</Typography>
                    </Breadcrumbs>
                </Box>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ width: { xs: '100%', sm: 'auto' } }}>
                    <Button
                        variant="outlined" startIcon={<DraftsIcon />}
                        onClick={() => handleSave('draft')} disabled={saving}
                        fullWidth
                        sx={{ borderColor: REPAIRS_UI.border, color: REPAIRS_UI.textPrimary, '&:hover': { borderColor: REPAIRS_UI.accent, backgroundColor: REPAIRS_UI.bgCard } }}
                    >
                        Save Draft
                    </Button>
                    <Button
                        variant="contained" startIcon={<PublishIcon />}
                        onClick={() => handleSave('active')} disabled={saving}
                        fullWidth
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
                    <JewelryBasicInfo formData={formData} handleInputChange={handleInputChange} />
                    <JewelryMaterials formData={formData} handleInputChange={handleInputChange} availableGemstones={availableGemstones} />
                    <JewelryPricing stlFile={formData.stlFile} pricingData={formData.dynamicPricing} onChange={(val) => handleInputChange('dynamicPricing', val)} metalPrices={metalPrices} />
                    <JewelryMedia
                        formData={formData}
                        isNew={isNew}
                        handleImageUpload={handleImageUpload}
                        handleRemoveNewImage={handleRemoveNewImage}
                        handleRemoveExistingImage={handleRemoveExistingImage}
                        handleFileUpload={handleFileUpload}
                        handleDeleteFile={handleDeleteFile}
                    />
                </Grid>
                <Grid item xs={12} md={4}>
                    <JewelryPublishing formData={formData} handleInputChange={handleInputChange} handleSave={handleSave} saving={saving} />
                </Grid>
            </Grid>
        </Box>
    );
}
