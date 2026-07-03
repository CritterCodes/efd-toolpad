"use client";
import React, { useState, useEffect, use } from 'react';
import { Box, Typography, Button, Snackbar, Alert, CircularProgress } from '@mui/material';
import { wholesaleClient } from '@/api-clients/wholesale.client';
import WholesalerHeader from '@/app/components/users/wholesale/profile/header';
import WholesalerDetailsForm from '@/app/components/users/wholesale/profile/details';
import WholesalerRepairsTab from '@/app/components/users/wholesale/profile/repairs';

const PROFILE_FIELDS = [
    'businessName',
    'businessAddress',
    'businessCity',
    'businessState',
    'businessZip',
    'businessCountry',
    'contactFirstName',
    'contactLastName',
    'contactTitle',
    'contactEmail',
    'contactPhone',
];

function buildProfileForm(wholesaler = {}) {
    const profile = wholesaler.wholesaleApplication || {};
    return {
        businessName: profile.businessName || wholesaler.businessName || wholesaler.business || '',
        businessAddress: profile.businessAddress || '',
        businessCity: profile.businessCity || '',
        businessState: profile.businessState || '',
        businessZip: profile.businessZip || '',
        businessCountry: profile.businessCountry || 'United States',
        contactFirstName: profile.contactFirstName || wholesaler.firstName || '',
        contactLastName: profile.contactLastName || wholesaler.lastName || '',
        contactTitle: profile.contactTitle || '',
        contactEmail: profile.contactEmail || wholesaler.email || '',
        contactPhone: profile.contactPhone || wholesaler.contactPhone || wholesaler.phoneNumber || '',
    };
}

const ViewWholesalerPage = ({ params }) => {
    const resolvedParams = use(params);
    const wholesalerId = resolvedParams?.wholesalerId;

    const [wholesaler, setWholesaler] = useState(null);
    const [profileForm, setProfileForm] = useState({});
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [saving, setSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [activeTab, setActiveTab] = useState(0);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState('info');

    useEffect(() => {
        const fetchWholesaler = async () => {
            if (!wholesalerId) return;
            try {
                setLoading(true);
                const result = await wholesaleClient.getWholesaler(wholesalerId);
                const data = result?.data;
                if (!data) throw new Error('Wholesaler not found');
                setWholesaler(data);
                setProfileForm(buildProfileForm(data));
                setLoadError('');
            } catch (error) {
                console.error('❌ Failed to fetch wholesaler:', error);
                setLoadError(error.message || 'Failed to load wholesaler');
            } finally {
                setLoading(false);
            }
        };
        fetchWholesaler();
    }, [wholesalerId]);

    const handleEditChange = (field, value) => {
        setProfileForm((prev) => ({ ...prev, [field]: value }));
        setHasChanges(true);
        setSnackbarMessage('⚠️ Unsaved changes detected! Please save.');
        setSnackbarSeverity('warning');
        setSnackbarOpen(true);
    };

    const handleSaveChanges = async () => {
        try {
            setSaving(true);
            const payload = PROFILE_FIELDS.reduce((acc, field) => {
                acc[field] = profileForm[field] || '';
                return acc;
            }, {});
            const result = await wholesaleClient.updateWholesaler(
                wholesaler?.id || wholesaler?.userID || wholesalerId,
                { wholesaleApplication: payload }
            );
            if (result?.data) {
                setWholesaler(result.data);
                setProfileForm(buildProfileForm(result.data));
            }
            setHasChanges(false);
            setSnackbarMessage('✅ Wholesaler saved successfully!');
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
        } catch (error) {
            console.error('❌ Error saving wholesaler:', error);
            setSnackbarMessage(`❌ Error saving wholesaler: ${error.message}`);
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (loadError || !wholesaler) {
        return (
            <Box sx={{ p: 4 }}>
                <Alert severity="error" sx={{ mb: 2 }}>{loadError || 'Wholesaler not found.'}</Alert>
                <Button href="/dashboard/users/wholesalers">Back to Wholesalers</Button>
            </Box>
        );
    }

    return (
        <Box sx={{ p: { xs: 2, sm: 3 }, pb: 10 }}>
            <WholesalerHeader
                onSave={handleSaveChanges}
                hasChanges={hasChanges}
                wholesaler={wholesaler}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
            />

            {activeTab === 0 && (
                <Box>
                    <WholesalerDetailsForm
                        profile={profileForm}
                        wholesaler={wholesaler}
                        onEdit={handleEditChange}
                    />
                    <Box sx={{ px: 3 }}>
                        <Button
                            variant="contained"
                            onClick={handleSaveChanges}
                            disabled={!hasChanges || saving}
                        >
                            {saving ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </Box>
                </Box>
            )}

            {activeTab === 1 && (
                <Box sx={{ mt: 1 }}>
                    <WholesalerRepairsTab wholesaler={wholesaler} />
                </Box>
            )}

            <Snackbar
                open={snackbarOpen}
                autoHideDuration={6000}
                onClose={() => setSnackbarOpen(false)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert
                    onClose={() => setSnackbarOpen(false)}
                    severity={snackbarSeverity}
                    action={
                        hasChanges && snackbarSeverity === 'warning' ? (
                            <Button color="inherit" size="small" onClick={handleSaveChanges}>Save Now</Button>
                        ) : undefined
                    }
                >
                    {snackbarMessage}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default ViewWholesalerPage;
