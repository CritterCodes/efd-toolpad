"use client";
import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
    Box,
    Typography,
    Button,
    Breadcrumbs,
    Link,
    Snackbar,
    Alert,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Grid,
    Stack,
} from '@mui/material';
import ArtisanHeader from '@/app/components/artisans/profile/header';
import ArtisanDetailsForm from '@/app/components/artisans/profile/details';
import ArtisanVendorProfile from '@/app/components/artisans/profile/vendorProfile';
import ArtisanImage from '@/app/components/artisans/profile/image';
import ArtisanStaffCapabilities from '@/app/components/artisans/profile/staffCapabilities';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';
import RepairThumbnail from '@/app/dashboard/repairs/components/RepairThumbnail';
import {
    BENCH_QUEUE,
    BENCH_TABS,
    isRepairInBenchTab,
    normalizeRepairWorkflow,
} from '@/services/repairWorkflow';

const BENCH_STATUS_COLOR = {
    IN_PROGRESS: '#0088FE',
    UNCLAIMED: REPAIRS_UI.textMuted,
    COMMUNICATIONS: '#A855F7',
    WAITING_PARTS: '#FF8042',
    QC: '#00C49F',
};

function ArtisanBenchCard({ repair, onOpenRepair }) {
    return (
        <Card
            sx={{
                bgcolor: REPAIRS_UI.bgPanel,
                border: `1px solid ${REPAIRS_UI.border}`,
                borderRadius: 2,
            }}
        >
            <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted, fontFamily: 'monospace' }}>
                        {repair.repairID}
                    </Typography>
                    <Chip
                        label={repair.benchStatus || 'UNCLAIMED'}
                        size="small"
                        sx={{
                            bgcolor: BENCH_STATUS_COLOR[repair.benchStatus] ?? REPAIRS_UI.bgCard,
                            color: '#fff',
                            fontSize: '0.65rem',
                            height: 20,
                        }}
                    />
                </Box>

                <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'flex-start' }}>
                    <RepairThumbnail repair={repair} size={82} />
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography variant="subtitle2" sx={{ color: REPAIRS_UI.textHeader, fontWeight: 600, mb: 0.5 }}>
                            {repair.clientName || repair.businessName}
                        </Typography>
                        <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary, mb: 1, fontSize: '0.8rem' }}>
                            {repair.description?.slice(0, 120)}{repair.description?.length > 120 ? '...' : ''}
                        </Typography>
                        {repair.promiseDate && (
                            <Typography variant="caption" sx={{ display: 'block', color: REPAIRS_UI.accent }}>
                                Due: {new Date(repair.promiseDate).toLocaleDateString()}
                            </Typography>
                        )}
                        {repair.assignedJeweler && (
                            <Typography variant="caption" sx={{ display: 'block', color: REPAIRS_UI.textMuted }}>
                                Assigned: {repair.assignedJeweler}
                            </Typography>
                        )}
                    </Box>
                </Box>

                <Button
                    size="small"
                    onClick={() => onOpenRepair(repair.repairID)}
                    sx={{ color: REPAIRS_UI.accent, mt: 1.5, px: 0 }}
                >
                    Open Repair
                </Button>
            </CardContent>
        </Card>
    );
}

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
    const [benchRepairs, setBenchRepairs] = useState([]);
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

    useEffect(() => {
        const loadBench = async () => {
            if (!userID || activeTab !== 3 || !['admin', 'dev'].includes(session?.user?.role)) {
                return;
            }

            setBenchLoading(true);
            setBenchError('');
            try {
                const res = await fetch(`/api/repairs/my-bench?userID=${encodeURIComponent(userID)}`);
                const data = await res.json();
                if (!res.ok) {
                    throw new Error(data.error || 'Failed to load artisan bench.');
                }
                setBenchRepairs(Array.isArray(data) ? data.map(normalizeRepairWorkflow) : []);
            } catch (error) {
                setBenchError(error.message);
            } finally {
                setBenchLoading(false);
            }
        };

        loadBench();
    }, [activeTab, session?.user?.role, userID]);

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

    const activeBenchUserID = artisan?.userID || userID;
    const byBenchTab = Object.fromEntries(
        BENCH_TABS.map(({ key }) => [key, benchRepairs.filter((repair) => isRepairInBenchTab(repair, key, activeBenchUserID))])
    );

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
                        <Box
                            sx={{
                                backgroundColor: REPAIRS_UI.bgPanel,
                                border: `1px solid ${REPAIRS_UI.border}`,
                                borderRadius: 3,
                                p: 2,
                                mb: 3,
                            }}
                        >
                            <Typography sx={{ color: REPAIRS_UI.textHeader, fontWeight: 700, mb: 0.5 }}>
                                {artisan.firstName} {artisan.lastName} - My Bench
                            </Typography>
                            <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary }}>
                                Read-only admin view of this artisan&apos;s current bench queue.
                            </Typography>
                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 2 }}>
                                {BENCH_TABS.map(({ label, key }) => (
                                    <Chip
                                        key={key}
                                        label={`${label} ${byBenchTab[key]?.length ?? 0}`}
                                        size="small"
                                        sx={{ bgcolor: REPAIRS_UI.bgCard, color: REPAIRS_UI.textPrimary }}
                                    />
                                ))}
                            </Stack>
                        </Box>

                        {benchError && (
                            <Alert severity="error" sx={{ mb: 2 }}>
                                {benchError}
                            </Alert>
                        )}

                        {benchLoading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
                                <CircularProgress sx={{ color: REPAIRS_UI.accent }} />
                            </Box>
                        ) : benchRepairs.length === 0 ? (
                            <Box sx={{ bgcolor: REPAIRS_UI.bgPanel, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 3, py: 6, textAlign: 'center' }}>
                                <Typography sx={{ color: REPAIRS_UI.textHeader }}>Nothing on bench</Typography>
                                <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary, mt: 0.5 }}>
                                    This artisan has no active repairs visible in My Bench.
                                </Typography>
                            </Box>
                        ) : (
                            <Stack spacing={3}>
                                {BENCH_TABS.map(({ label, key }) => {
                                    const repairsForTab = byBenchTab[key] || [];
                                    if (repairsForTab.length === 0) return null;

                                    return (
                                        <Box key={key}>
                                            <Typography sx={{ color: REPAIRS_UI.textHeader, fontWeight: 700, mb: 1.5 }}>
                                                {label} ({repairsForTab.length})
                                            </Typography>
                                            <Grid container spacing={2}>
                                                {repairsForTab.map((repair) => (
                                                    <Grid item xs={12} sm={6} xl={4} key={repair.repairID}>
                                                        <ArtisanBenchCard
                                                            repair={repair}
                                                            onOpenRepair={(repairID) => router.push(`/dashboard/repairs/${repairID}`)}
                                                        />
                                                    </Grid>
                                                ))}
                                            </Grid>
                                        </Box>
                                    );
                                })}
                            </Stack>
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
