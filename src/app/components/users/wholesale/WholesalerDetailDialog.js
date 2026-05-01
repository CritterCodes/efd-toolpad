import React from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import {
  Email as EmailIcon,
  Phone as PhoneIcon,
  Storefront as StoreIcon,
} from '@mui/icons-material';

function formatDate(date) {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getProfileLabel(wholesaler) {
  if (wholesaler.reconciliationState === 'legacy_missing_profile') {
    return { label: 'Legacy repair needed', color: 'warning' };
  }

  if (wholesaler.reconciliationState === 'reconciled') {
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

export default function WholesalerDetailDialog({ open, onClose, wholesaler }) {
  if (!wholesaler) return null;

  const profile = wholesaler.wholesaleApplication || {};
  const profileState = getProfileLabel(wholesaler);
  const email = profile.contactEmail || wholesaler.email;
  const phone = profile.contactPhone || wholesaler.contactPhone || wholesaler.phoneNumber;
  const displayName = [profile.contactFirstName || wholesaler.firstName, profile.contactLastName || wholesaler.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ pr: 4 }}>
          <StoreIcon color="primary" />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" noWrap>
              {profile.businessName || wholesaler.businessName || wholesaler.business || 'Wholesale Account'}
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              {displayName || email || wholesaler.userID}
            </Typography>
          </Box>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5}>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Chip label={profileState.label} color={profileState.color} size="small" />
            <Chip label={`Role: ${wholesaler.role || 'N/A'}`} size="small" variant="outlined" />
            <Chip label={`Joined ${formatDate(wholesaler.createdAt)}`} size="small" variant="outlined" />
          </Stack>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom>
                Contact
              </Typography>
              <DetailRow label="Name" value={displayName} />
              <DetailRow label="Email" value={email} />
              <DetailRow label="Phone" value={phone} />
              <DetailRow label="Title" value={profile.contactTitle} />
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom>
                Business
              </Typography>
              <DetailRow label="Business Name" value={profile.businessName || wholesaler.businessName || wholesaler.business} />
              <DetailRow label="Address" value={profile.businessAddress} />
              <DetailRow
                label="City / State / Zip"
                value={[profile.businessCity, profile.businessState, profile.businessZip].filter(Boolean).join(', ')}
              />
              <DetailRow label="Country" value={profile.businessCountry} />
            </Grid>
          </Grid>

          <Divider />

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom>
                Account
              </Typography>
              <DetailRow label="User ID" value={wholesaler.userID} />
              <DetailRow label="Application ID" value={profile.applicationId} />
              <DetailRow label="Profile Source" value={profile.source} />
              <DetailRow label="Application Status" value={profile.status} />
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom>
                Reconciliation
              </Typography>
              <DetailRow label="Reviewed By" value={profile.reviewedBy} />
              <DetailRow label="Reviewed At" value={formatDate(profile.reviewedAt)} />
              <DetailRow label="Reconciled By" value={profile.reconciledBy} />
              <DetailRow label="Reconciled At" value={formatDate(profile.reconciledAt)} />
            </Grid>
          </Grid>

          {profile.reviewNotes && (
            <>
              <Divider />
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Notes
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {profile.reviewNotes}
                </Typography>
              </Box>
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          {email && (
            <Button startIcon={<EmailIcon />} href={`mailto:${email}`}>
              Email
            </Button>
          )}
          {phone && (
            <Button startIcon={<PhoneIcon />} href={`tel:${phone}`}>
              Call
            </Button>
          )}
        </Stack>
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
