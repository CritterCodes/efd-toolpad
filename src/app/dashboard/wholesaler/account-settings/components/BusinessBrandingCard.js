import { useEffect, useMemo } from 'react';
import { Box, Button, Card, CardContent, Grid, Stack, TextField, Typography } from '@mui/material';

export default function BusinessBrandingCard({
  businessProfile,
  onBusinessProfileChange,
  ticketLogoUrl,
  ticketLogoFile,
  onLogoFileChange,
  onRemoveLogo
}) {
  const previewUrl = useMemo(() => {
    if (!ticketLogoFile) {
      return '';
    }

    return URL.createObjectURL(ticketLogoFile);
  }, [ticketLogoFile]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const resolvedLogoUrl = previewUrl || ticketLogoUrl;

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
          Branding and Business Profile
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Manage the logo printed on tickets and receipts, plus key business details from your wholesale profile.
        </Typography>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', sm: 'center' }} sx={{ mb: 3 }}>
          {resolvedLogoUrl && (
            <Box
              component="img"
              src={resolvedLogoUrl}
              alt="Ticket logo"
              sx={{
                width: 120,
                height: 48,
                objectFit: 'contain',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                p: 0.5,
                bgcolor: 'background.paper'
              }}
            />
          )}
          <Button component="label" variant="outlined">
            Upload Logo
            <input hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={onLogoFileChange} />
          </Button>
          {resolvedLogoUrl && (
            <Button color="error" variant="text" onClick={onRemoveLogo}>
              Remove Logo
            </Button>
          )}
        </Stack>

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}><TextField fullWidth label="Business Name" value={businessProfile.businessName} onChange={(event) => onBusinessProfileChange('businessName', event.target.value)} /></Grid>
          <Grid item xs={12} md={6}><TextField fullWidth label="Contact Email" value={businessProfile.contactEmail} onChange={(event) => onBusinessProfileChange('contactEmail', event.target.value)} /></Grid>
          <Grid item xs={12} md={6}><TextField fullWidth label="Contact Phone" value={businessProfile.contactPhone} onChange={(event) => onBusinessProfileChange('contactPhone', event.target.value)} /></Grid>
          <Grid item xs={12} md={6}><TextField fullWidth label="Contact Title" value={businessProfile.contactTitle} onChange={(event) => onBusinessProfileChange('contactTitle', event.target.value)} /></Grid>
          <Grid item xs={12} md={6}><TextField fullWidth label="Contact First Name" value={businessProfile.contactFirstName} onChange={(event) => onBusinessProfileChange('contactFirstName', event.target.value)} /></Grid>
          <Grid item xs={12} md={6}><TextField fullWidth label="Contact Last Name" value={businessProfile.contactLastName} onChange={(event) => onBusinessProfileChange('contactLastName', event.target.value)} /></Grid>
          <Grid item xs={12}><TextField fullWidth label="Business Address" value={businessProfile.businessAddress} onChange={(event) => onBusinessProfileChange('businessAddress', event.target.value)} /></Grid>
          <Grid item xs={12} md={4}><TextField fullWidth label="City" value={businessProfile.businessCity} onChange={(event) => onBusinessProfileChange('businessCity', event.target.value)} /></Grid>
          <Grid item xs={12} md={4}><TextField fullWidth label="State" value={businessProfile.businessState} onChange={(event) => onBusinessProfileChange('businessState', event.target.value)} /></Grid>
          <Grid item xs={12} md={4}><TextField fullWidth label="ZIP" value={businessProfile.businessZip} onChange={(event) => onBusinessProfileChange('businessZip', event.target.value)} /></Grid>
          <Grid item xs={12} md={6}><TextField fullWidth label="Country" value={businessProfile.businessCountry} onChange={(event) => onBusinessProfileChange('businessCountry', event.target.value)} /></Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}
