"use client";
import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Typography, Button, Breadcrumbs, Link, Snackbar, Alert } from '@mui/material';
import ArtisanHeader from '@/app/components/artisans/profile/header';
import ArtisanDetailsForm from '@/app/components/artisans/profile/details';
import ArtisanVendorProfile from '@/app/components/artisans/profile/vendorProfile';
import ArtisanImage from '@/app/components/artisans/profile/image';

const ViewArtisanPage = ({ params }) => {
    const resolvedParams = use(params);
    const [userID, setUserID] = useState(resolvedParams?.userID);
    const [artisan, setArtisan] = useState(null);
    const [updatedArtisan, setUpdatedArtisan] = useState({});
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState('info');
    const [hasChanges, setHasChanges] = useState(false);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(0);
    const router = useRouter();

    useEffect(() => {
        const fetchArtisan = async () => {
            if (userID) {
                try {
                    const response = await fetch(`/api/users/${userID}`);
                    const data = await response.json();
                    
                    if (data.success) {
                        console.log("✅ Fetched Artisan Data:", data.data);
                        setArtisan(data.data);
                        setUpdatedArtisan(data.data);
                    } else {
                        console.error("❌ Failed to fetch artisan:", data.error);
                    }
                    setLoading(false);
                } catch (error) {
                    console.error("❌ Failed to fetch artisan:", error);
                    setLoading(false);
                }
            }
        };

        fetchArtisan();
    }, [userID]);

    const handleTabChange = (event, newValue) => {
        console.log("🟡 Tab Changed:", newValue);
        setActiveTab(newValue);
    };

    const handleEditChange = (field, value) => {
        console.log(`✏️ Editing Field: ${field}, Value: ${value}`);
        setUpdatedArtisan(prev => ({ ...prev, [field]: value }));
        setHasChanges(true);
        setSnackbarMessage("⚠️ Unsaved changes detected! Please save.");
        setSnackbarSeverity('warning');
        setSnackbarOpen(true);
    };

    const handleSaveChanges = async () => {
        try {
            if (!userID) {
                console.error("❌ Missing User ID");
                setSnackbarMessage("❌ User ID is missing.");
                setSnackbarSeverity('error');
                setSnackbarOpen(true);
                return;
            }

            setLoading(true);
            console.log("📦 Saving Updated Artisan Data:", updatedArtisan);
            
            const response = await fetch(`/api/users/${userID}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedArtisan)
            });

            if (!response.ok) {
                throw new Error('Failed to update artisan');
            }

            setSnackbarMessage("✅ Artisan saved successfully!");
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
            setHasChanges(false);
            
            // Refresh artisan data
            const refreshResponse = await fetch(`/api/users/${userID}`);
            const refreshData = await refreshResponse.json();
            if (refreshData.success) {
                setArtisan(refreshData.data);
                setUpdatedArtisan(refreshData.data);
            }
            
        } catch (error) {
            console.error("❌ Error Saving Artisan:", error);
            setSnackbarMessage(`❌ Error saving artisan: ${error.message}`);
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <Typography>Loading artisan data...</Typography>;
    }

    if (!artisan) {
        return <Typography>Artisan not found</Typography>;
    }

    return (
        <Box sx={{ padding: 2 }}>
            {/* Breadcrumbs */}
            <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
                <Link underline="hover" color="inherit" href="/dashboard">
                    Dashboard
                </Link>
                <Link underline="hover" color="inherit" href="/dashboard/users/artisans">
                    Artisans
                </Link>
                <Typography color="text.primary">
                    {artisan.firstName} {artisan.lastName}
                </Typography>
            </Breadcrumbs>

            {/* Header with Tabs */}
            <ArtisanHeader
                onSave={handleSaveChanges}
                hasChanges={hasChanges}
                artisan={artisan}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
            />

            {/* Tab Content */}
            <Box sx={{ mt: 3 }}>
                {activeTab === 0 && (
                    <Box sx={{ display: 'flex', gap: 3 }}>
                        {/* Left Column - Image */}
                        <Box sx={{ flex: '0 0 300px' }}>
                            <ArtisanImage
                                artisan={updatedArtisan}
                                onImageChange={(imageUrl) => handleEditChange('image', imageUrl)}
                            />
                        </Box>

                        {/* Right Column - Details */}
                        <Box sx={{ flex: 1 }}>
                            <ArtisanDetailsForm
                                artisan={updatedArtisan}
                                onFieldChange={handleEditChange}
                            />
                        </Box>
                    </Box>
                )}

                {activeTab === 1 && (
                    <ArtisanVendorProfile
                        artisan={updatedArtisan}
                        onFieldChange={handleEditChange}
                    />
                )}
            </Box>

            {/* Snackbar for notifications */}
            <Snackbar
                open={snackbarOpen}
                autoHideDuration={6000}
                onClose={() => setSnackbarOpen(false)}
            >
                <Alert onClose={() => setSnackbarOpen(false)} severity={snackbarSeverity}>
                    {snackbarMessage}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default ViewArtisanPage;