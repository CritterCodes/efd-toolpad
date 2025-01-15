"use client";
import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Typography, Button, Breadcrumbs, Link, Snackbar } from '@mui/material';
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
        <Box sx={{ padding: { xs: '10px', sm: '20px' } }}>
            {/* Breadcrumbs */}
            <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
                <Link underline="hover" color="inherit" onClick={() => router.push('/dashboard')} sx={{ cursor: 'pointer' }}>
                    Dashboard
                </Link>
                <Link underline="hover" color="inherit" onClick={() => router.push('/dashboard/clients')} sx={{ cursor: 'pointer' }}>
                    Clients
                </Link>
                <Typography color="text.primary">User Profile</Typography>
            </Breadcrumbs>

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
                    <UserDetailsForm user={updatedUser} onEdit={handleEditChange} />
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
                message={snackbarMessage}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
                ContentProps={{
                    sx: {
                        backgroundColor: snackbarSeverity === "success"
                            ? "green"
                            : snackbarSeverity === "error"
                                ? "red"
                                : "orange",
                        color: "white",
                        fontWeight: "bold"
                    }
                }}
                action={
                    hasChanges && snackbarSeverity === "warning" ? (
                        <Button color="inherit" size="small" onClick={handleSaveChanges}>
                            Save Now
                        </Button>
                    ) : (
                        <Button color="inherit" size="small" onClick={() => setSnackbarOpen(false)}>
                            Close
                        </Button>
                    )
                }
            />

            {/* New Repair Stepper */}
            <NewRepairStepper
                open={open}
                onClose={() => setOpen(false)}
                onSubmit={handleNewRepair}
            />
        </Box>
    );
};

export default ViewUserPage;
