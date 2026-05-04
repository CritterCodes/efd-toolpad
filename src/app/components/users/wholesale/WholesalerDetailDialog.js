import React, { useEffect, useState } from 'react';
import {
  Alert,
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
  TextField,
  Typography,
} from '@mui/material';
import {
  Edit as EditIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Print as PrintIcon,
  Save as SaveIcon,
  Storefront as StoreIcon,
} from '@mui/icons-material';
import Link from 'next/link';

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

const PROFILE_FIELDS = [
  { name: 'businessName', label: 'Business Name', section: 'business' },
  { name: 'businessAddress', label: 'Address', section: 'business' },
  { name: 'businessCity', label: 'City', section: 'business' },
  { name: 'businessState', label: 'State', section: 'business' },
  { name: 'businessZip', label: 'Zip', section: 'business' },
  { name: 'businessCountry', label: 'Country', section: 'business' },
  { name: 'contactFirstName', label: 'First Name', section: 'contact' },
  { name: 'contactLastName', label: 'Last Name', section: 'contact' },
  { name: 'contactTitle', label: 'Title', section: 'contact' },
  { name: 'contactEmail', label: 'Email', section: 'contact', type: 'email' },
  { name: 'contactPhone', label: 'Phone', section: 'contact' },
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

export default function WholesalerDetailDialog({ open, onClose, wholesaler, onSave, loading = false }) {
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (wholesaler) {
      setFormData(buildProfileForm(wholesaler));
      setSaveError('');
      setEditing(false);
    }
  }, [wholesaler, open]);

  if (!wholesaler) return null;

  const profile = wholesaler.wholesaleApplication || {};
  const profileState = getProfileLabel(wholesaler);
  const email = profile.contactEmail || wholesaler.email;
  const phone = profile.contactPhone || wholesaler.contactPhone || wholesaler.phoneNumber;
  const displayName = [profile.contactFirstName || wholesaler.firstName, profile.contactLastName || wholesaler.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();
  const handleFieldChange = (field) => (event) => {
    setFormData((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleSave = async () => {
    setSaveError('');
    try {
      await onSave?.(wholesaler.id || wholesaler.userID, { wholesaleApplication: formData });
      setEditing(false);
    } catch (error) {
      setSaveError(error.message || 'Failed to update wholesaler');
    }
  };

  const renderField = (field) => (
    <TextField
      key={field.name}
      label={field.label}
      type={field.type || 'text'}
      value={formData[field.name] || ''}
      onChange={handleFieldChange(field.name)}
      size="small"
      fullWidth
    />
  );

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
          {saveError && <Alert severity="error">{saveError}</Alert>}

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
              {editing ? (
                <Stack spacing={1.5}>
                  {PROFILE_FIELDS.filter((field) => field.section === 'contact').map(renderField)}
                </Stack>
              ) : (
                <>
                  <DetailRow label="Name" value={displayName} />
                  <DetailRow label="Email" value={email} />
                  <DetailRow label="Phone" value={phone} />
                  <DetailRow label="Title" value={profile.contactTitle} />
                </>
              )}
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom>
                Business
              </Typography>
              {editing ? (
                <Stack spacing={1.5}>
                  {PROFILE_FIELDS.filter((field) => field.section === 'business').map(renderField)}
                </Stack>
              ) : (
                <>
                  <DetailRow label="Business Name" value={profile.businessName || wholesaler.businessName || wholesaler.business} />
                  <DetailRow label="Address" value={profile.businessAddress} />
                  <DetailRow
                    label="City / State / Zip"
                    value={[profile.businessCity, profile.businessState, profile.businessZip].filter(Boolean).join(', ')}
                  />
                  <DetailRow label="Country" value={profile.businessCountry} />
                </>
              )}
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
          <Button
            component={Link}
            href={`/dashboard/users/wholesalers/${encodeURIComponent(wholesaler.id || wholesaler.userID)}/print-intake-slips`}
            startIcon={<PrintIcon />}
          >
            Print Intake Slips
          </Button>
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
        <Stack direction="row" spacing={1}>
          {editing ? (
            <>
              <Button onClick={() => {
                setFormData(buildProfileForm(wholesaler));
                setSaveError('');
                setEditing(false);
              }} disabled={loading}>
                Cancel
              </Button>
              <Button onClick={handleSave} variant="contained" startIcon={<SaveIcon />} disabled={loading}>
                Save
              </Button>
            </>
          ) : (
            <>
              <Button onClick={() => setEditing(true)} startIcon={<EditIcon />}>
                Edit
              </Button>
              <Button onClick={onClose} variant="contained">
                Close
              </Button>
            </>
          )}
        </Stack>
      </DialogActions>
    </Dialog>
  );
}
