"use client";
import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import {
    Box, Typography, Button, Snackbar,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField, Alert
} from '@mui/material';
import { useSession } from 'next-auth/react';
import UserHeader from '@/app/components/clients/profile/header';
import UserDetailsForm from '@/app/components/clients/profile/details';
import UserImage from '@/app/components/clients/profile/image';
import UsersService from '@/services/users';
import { useRepairs } from '@/app/context/repairs.context';
import NewRepairStepper from '@/app/components/repairs/newRepairStepper.component';
import ClientRepairsTab from '@/app/components/clients/tabs/repairs';

const ViewUserPage = ({ params }) => {
    const resolvedParams = use(params);
    const [userID, setUserID] = useState(resolvedParams?.userID);
    const [user, setUser] = useState(null);
    const [updatedUser, setUpdatedUser] = useState({});
    const { repairs, setRepairs } = useRepairs();
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState('info');
    const [hasChanges, setHasChanges] = useState(false);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(0);
    const [open, setOpen] = useState(false);
    const router = useRouter();
    const { data: session } = useSession();

    // Promote-to-affiliate modal state
    const [promoteDialogOpen, setPromoteDialogOpen] = useState(false);
    const [affiliateRate, setAffiliateRate] = useState('10');
    const [promoteLoading, setPromoteLoading] = useState(false);
    const [promoteError, setPromoteError] = useState('');

    const canPromote = session?.user?.role === 'admin' || session?.user?.role === 'dev';

    const handlePromoteAffiliate = async () => {
        setPromoteLoading(true);
        setPromoteError('');
        try {
            const res = await fetch(`/api/users/${userID}/promote-affiliate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    commissionRate: parseFloat(affiliateRate) / 100,
                }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || 'Failed to promote user.');
            setUser((prev) => ({ ...prev, role: 'affiliate' }));
            setUpdatedUser((prev) => ({ ...prev, role: 'affiliate' }));
            setPromoteDialogOpen(false);
            setSnackbarMessage('User promoted to affiliate. They can set their referral code from their dashboard.');
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
        } catch (err) {
            setPromoteError(err.message);
        } finally {
            setPromoteLoading(false);
        }
    };

    useEffect(() => {
        console.log("✅ Repairs in context at component mount:", repairs);
        console.log("✅ Current User ID:", userID);
    }, [repairs, userID]);

    useEffect(() => {
        const fetchUser = async () => {
            if (userID) {
                try {
                    const fetchedUser = await UsersService.getUserByQuery(userID);
                    console.log("✅ Fetched User Data:", fetchedUser);
                    setUser(fetchedUser);
                    setUpdatedUser(fetchedUser);
                    setLoading(false);
                } catch (error) {
                    console.error("❌ Failed to fetch user:", error);
                }
            }
        };

        fetchUser();
    }, [userID]);

    const handleTabChange = (event, newValue) => {
        console.log("🟡 Tab Changed:", newValue);
        setActiveTab(newValue);
    };

    const handleEditChange = (field, value) => {
        console.log(`✏️ Editing Field: ${field}, Value: ${value}`);
        setUpdatedUser(prev => ({ ...prev, [field]: value }));
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
            console.log("📦 Saving Updated User Data:", updatedUser);
            await UsersService.updateUser(userID, updatedUser);

            setSnackbarMessage("✅ User saved successfully!");
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
            setHasChanges(false);
        } catch (error) {
            console.error("❌ Error Saving User:", error);
            setSnackbarMessage(`❌ Error saving user: ${error.message}`);
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        } finally {
            setLoading(false);
        }
    };

    const handleNewRepair = (newRepair) => {
        console.log("🛠️ New Repair Added:", newRepair);
        setRepairs((prev) => [...prev, newRepair]);
    };

    if (loading) {
        console.log("⏳ Loading User Data...");
        return <Typography>Loading user data...</Typography>;
    }

    // ✅ Filtering repairs using userID correctly
    const userRepairs = repairs.filter(repair => {
        const match = repair.userID === userID;
        console.log(`🔧 Repair ID: ${repair.repairID}, Match: ${match}`);
        return match;
    });

    console.log("🔧 Filtered Repairs for User:", userRepairs);

    return (
        <Box sx={{ pb: 10 }}>
            {/* User Header with Tabs Integrated */}
            <UserHeader
                onSave={handleSaveChanges}
                hasChanges={hasChanges}
                user={updatedUser}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
            />

            {/* Tab Content Handling */}
            {activeTab === 0 && (
                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4, mt: 3 }}>
                    <UserImage picture={updatedUser.image} />
                    <Box sx={{ flex: 1 }}>
                        <UserDetailsForm user={updatedUser} onEdit={handleEditChange} />
                        {canPromote && updatedUser.role !== 'affiliate' && (
                            <Box sx={{ mt: 3 }}>
                                <Button
                                    variant="outlined"
                                    color="secondary"
                                    onClick={() => { setPromoteError(''); setAffiliateRate('10'); setPromoteDialogOpen(true); }}
                                >
                                    Promote to Affiliate
                                </Button>
                            </Box>
                        )}
                    </Box>
                </Box>
            )}

            {activeTab === 1 && (
                <Box sx={{ mt: 3 }}>
                    <ClientRepairsTab userID={userID} />
                </Box>
            )}

            {/* Snackbar */}
            <Snackbar
                open={snackbarOpen}
                autoHideDuration={6000}
                onClose={() => setSnackbarOpen(false)}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
                <Alert
                    onClose={() => setSnackbarOpen(false)}
                    severity={snackbarSeverity}
                    action={
                        hasChanges && snackbarSeverity === "warning" ? (
                            <Button color="inherit" size="small" onClick={handleSaveChanges}>Save Now</Button>
                        ) : undefined
                    }
                >
                    {snackbarMessage}
                </Alert>
            </Snackbar>

            {/* New Repair Stepper */}
            <NewRepairStepper
                open={open}
                onClose={() => setOpen(false)}
                onSubmit={handleNewRepair}
            />

            {/* Promote to Affiliate Dialog */}
            <Dialog open={promoteDialogOpen} onClose={() => setPromoteDialogOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Promote to Affiliate</DialogTitle>
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
                    {promoteError && <Alert severity="error">{promoteError}</Alert>}
                    <Typography variant="body2" color="text.secondary">
                        {updatedUser.firstName} will be promoted to affiliate. They can set their own referral code from their dashboard.
                    </Typography>
                    <TextField
                        label="Commission Rate (%)"
                        type="number"
                        value={affiliateRate}
                        onChange={(e) => setAffiliateRate(e.target.value)}
                        inputProps={{ min: 0, max: 100, step: 1 }}
                        fullWidth
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPromoteDialogOpen(false)} disabled={promoteLoading}>Cancel</Button>
                    <Button onClick={handlePromoteAffiliate} variant="contained" disabled={promoteLoading}>
                        {promoteLoading ? 'Promoting...' : 'Promote'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ViewUserPage;
