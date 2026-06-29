"use client";
import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
    Box,
    Typography,
    Breadcrumbs,
    Link,
    Snackbar,
    Alert,
    CircularProgress,
    Grid,
} from '@mui/material';
import ArtisanHeader from '@/app/components/artisans/profile/header';
import ArtisanDetailsForm from '@/app/components/artisans/profile/details';
import ArtisanVendorProfile from '@/app/components/artisans/profile/vendorProfile';
import ArtisanImage from '@/app/components/artisans/profile/image';
import ArtisanStaffCapabilities from '@/app/components/artisans/profile/staffCapabilities';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';
import BenchWorkCard from '@/app/dashboard/repairs/my-bench/components/BenchWorkCard';

const ViewArtisanPage = ({ params }) => {
    const resolvedParams = use(params);
    const { data: session } = useSession();
    const [userID, setUserID] = useState(resolvedParams?.userID);
    const [artisan, setArtisan] = useState(null);
    const [updatedArtisan, setUpdatedArtisan] = useState({});
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState('info');
    const [hasChanges, setHasChanges] = useState(false);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(0);
    const [benchLoading, setBenchLoading] = useState(false);
    const [benchError, setBenchError] = useState('');
    const [benchOrders, setBenchOrders] = useState([]); // unified work orders for this artisan
    const [benchJewelers, setBenchJewelers] = useState([]); // hand-off targets
    const [benchBusy, setBenchBusy] = useState(false);
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

    const isAdminViewer = ['admin', 'dev'].includes(session?.user?.role);

    const loadBench = React.useCallback(async () => {
        if (!userID || !isAdminViewer) return;
        setBenchLoading(true);
        setBenchError('');
        try {
            const res = await fetch(`/api/bench/my-bench?userID=${encodeURIComponent(userID)}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to load artisan bench.');
            setBenchOrders(Array.isArray(data) ? data : []);
        } catch (error) {
            setBenchError(error.message);
        } finally {
            setBenchLoading(false);
        }
    }, [userID, isAdminViewer]);

    useEffect(() => {
        if (activeTab !== 3) return;
        loadBench();
        fetch('/api/repairs/bench-jewelers').then((r) => (r.ok ? r.json() : [])).then(setBenchJewelers).catch(() => setBenchJewelers([]));
    }, [activeTab, loadBench]);

    // Admin drives the artisan's job through a bench stage (move-to-qc, handoff, etc.).
    // Labor is attributed to the job's assignee, so advancing it credits the artisan.
    const onBenchAction = async (wo, action, body = {}) => {
        setBenchBusy(true);
        setBenchError('');
        try {
            const res = await fetch(`/api/bench/work-orders/${wo.workOrderID}/${action}`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
            });
            if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Action failed');
            setSnackbarMessage('Bench updated'); setSnackbarSeverity('success'); setSnackbarOpen(true);
            await loadBench();
        } catch (e) {
            setBenchError(e.message);
        } finally {
            setBenchBusy(false);
        }
    };

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

                {activeTab === 2 && (
                    <ArtisanStaffCapabilities
                        artisan={updatedArtisan}
                        onFieldChange={handleEditChange}
                    />
                )}

                {activeTab === 3 && (
                    <Box>
                        <Box sx={{ backgroundColor: REPAIRS_UI.bgPanel, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 3, p: 2, mb: 3 }}>
                            <Typography sx={{ color: REPAIRS_UI.textHeader, fontWeight: 700, mb: 0.5 }}>
                                {artisan.firstName} {artisan.lastName} — My Bench
                            </Typography>
                            <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary }}>
                                This artisan&apos;s active work orders. You can move a job through its stages on their
                                behalf — labor is still credited to them.
                            </Typography>
                        </Box>

                        {benchError && <Alert severity="error" sx={{ mb: 2 }}>{benchError}</Alert>}

                        {benchLoading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
                                <CircularProgress sx={{ color: REPAIRS_UI.accent }} />
                            </Box>
                        ) : benchOrders.length === 0 ? (
                            <Box sx={{ bgcolor: REPAIRS_UI.bgPanel, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 3, py: 6, textAlign: 'center' }}>
                                <Typography sx={{ color: REPAIRS_UI.textHeader }}>Nothing on bench</Typography>
                                <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary, mt: 0.5 }}>
                                    This artisan has no active work orders.
                                </Typography>
                            </Box>
                        ) : (
                            <Grid container spacing={2}>
                                {benchOrders.map((wo) => (
                                    <Grid item xs={12} sm={6} xl={4} key={wo.workOrderID}>
                                        <BenchWorkCard
                                            wo={wo}
                                            currentUserID={session?.user?.userID}
                                            isAdmin
                                            jewelers={benchJewelers}
                                            busy={benchBusy}
                                            onAction={onBenchAction}
                                            onOpenPartsDialog={() => router.push(`/dashboard/repairs/${wo.sourceID}`)}
                                        />
                                    </Grid>
                                ))}
                            </Grid>
                        )}
                    </Box>
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
