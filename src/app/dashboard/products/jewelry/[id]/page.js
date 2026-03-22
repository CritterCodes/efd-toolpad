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
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <IconButton onClick={() => router.push('/dashboard/products/jewelry')} sx={{ mr: 2 }}>
                    <ArrowBackIcon />
                </IconButton>
                <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h4">
                        {isNew ? 'New Jewelry' : formData.title || 'Edit Jewelry'}
                    </Typography>
                    <Breadcrumbs aria-label="breadcrumb">
                        <Link color="inherit" href="/dashboard">Dashboard</Link>
                        <Link color="inherit" href="/dashboard/products/jewelry">Jewelry</Link>
                        <Typography color="text.primary">{isNew ? 'New' : 'Edit'}</Typography>
                    </Breadcrumbs>
                </Box>
                <Stack direction="row" spacing={2}>
                    <Button
                        variant="outlined" startIcon={<DraftsIcon />}
                        onClick={() => handleSave('draft')} disabled={saving}
                    >
                        Save Draft
                    </Button>
                    <Button
                        variant="contained" startIcon={<PublishIcon />}
                        onClick={() => handleSave('active')} disabled={saving}
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
