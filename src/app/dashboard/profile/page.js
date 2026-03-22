'use client';

import React from 'react';
import { 
    Box, 
    Container, 
    Typography, 
    Button, 
    CircularProgress, 
    Alert,
    Snackbar
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';
import { useArtisanProfile } from '@/hooks/user/useArtisanProfile';

import ProfileImagesSection from './components/ProfileImagesSection';
import BusinessInfoSection from './components/BusinessInfoSection';
import SpecialtiesServicesSection from './components/SpecialtiesServicesSection';
import LocationInfoSection from './components/LocationInfoSection';
import OnlinePresenceSection from './components/OnlinePresenceSection';

export default function ArtisanProfilePage() {
    const {
        profileData,
        loading,
        saving,
        saveStatus,
        profileImagePreview,
        coverImagePreview,
        handleInputChange,
        handleImageUpload,
        handleSave
    } = useArtisanProfile();

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <Typography variant="h4" component="h1">
                    Artisan Profile
                </Typography>
                <Button
                    variant="contained"
                    startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                    onClick={handleSave}
                    disabled={saving}
                >
                    {saving ? 'Saving...' : 'Save Profile'}
                </Button>
            </Box>

            <ProfileImagesSection 
                profileImagePreview={profileImagePreview}
                coverImagePreview={coverImagePreview}
                handleImageUpload={handleImageUpload}
            />

            <Box sx={{ mt: 4, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 4 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <BusinessInfoSection 
                        profileData={profileData}
                        handleInputChange={handleInputChange}
                    />
                    
                    <SpecialtiesServicesSection 
                        profileData={profileData}
                        handleInputChange={handleInputChange}
                    />
                </Box>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <LocationInfoSection 
                        profileData={profileData}
                        handleInputChange={handleInputChange}
                    />
                    
                    <OnlinePresenceSection 
                        profileData={profileData}
                        handleInputChange={handleInputChange}
                    />
                </Box>
            </Box>

            {saveStatus && (
                <Snackbar 
                    open={!!saveStatus} 
                    autoHideDuration={6000} 
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                >
                    <Alert severity={saveStatus.type} sx={{ width: '100%' }}>
                        {saveStatus.message}
                    </Alert>
                </Snackbar>
            )}
        </Container>
    );
}
