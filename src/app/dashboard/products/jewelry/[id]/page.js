'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    Box, Typography, Grid, Button, CircularProgress, Alert,
    IconButton, Breadcrumbs, Link, Stack
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
import JewelryCadRequests from './components/JewelryCadRequests';

export default function JewelryEditorPage() {
    const router = useRouter();
    const params = useParams();
    const jewelryId = params.id;
    
    const {
        formData, handleInputChange, loading, saving, error, isNew,
        availableGemstones, metalPrices, cadRequests, cadDialogOpen,
        editingCadRequest, handleImageUpload, handleRemoveNewImage,
        handleRemoveExistingImage, handleFileUpload, handleDeleteFile,
        handleSave, handleOpenCadDialog, handleCloseCadDialog
    } = useJewelryEditor(jewelryId);

    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>;
    }

    return (
        <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 }, maxWidth: '100%', overflowX: 'hidden' }}>
            {/* Header */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: { xs: 'flex-start', sm: 'center' },
                    flexDirection: { xs: 'column', sm: 'row' },
                    gap: { xs: 2, sm: 0 },
                    mb: 3,
                }}
            >
                <IconButton
                    onClick={() => router.push('/dashboard/products/jewelry')}
                    sx={{ mr: { sm: 2 }, alignSelf: { xs: 'flex-start', sm: 'center' } }}
                    aria-label="Back to jewelry products"
                >
                    <ArrowBackIcon />
                </IconButton>
                <Box sx={{ flexGrow: 1, minWidth: 0, width: { xs: '100%', sm: 'auto' } }}>
                    <Typography variant="h4" sx={{ fontSize: { xs: '1.75rem', sm: '2.125rem' }, overflowWrap: 'anywhere' }}>
                        {isNew ? 'New Jewelry' : formData.title || 'Edit Jewelry'}
                    </Typography>
                    <Breadcrumbs aria-label="breadcrumb" sx={{ '& .MuiBreadcrumbs-ol': { flexWrap: 'wrap' } }}>
                        <Link color="inherit" href="/dashboard">Dashboard</Link>
                        <Link color="inherit" href="/dashboard/products/jewelry">Jewelry</Link>
                        <Typography color="text.primary">{isNew ? 'New' : 'Edit'}</Typography>
                    </Breadcrumbs>
                </Box>
                <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1.5}
                    sx={{ width: { xs: '100%', sm: 'auto' } }}
                >
                    <Button
                        variant="outlined" startIcon={<DraftsIcon />}
                        onClick={() => handleSave('draft')} disabled={saving}
                        fullWidth
                    >
                        Save Draft
                    </Button>
                    <Button
                        variant="contained" startIcon={<PublishIcon />}
                        onClick={() => handleSave('active')} disabled={saving}
                        fullWidth
                    >
                        Publish
                    </Button>
                </Stack>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

            <Grid container spacing={3}>
                {/* Left Column - Main Info */}
                <Grid item xs={12} md={8}>
                    <JewelryBasicInfo 
                        formData={formData} 
                        handleInputChange={handleInputChange} 
                    />

                    <JewelryMaterials 
                        formData={formData} 
                        handleInputChange={handleInputChange}
                        availableGemstones={availableGemstones}
                    />

                    <JewelryPricing 
                        stlFile={formData.stlFile}
                        pricingData={formData.dynamicPricing}
                        onChange={(val) => handleInputChange('dynamicPricing', val)}
                        metalPrices={metalPrices}
                    />

                    <JewelryMedia 
                        formData={formData}
                        isNew={isNew}
                        handleImageUpload={handleImageUpload}
                        handleRemoveNewImage={handleRemoveNewImage}
                        handleRemoveExistingImage={handleRemoveExistingImage}
                        handleFileUpload={handleFileUpload}
                        handleDeleteFile={handleDeleteFile}
                    />

                    <JewelryCadRequests 
                        cadRequests={cadRequests}
                        editingCadRequest={editingCadRequest}
                        cadDialogOpen={cadDialogOpen}
                        handleOpenCadDialog={handleOpenCadDialog}
                        handleCloseCadDialog={handleCloseCadDialog}
                    />
                </Grid>

                {/* Right Column - Status & Actions */}
                <Grid item xs={12} md={4}>
                    <JewelryPublishing 
                        formData={formData}
                        handleInputChange={handleInputChange}
                        handleSave={handleSave}
                        saving={saving}
                    />
                </Grid>
            </Grid>
        </Box>
    );
}
