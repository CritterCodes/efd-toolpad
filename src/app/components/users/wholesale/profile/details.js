import React from 'react';
import { Box, TextField, Grid, Typography, Chip, Stack, Divider } from '@mui/material';

function formatDate(date) {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

function getProfileLabel(wholesaler) {
    if (wholesaler?.reconciliationState === 'legacy_missing_profile') {
        return { label: 'Legacy repair needed', color: 'warning' };
    }
    if (wholesaler?.reconciliationState === 'reconciled') {
        return { label: 'Reconciled', color: 'success' };
    }
    return { label: 'Canonical profile', color: 'info' };
}

function DetailRow({ label, value }) {
    return (
        <Box sx={{ mb: 1.25 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                {label}
            </Typography>
            <Typography variant="body2">{value || 'N/A'}</Typography>
        </Box>
    );
}

const WholesalerDetailsForm = ({ profile, wholesaler, onEdit }) => {
    const profileState = getProfileLabel(wholesaler);
    const meta = wholesaler?.wholesaleApplication || {};

    return (
        <Box sx={{ flex: 1, padding: 3 }}>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 3 }}>
                <Chip label={profileState.label} color={profileState.color} size="small" />
                <Chip label={`Role: ${wholesaler?.role || 'N/A'}`} size="small" variant="outlined" />
                <Chip label={`Joined ${formatDate(wholesaler?.createdAt)}`} size="small" variant="outlined" />
            </Stack>

            <Grid container spacing={2}>
                {/* Business Information */}
                <Grid item xs={12}>
                    <Typography variant="subtitle1" gutterBottom>Business</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                    <TextField
                        label="Business Name"
                        value={profile.businessName || ''}
                        onChange={(e) => onEdit('businessName', e.target.value)}
                        fullWidth
                    />
                </Grid>
                <Grid item xs={12} sm={6}>
                    <TextField
                        label="Address"
                        value={profile.businessAddress || ''}
                        onChange={(e) => onEdit('businessAddress', e.target.value)}
                        fullWidth
                    />
                </Grid>
                <Grid item xs={12} sm={4}>
                    <TextField
                        label="City"
                        value={profile.businessCity || ''}
                        onChange={(e) => onEdit('businessCity', e.target.value)}
                        fullWidth
                    />
                </Grid>
                <Grid item xs={6} sm={4}>
                    <TextField
                        label="State"
                        value={profile.businessState || ''}
                        onChange={(e) => onEdit('businessState', e.target.value)}
                        fullWidth
                    />
                </Grid>
                <Grid item xs={6} sm={4}>
                    <TextField
                        label="Zip"
                        value={profile.businessZip || ''}
                        onChange={(e) => onEdit('businessZip', e.target.value)}
                        fullWidth
                    />
                </Grid>
                <Grid item xs={12}>
                    <TextField
                        label="Country"
                        value={profile.businessCountry || ''}
                        onChange={(e) => onEdit('businessCountry', e.target.value)}
                        fullWidth
                    />
                </Grid>

                {/* Contact Information */}
                <Grid item xs={12} sx={{ mt: 1 }}>
                    <Typography variant="subtitle1" gutterBottom>Contact</Typography>
                </Grid>
                <Grid item xs={6}>
                    <TextField
                        label="First Name"
                        value={profile.contactFirstName || ''}
                        onChange={(e) => onEdit('contactFirstName', e.target.value)}
                        fullWidth
                    />
                </Grid>
                <Grid item xs={6}>
                    <TextField
                        label="Last Name"
                        value={profile.contactLastName || ''}
                        onChange={(e) => onEdit('contactLastName', e.target.value)}
                        fullWidth
                    />
                </Grid>
                <Grid item xs={12} sm={4}>
                    <TextField
                        label="Title"
                        value={profile.contactTitle || ''}
                        onChange={(e) => onEdit('contactTitle', e.target.value)}
                        fullWidth
                    />
                </Grid>
                <Grid item xs={12} sm={4}>
                    <TextField
                        label="Email"
                        type="email"
                        value={profile.contactEmail || ''}
                        onChange={(e) => onEdit('contactEmail', e.target.value)}
                        fullWidth
                    />
                </Grid>
                <Grid item xs={12} sm={4}>
                    <TextField
                        label="Phone"
                        value={profile.contactPhone || ''}
                        onChange={(e) => onEdit('contactPhone', e.target.value)}
                        fullWidth
                    />
                </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            {/* Read-only account & reconciliation info */}
            <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1" gutterBottom>Account</Typography>
                    <DetailRow label="User ID" value={wholesaler?.userID} />
                    <DetailRow label="Application ID" value={meta.applicationId} />
                    <DetailRow label="Profile Source" value={meta.source} />
                    <DetailRow label="Application Status" value={meta.status} />
                </Grid>
                <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1" gutterBottom>Reconciliation</Typography>
                    <DetailRow label="Reviewed By" value={meta.reviewedBy} />
                    <DetailRow label="Reviewed At" value={meta.reviewedAt ? formatDate(meta.reviewedAt) : null} />
                    <DetailRow label="Reconciled By" value={meta.reconciledBy} />
                    <DetailRow label="Reconciled At" value={meta.reconciledAt ? formatDate(meta.reconciledAt) : null} />
                </Grid>
            </Grid>

            {meta.reviewNotes && (
                <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>Notes</Typography>
                    <Typography variant="body2" color="text.secondary">{meta.reviewNotes}</Typography>
                </Box>
            )}
        </Box>
    );
};

export default WholesalerDetailsForm;
