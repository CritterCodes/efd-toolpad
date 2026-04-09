'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  Snackbar,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { PageContainer } from '@toolpad/core/PageContainer';
import wholesaleAccountSettingsAPIClient from '@/api-clients/wholesaleAccountSettings.client';
import BusinessBrandingCard from './components/BusinessBrandingCard';

const DEFAULT_MARKUPS = {
  retailMarkupMultiplier: 1,
  taxRate: 0
};

const DEFAULT_BUSINESS_PROFILE = {
  businessName: '',
  businessAddress: '',
  businessCity: '',
  businessState: '',
  businessZip: '',
  businessCountry: 'United States',
  contactFirstName: '',
  contactLastName: '',
  contactTitle: '',
  contactEmail: '',
  contactPhone: ''
};

const MARKUP_BOUNDS = {
  min: 0.5,
  max: 5
};

const TAX_BOUNDS = {
  min: 0,
  max: 25
};

const toNumber = (value, fallback = 1) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const formatPercent = (multiplier) => `${((toNumber(multiplier, 1) - 1) * 100).toFixed(1)}%`;
const formatTaxRatePercentInput = (taxRateDecimal = 0) => {
  const percent = Math.round(toNumber(taxRateDecimal, 0) * 10000) / 100;
  return `${percent}`;
};

export default function WholesalerAccountSettingsPage() {
  const [ownerName, setOwnerName] = useState('Wholesale Account');
  const [pricingSettings, setPricingSettings] = useState(DEFAULT_MARKUPS);
  const [businessProfile, setBusinessProfile] = useState(DEFAULT_BUSINESS_PROFILE);
  const [ticketLogoUrl, setTicketLogoUrl] = useState('');
  const [ticketLogoFile, setTicketLogoFile] = useState(null);
  const [removeTicketLogo, setRemoveTicketLogo] = useState(false);
  const [taxRateInput, setTaxRateInput] = useState('0');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [error, setError] = useState('');

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const settings = await wholesaleAccountSettingsAPIClient.fetchSettings();
      setOwnerName(settings?.ownerName || 'Wholesale Account');
      const nextPricingSettings = {
        retailMarkupMultiplier: toNumber(
          settings?.wholesalerPricingSettings?.retailMarkupMultiplier ?? settings?.retailMarkupMultiplier,
          DEFAULT_MARKUPS.retailMarkupMultiplier
        ),
        taxRate: toNumber(
          settings?.wholesalerPricingSettings?.taxRate ?? settings?.taxRate,
          DEFAULT_MARKUPS.taxRate
        )
      };

      setPricingSettings(nextPricingSettings);
      setTaxRateInput(formatTaxRatePercentInput(nextPricingSettings.taxRate));
      setBusinessProfile({ ...DEFAULT_BUSINESS_PROFILE, ...(settings?.businessProfile || {}) });
      setTicketLogoUrl(settings?.ticketLogoUrl || '');
      setTicketLogoFile(null);
      setRemoveTicketLogo(false);
    } catch (loadError) {
      setError(loadError.message || 'Failed to load account settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleMarkupChange = (event) => {
    const numericValue = toNumber(event.target.value, DEFAULT_MARKUPS.retailMarkupMultiplier);
    const clampedValue = Math.min(Math.max(numericValue, MARKUP_BOUNDS.min), MARKUP_BOUNDS.max);

    setPricingSettings((prev) => ({
      ...prev,
      retailMarkupMultiplier: clampedValue
    }));
  };

  const handleTaxRateChange = (event) => {
    const rawValue = event.target.value;
    if (!/^\d{0,2}(\.\d{0,2})?$/.test(rawValue)) {
      return;
    }

    setTaxRateInput(rawValue);

    if (rawValue === '') {
      setPricingSettings((prev) => ({
        ...prev,
        taxRate: 0
      }));
      return;
    }

    const taxPercent = toNumber(rawValue, DEFAULT_MARKUPS.taxRate * 100);
    const clampedPercent = Math.min(Math.max(taxPercent, TAX_BOUNDS.min), TAX_BOUNDS.max);

    setPricingSettings((prev) => ({
      ...prev,
      taxRate: clampedPercent / 100
    }));
  };

  const handleTaxRateBlur = () => {
    const currentPercent = Math.min(
      Math.max(toNumber(pricingSettings.taxRate, 0) * 100, TAX_BOUNDS.min),
      TAX_BOUNDS.max
    );
    setTaxRateInput(`${Math.round(currentPercent * 100) / 100}`);
  };

  const handleBusinessProfileChange = (field, value) => {
    setBusinessProfile((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleLogoFileChange = (event) => {
    const file = event.target.files?.[0] || null;
    if (!file) {
      return;
    }

    setTicketLogoFile(file);
    setRemoveTicketLogo(false);
  };

  const handleRemoveLogo = () => {
    setTicketLogoFile(null);
    setRemoveTicketLogo(true);
    setTicketLogoUrl('');
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');

    try {
      const updated = await wholesaleAccountSettingsAPIClient.updateSettings({
        wholesalerPricingSettings: pricingSettings,
        businessProfile,
        ticketLogoFile,
        removeTicketLogo
      });
      const nextPricingSettings = {
        retailMarkupMultiplier: toNumber(
          updated?.wholesalerPricingSettings?.retailMarkupMultiplier ?? updated?.retailMarkupMultiplier,
          pricingSettings.retailMarkupMultiplier
        ),
        taxRate: toNumber(
          updated?.wholesalerPricingSettings?.taxRate ?? updated?.taxRate,
          pricingSettings.taxRate
        )
      };

      setPricingSettings(nextPricingSettings);
      setTaxRateInput(formatTaxRatePercentInput(nextPricingSettings.taxRate));
      setBusinessProfile({ ...DEFAULT_BUSINESS_PROFILE, ...(updated?.businessProfile || businessProfile) });
      setTicketLogoUrl(updated?.ticketLogoUrl || '');
      setTicketLogoFile(null);
      setRemoveTicketLogo(false);
      setSaveMessage('Account settings saved successfully.');
    } catch (saveError) {
      setError(saveError.message || 'Failed to save account settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <PageContainer title="Account Settings">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="320px">
          <CircularProgress />
        </Box>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Account Settings">
      <Stack spacing={3}>
        {error && <Alert severity="error">{error}</Alert>}

        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
              Retail Pricing Controls
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Suggested retail is calculated from your wholesale paid price using one markup multiplier, then tax is applied after markup for {ownerName}.
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Retail Markup Multiplier"
                  type="number"
                  inputProps={{ min: MARKUP_BOUNDS.min, max: MARKUP_BOUNDS.max, step: 0.05 }}
                  value={pricingSettings.retailMarkupMultiplier}
                  onChange={handleMarkupChange}
                  helperText={`Markup over paid price: ${formatPercent(pricingSettings.retailMarkupMultiplier)}`}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Tax Rate (%)"
                  type="number"
                  inputProps={{ min: TAX_BOUNDS.min, max: TAX_BOUNDS.max, step: 0.25 }}
                  value={taxRateInput}
                  onChange={handleTaxRateChange}
                  onBlur={handleTaxRateBlur}
                  helperText="Applied after markup"
                />
              </Grid>
            </Grid>

            <Stack direction="row" justifyContent="flex-end" sx={{ mt: 3 }}>
              <Button variant="contained" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Settings'}
              </Button>
            </Stack>
          </CardContent>
        </Card>

        <BusinessBrandingCard
          businessProfile={businessProfile}
          onBusinessProfileChange={handleBusinessProfileChange}
          ticketLogoUrl={ticketLogoUrl}
          ticketLogoFile={ticketLogoFile}
          onLogoFileChange={handleLogoFileChange}
          onRemoveLogo={handleRemoveLogo}
        />
      </Stack>

      <Snackbar
        open={!!saveMessage}
        autoHideDuration={4000}
        onClose={() => setSaveMessage('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setSaveMessage('')} severity="success" sx={{ width: '100%' }}>
          {saveMessage}
        </Alert>
      </Snackbar>
    </PageContainer>
  );
}
