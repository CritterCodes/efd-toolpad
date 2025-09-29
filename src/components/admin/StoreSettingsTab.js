'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import cascadingUpdatesService from '@/services/cascadingUpdates.service';
import { 
    Card, 
    CardContent, 
    CardHeader, 
    Typography,
    Button,
    TextField,
    Alert,
    AlertTitle,
    Chip,
    Dialog,
    DialogContent,
    DialogTitle,
    DialogActions,
    DialogContentText,
    Box,
    Grid,
    CircularProgress,
    Divider,
    Paper,
    Snackbar,
    FormControl,
    InputLabel,
    InputAdornment
} from '@mui/material';
import { 
    Shield as ShieldIcon,
    AttachMoney as DollarSignIcon,
    Calculate as CalculateIcon,
    Schedule as ClockIcon,
    Warning as AlertTriangleIcon,
    Refresh as RefreshCwIcon,
    Lock as LockIcon,
    CheckCircle as CheckCircleIcon,
    Save as SaveIcon,
    Store as StoreIcon
} from '@mui/icons-material';

export default function StoreSettingsTab() {
    const { data: session } = useSession();
    
    // State management - using correct database format
    const [settings, setSettings] = useState({
        wage: 30.00, // Base wage for standard skill level
        materialMarkup: 1.5,
        administrativeFee: 0.15,  // 15% as decimal
        businessFee: 0.25,       // 25% as decimal
        consumablesFee: 0.08,    // 8% as decimal
        marketingFee: 0.05,      // 5% as decimal
        rushMultiplier: 1.5,     // 50% rush markup
        deliveryFee: 25.00,      // Fixed delivery fee
        taxRate: 0.0875,         // 8.75% tax rate
        customDesignFee: 100.00, // CAD design fee (flat rate)
        commissionPercentage: 0.10 // Commission percentage on profit
    });
    
    const [originalSettings, setOriginalSettings] = useState({});
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [hasChanges, setHasChanges] = useState(false);
    const [showSecurityDialog, setShowSecurityDialog] = useState(false);
    const [securityCodeInput, setSecurityCodeInput] = useState('');
    const [showSnackbar, setShowSnackbar] = useState(false);
    const [generatingPin, setGeneratingPin] = useState(false);
    const [generatedPin, setGeneratedPin] = useState(null);
    const [showPinDialog, setShowPinDialog] = useState(false);

    // Load settings on mount
    useEffect(() => {
        loadSettings();
    }, []);

    // Check for changes
    useEffect(() => {
        const changed = Object.keys(settings).some(key => 
            parseFloat(settings[key]) !== parseFloat(originalSettings[key])
        );
        setHasChanges(changed);
    }, [settings, originalSettings]);

    const loadSettings = async () => {
        try {
            setLoading(true);
            setError(null);
            
            const response = await fetch('/api/admin/settings');
            
            if (!response.ok) {
                throw new Error('Failed to load settings');
            }
            
            const data = await response.json();
            
            if (data.pricing) {
                const pricingSettings = data.pricing;
                const financialSettings = data.financial || {};
                const settingsData = {
                    wage: pricingSettings.wage || 30.00,
                    materialMarkup: pricingSettings.materialMarkup || 1.5,
                    administrativeFee: pricingSettings.administrativeFee || 0.15,
                    businessFee: pricingSettings.businessFee || 0.25,
                    consumablesFee: pricingSettings.consumablesFee || 0.08,
                    marketingFee: pricingSettings.marketingFee || 0.05,
                    rushMultiplier: pricingSettings.rushMultiplier || 1.5,
                    deliveryFee: pricingSettings.deliveryFee || 25.00,
                    taxRate: pricingSettings.taxRate || 0.0875,
                    customDesignFee: financialSettings.customDesignFee || 100.00,
                    commissionPercentage: financialSettings.commissionPercentage || 0.10
                };
                
                setSettings(settingsData);
                setOriginalSettings({ ...settingsData });
            }
        } catch (error) {
            console.error('Settings load error:', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSettingChange = (field, value) => {
        const numericValue = parseFloat(value);
        if (!isNaN(numericValue) && numericValue >= 0) {
            // For percentage fields, convert from percentage to decimal
            if (field === 'administrativeFee' || field === 'businessFee' || field === 'consumablesFee' || field === 'marketingFee' || field === 'taxRate') {
                setSettings(prev => ({
                    ...prev,
                    [field]: numericValue / 100  // Convert percentage to decimal
                }));
            } else {
                setSettings(prev => ({
                    ...prev,
                    [field]: numericValue
                }));
            }
        }
    };

    const handleSaveClick = () => {
        setShowSecurityDialog(true);
        setSecurityCodeInput('');
        setError(null);
    };

    const handleSaveSettings = async () => {
        if (!securityCodeInput || securityCodeInput.length !== 4) {
            setError('Please enter a 4-digit security code');
            return;
        }

        try {
            setSaving(true);
            setError(null);

            // Save the settings first
            const { customDesignFee, commissionPercentage, ...pricingSettings } = settings;
            
            const response = await fetch('/api/admin/settings', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    pricing: pricingSettings,  // Send pricing settings to PUT endpoint
                    financial: { customDesignFee, commissionPercentage }, // Send financial settings too
                    securityCode: securityCodeInput
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to save settings');
            }

            if (data.success) {
                // Settings saved successfully, now trigger cascading updates
                console.log('🔄 Admin settings saved, triggering cascading updates...');
                
                try {
                    // Create admin settings object in the expected format for cascading updates
                    const adminSettingsForUpdate = {
                        laborRates: {
                            basic: settings.wage * 0.75,      // 75% of base wage
                            standard: settings.wage,          // 100% of base wage
                            advanced: settings.wage * 1.25,   // 125% of base wage
                            expert: settings.wage * 1.5       // 150% of base wage
                        },
                        materialMarkup: settings.materialMarkup,
                        pricing: {
                            wage: settings.wage,
                            materialMarkup: settings.materialMarkup,
                            administrativeFee: settings.administrativeFee,
                            businessFee: settings.businessFee,
                            consumablesFee: settings.consumablesFee,
                            marketingFee: settings.marketingFee,
                            rushMultiplier: settings.rushMultiplier,
                            deliveryFee: settings.deliveryFee,
                            taxRate: settings.taxRate
                        }
                    };
                    
                    // Trigger cascading updates
                    const cascadingResult = await cascadingUpdatesService.updateFromAdminSettings(adminSettingsForUpdate);
                    
                    console.log('✅ Cascading updates completed:', cascadingResult);
                    
                    // Update success message to include cascading update info
                    const updateMessage = `Settings saved successfully! Updated ${cascadingResult.materialsUpdated || 0} materials, ${cascadingResult.processesUpdated || 0} processes, and ${cascadingResult.tasksUpdated || 0} tasks.`;
                    setSuccess(updateMessage);
                    
                } catch (cascadingError) {
                    console.error('⚠️ Cascading updates failed:', cascadingError);
                    setSuccess('Settings saved successfully, but some dependent objects may need manual updates.');
                }
                
                setOriginalSettings({ ...settings });
                setShowSecurityDialog(false);
                setSecurityCodeInput('');
                setShowSnackbar(true);
            }

        } catch (error) {
            console.error('Settings save error:', error);
            setError(error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleGeneratePin = async () => {
        try {
            setGeneratingPin(true);
            setError(null);

            const response = await fetch('/api/admin/settings/verify-code', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to generate PIN');
            }

            if (data.success) {
                setGeneratedPin(data.securityCode);
                setShowPinDialog(true);
                setSuccess('New security PIN generated successfully');
            }

        } catch (error) {
            console.error('PIN generation error:', error);
            setError(error.message);
        } finally {
            setGeneratingPin(false);
        }
    };

    const calculateLaborRate = () => {
        // Convert percentage fees to dollar amounts based on wage
        const adminFee = settings.wage * settings.administrativeFee;
        const bizFee = settings.wage * settings.businessFee;
        const consumablesFee = settings.wage * settings.consumablesFee;
        const marketingFee = settings.wage * settings.marketingFee;
        
        return settings.wage + adminFee + bizFee + consumablesFee + marketingFee;
    };

    const calculateSampleProject = () => {
        const laborRate = calculateLaborRate();
        const laborTime = 2; // 2 hours
        const materialCost = 25; // $25 in materials
        
        const laborCost = laborTime * laborRate;
        const materialTotal = materialCost * settings.materialMarkup;
        const total = laborCost + materialTotal;
        
        return {
            laborCost,
            materialTotal,
            total
        };
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    const sampleProject = calculateSampleProject();

    return (
        <Box>
            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    <AlertTitle>Error</AlertTitle>
                    {error}
                </Alert>
            )}

            <Grid container spacing={3}>
                {/* Labor Settings */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardHeader 
                            title="Labor Settings"
                            avatar={<ClockIcon color="primary" />}
                        />
                        <CardContent>
                            <Grid container spacing={2}>
                                <Grid item xs={12}>
                                    <Typography variant="subtitle2" gutterBottom>
                                        Skill-Based Hourly Wages
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" gutterBottom>
                                        Set the base wage for standard skill level. Other levels are calculated automatically:
                                    </Typography>
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="Base Hourly Wage (Standard Skill)"
                                        type="number"
                                        value={settings.wage}
                                        onChange={(e) => handleSettingChange('wage', e.target.value)}
                                        InputProps={{
                                            startAdornment: <InputAdornment position="start">$</InputAdornment>,
                                            inputProps: { min: 0, step: 0.01 }
                                        }}
                                        helperText="Base hourly wage before fees (used for Standard skill level)"
                                    />
                                </Grid>
                                
                                {/* Skill Level Preview */}
                                <Grid item xs={12}>
                                    <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                                        <Typography variant="subtitle2" gutterBottom>
                                            Skill Level Wages (Before Fees):
                                        </Typography>
                                        <Grid container spacing={1}>
                                            <Grid item xs={6} sm={3}>
                                                <Typography variant="body2" color="text.secondary">
                                                    Basic (75%):
                                                </Typography>
                                                <Typography variant="body2" fontWeight="bold">
                                                    ${(settings.wage * 0.75).toFixed(2)}/hr
                                                </Typography>
                                            </Grid>
                                            <Grid item xs={6} sm={3}>
                                                <Typography variant="body2" color="text.secondary">
                                                    Standard (100%):
                                                </Typography>
                                                <Typography variant="body2" fontWeight="bold">
                                                    ${settings.wage.toFixed(2)}/hr
                                                </Typography>
                                            </Grid>
                                            <Grid item xs={6} sm={3}>
                                                <Typography variant="body2" color="text.secondary">
                                                    Advanced (125%):
                                                </Typography>
                                                <Typography variant="body2" fontWeight="bold">
                                                    ${(settings.wage * 1.25).toFixed(2)}/hr
                                                </Typography>
                                            </Grid>
                                            <Grid item xs={6} sm={3}>
                                                <Typography variant="body2" color="text.secondary">
                                                    Expert (150%):
                                                </Typography>
                                                <Typography variant="body2" fontWeight="bold">
                                                    ${(settings.wage * 1.5).toFixed(2)}/hr
                                                </Typography>
                                            </Grid>
                                        </Grid>
                                    </Paper>
                                </Grid>
                                
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="Administrative Fee"
                                        type="number"
                                        value={(settings.administrativeFee * 100).toFixed(1)}
                                        onChange={(e) => handleSettingChange('administrativeFee', e.target.value)}
                                        InputProps={{
                                            endAdornment: <InputAdornment position="end">%</InputAdornment>,
                                            inputProps: { min: 0, max: 100, step: 0.1 }
                                        }}
                                        helperText="Percentage of wage for administrative overhead"
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="Business Fee"
                                        type="number"
                                        value={(settings.businessFee * 100).toFixed(1)}
                                        onChange={(e) => handleSettingChange('businessFee', e.target.value)}
                                        InputProps={{
                                            endAdornment: <InputAdornment position="end">%</InputAdornment>,
                                            inputProps: { min: 0, max: 100, step: 0.1 }
                                        }}
                                        helperText="Percentage of wage for business operations"
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="Consumables Fee"
                                        type="number"
                                        value={(settings.consumablesFee * 100).toFixed(1)}
                                        onChange={(e) => handleSettingChange('consumablesFee', e.target.value)}
                                        InputProps={{
                                            endAdornment: <InputAdornment position="end">%</InputAdornment>,
                                            inputProps: { min: 0, max: 100, step: 0.1 }
                                        }}
                                        helperText="Percentage of wage for consumables and supplies"
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="Marketing Fee"
                                        type="number"
                                        value={(settings.marketingFee * 100).toFixed(1)}
                                        onChange={(e) => handleSettingChange('marketingFee', e.target.value)}
                                        InputProps={{
                                            endAdornment: <InputAdornment position="end">%</InputAdornment>,
                                            inputProps: { min: 0, max: 100, step: 0.1 }
                                        }}
                                        helperText="Percentage of wage for marketing and advertising"
                                    />
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Material Settings */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardHeader 
                            title="Material Settings"
                            avatar={<DollarSignIcon color="primary" />}
                        />
                        <CardContent>
                            <TextField
                                fullWidth
                                label="Material Markup Multiplier"
                                type="number"
                                value={settings.materialMarkup}
                                onChange={(e) => handleSettingChange('materialMarkup', e.target.value)}
                                InputProps={{
                                    startAdornment: <InputAdornment position="start">×</InputAdornment>,
                                    inputProps: { min: 1, step: 0.1 }
                                }}
                                helperText="Multiply material costs by this amount"
                            />
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                                Current markup: {((settings.materialMarkup - 1) * 100).toFixed(1)}% above cost
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Additional Pricing Settings */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardHeader 
                            title="Additional Pricing"
                            avatar={<CalculateIcon color="primary" />}
                        />
                        <CardContent>
                            <Grid container spacing={2}>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="Rush Job Multiplier"
                                        type="number"
                                        value={settings.rushMultiplier}
                                        onChange={(e) => handleSettingChange('rushMultiplier', e.target.value)}
                                        InputProps={{
                                            startAdornment: <InputAdornment position="start">×</InputAdornment>,
                                            inputProps: { min: 1, step: 0.1 }
                                        }}
                                        helperText="Multiplier for rush jobs (e.g., 1.5 = 50% markup)"
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="Delivery Fee"
                                        type="number"
                                        value={settings.deliveryFee}
                                        onChange={(e) => handleSettingChange('deliveryFee', e.target.value)}
                                        InputProps={{
                                            startAdornment: <InputAdornment position="start">$</InputAdornment>,
                                            inputProps: { min: 0, step: 0.01 }
                                        }}
                                        helperText="Fixed fee for delivery services"
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="Tax Rate"
                                        type="number"
                                        value={(settings.taxRate * 100).toFixed(3)}
                                        onChange={(e) => handleSettingChange('taxRate', e.target.value)}
                                        InputProps={{
                                            endAdornment: <InputAdornment position="end">%</InputAdornment>,
                                            inputProps: { min: 0, max: 100, step: 0.001 }
                                        }}
                                        helperText="Tax rate applied to taxable items"
                                    />
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Quote & Commission Settings */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardHeader 
                            title="Quote & Commission Settings"
                            avatar={<DollarSignIcon color="primary" />}
                        />
                        <CardContent>
                            <Grid container spacing={2}>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="Custom Design Fee"
                                        type="number"
                                        value={settings.customDesignFee}
                                        onChange={(e) => handleSettingChange('customDesignFee', e.target.value)}
                                        InputProps={{
                                            startAdornment: <InputAdornment position="start">$</InputAdornment>,
                                            inputProps: { min: 0, step: 0.01 }
                                        }}
                                        helperText="Fixed fee for custom CAD design work"
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="Commission Percentage"
                                        type="number"
                                        value={(settings.commissionPercentage * 100).toFixed(1)}
                                        onChange={(e) => handleSettingChange('commissionPercentage', parseFloat(e.target.value) / 100)}
                                        InputProps={{
                                            endAdornment: <InputAdornment position="end">%</InputAdornment>,
                                            inputProps: { min: 0, max: 100, step: 0.1 }
                                        }}
                                        helperText="Commission percentage on material profit"
                                    />
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Labor Rate Summary */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardHeader 
                            title="Final Labor Rates (After Fees)"
                            avatar={<CalculateIcon color="success" />}
                        />
                        <CardContent>
                            <Typography variant="subtitle2" gutterBottom>
                                Standard Skill Level Breakdown:
                            </Typography>
                            <Grid container spacing={1} sx={{ mb: 2 }}>
                                <Grid item xs={8}>
                                    <Typography variant="body2">Base Wage:</Typography>
                                </Grid>
                                <Grid item xs={4}>
                                    <Typography variant="body2" align="right">${settings.wage.toFixed(2)}/hr</Typography>
                                </Grid>
                                <Grid item xs={8}>
                                    <Typography variant="body2">Administrative Fee ({(settings.administrativeFee * 100).toFixed(1)}%):</Typography>
                                </Grid>
                                <Grid item xs={4}>
                                    <Typography variant="body2" align="right">${(settings.wage * settings.administrativeFee).toFixed(2)}/hr</Typography>
                                </Grid>
                                <Grid item xs={8}>
                                    <Typography variant="body2">Business Fee ({(settings.businessFee * 100).toFixed(1)}%):</Typography>
                                </Grid>
                                <Grid item xs={4}>
                                    <Typography variant="body2" align="right">${(settings.wage * settings.businessFee).toFixed(2)}/hr</Typography>
                                </Grid>
                                <Grid item xs={8}>
                                    <Typography variant="body2">Consumables Fee ({(settings.consumablesFee * 100).toFixed(1)}%):</Typography>
                                </Grid>
                                <Grid item xs={4}>
                                    <Typography variant="body2" align="right">${(settings.wage * settings.consumablesFee).toFixed(2)}/hr</Typography>
                                </Grid>
                                <Grid item xs={8}>
                                    <Typography variant="body2">Marketing Fee ({(settings.marketingFee * 100).toFixed(1)}%):</Typography>
                                </Grid>
                                <Grid item xs={4}>
                                    <Typography variant="body2" align="right">${(settings.wage * settings.marketingFee).toFixed(2)}/hr</Typography>
                                </Grid>
                                <Grid item xs={12}>
                                    <Divider sx={{ my: 1 }} />
                                </Grid>
                                <Grid item xs={8}>
                                    <Typography variant="h6" color="success.main">Standard Total:</Typography>
                                </Grid>
                                <Grid item xs={4}>
                                    <Typography variant="h6" color="success.main" align="right">
                                        ${calculateLaborRate().toFixed(2)}/hr
                                    </Typography>
                                </Grid>
                            </Grid>
                            
                            <Typography variant="subtitle2" gutterBottom>
                                All Skill Level Final Rates:
                            </Typography>
                            <Paper sx={{ p: 2, bgcolor: 'success.50' }}>
                                <Grid container spacing={1}>
                                    <Grid item xs={6} sm={3}>
                                        <Typography variant="body2" color="text.secondary">
                                            Basic:
                                        </Typography>
                                        <Typography variant="body2" fontWeight="bold" color="success.main">
                                            ${(calculateLaborRate() * 0.75).toFixed(2)}/hr
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={6} sm={3}>
                                        <Typography variant="body2" color="text.secondary">
                                            Standard:
                                        </Typography>
                                        <Typography variant="body2" fontWeight="bold" color="success.main">
                                            ${calculateLaborRate().toFixed(2)}/hr
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={6} sm={3}>
                                        <Typography variant="body2" color="text.secondary">
                                            Advanced:
                                        </Typography>
                                        <Typography variant="body2" fontWeight="bold" color="success.main">
                                            ${(calculateLaborRate() * 1.25).toFixed(2)}/hr
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={6} sm={3}>
                                        <Typography variant="body2" color="text.secondary">
                                            Expert:
                                        </Typography>
                                        <Typography variant="body2" fontWeight="bold" color="success.main">
                                            ${(calculateLaborRate() * 1.5).toFixed(2)}/hr
                                        </Typography>
                                    </Grid>
                                </Grid>
                            </Paper>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Sample Project Calculation */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardHeader 
                            title="Sample Project Examples (2hr, $25 materials)"
                            avatar={<CheckCircleIcon color="info" />}
                        />
                        <CardContent>
                            <Typography variant="subtitle2" gutterBottom>
                                Standard Skill Level (2 hours):
                            </Typography>
                            <Grid container spacing={1} sx={{ mb: 2 }}>
                                <Grid item xs={8}>
                                    <Typography variant="body2">Labor (2 hours):</Typography>
                                </Grid>
                                <Grid item xs={4}>
                                    <Typography variant="body2" align="right">${sampleProject.laborCost.toFixed(2)}</Typography>
                                </Grid>
                                <Grid item xs={8}>
                                    <Typography variant="body2">Materials (marked up):</Typography>
                                </Grid>
                                <Grid item xs={4}>
                                    <Typography variant="body2" align="right">${sampleProject.materialTotal.toFixed(2)}</Typography>
                                </Grid>
                                <Grid item xs={12}>
                                    <Divider sx={{ my: 1 }} />
                                </Grid>
                                <Grid item xs={8}>
                                    <Typography variant="h6" color="info.main">Standard Total:</Typography>
                                </Grid>
                                <Grid item xs={4}>
                                    <Typography variant="h6" color="info.main" align="right">
                                        ${sampleProject.total.toFixed(2)}
                                    </Typography>
                                </Grid>
                            </Grid>
                            
                            <Typography variant="subtitle2" gutterBottom>
                                All Skill Levels (2 hours + materials):
                            </Typography>
                            <Paper sx={{ p: 2, bgcolor: 'info.50' }}>
                                <Grid container spacing={1}>
                                    <Grid item xs={6} sm={3}>
                                        <Typography variant="body2" color="text.secondary">
                                            Basic:
                                        </Typography>
                                        <Typography variant="body2" fontWeight="bold" color="info.main">
                                            ${((calculateLaborRate() * 0.75) * 2 + sampleProject.materialTotal).toFixed(2)}
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={6} sm={3}>
                                        <Typography variant="body2" color="text.secondary">
                                            Standard:
                                        </Typography>
                                        <Typography variant="body2" fontWeight="bold" color="info.main">
                                            ${sampleProject.total.toFixed(2)}
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={6} sm={3}>
                                        <Typography variant="body2" color="text.secondary">
                                            Advanced:
                                        </Typography>
                                        <Typography variant="body2" fontWeight="bold" color="info.main">
                                            ${((calculateLaborRate() * 1.25) * 2 + sampleProject.materialTotal).toFixed(2)}
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={6} sm={3}>
                                        <Typography variant="body2" color="text.secondary">
                                            Expert:
                                        </Typography>
                                        <Typography variant="body2" fontWeight="bold" color="info.main">
                                            ${((calculateLaborRate() * 1.5) * 2 + sampleProject.materialTotal).toFixed(2)}
                                        </Typography>
                                    </Grid>
                                </Grid>
                            </Paper>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Save Button */}
                <Grid item xs={12}>
                    <Box display="flex" justifyContent="center" gap={2}>
                        <Button
                            variant="contained"
                            startIcon={<SaveIcon />}
                            onClick={handleSaveClick}
                            disabled={!hasChanges || saving}
                            size="large"
                        >
                            Save Store Settings
                        </Button>
                        <Button
                            variant="outlined"
                            startIcon={<RefreshCwIcon />}
                            onClick={loadSettings}
                            disabled={loading}
                        >
                            Reset
                        </Button>
                        <Button
                            variant="outlined"
                            startIcon={<LockIcon />}
                            onClick={handleGeneratePin}
                            disabled={generatingPin}
                            color="warning"
                        >
                            {generatingPin ? 'Generating...' : 'Generate New PIN'}
                        </Button>
                    </Box>
                    {hasChanges && (
                        <Alert severity="info" sx={{ mt: 2 }}>
                            <AlertTitle>Unsaved Changes</AlertTitle>
                            You have unsaved changes. Click &quot;Save Store Settings&quot; to apply them.
                        </Alert>
                    )}
                </Grid>
            </Grid>

            {/* Security Code Dialog */}
            <Dialog 
                open={showSecurityDialog} 
                onClose={() => setShowSecurityDialog(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>
                    <Box display="flex" alignItems="center" gap={1}>
                        <ShieldIcon color="warning" />
                        Security Verification Required
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 2 }}>
                        These settings affect pricing calculations. Please enter your 4-digit security PIN to confirm the changes.
                    </DialogContentText>
                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {error}
                        </Alert>
                    )}
                    <TextField
                        autoFocus
                        fullWidth
                        label="Security PIN"
                        type="password"
                        variant="outlined"
                        value={securityCodeInput}
                        onChange={(e) => {
                            const value = e.target.value;
                            // Only allow 4-digit numbers
                            if (value === '' || (value.length <= 4 && /^\d+$/.test(value))) {
                                setSecurityCodeInput(value);
                            }
                        }}
                        placeholder="Enter 4-digit PIN"
                        inputProps={{ 
                            maxLength: 4,
                            min: 1000,
                            max: 9999,
                            step: 1
                        }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowSecurityDialog(false)}>Cancel</Button>
                    <Button 
                        onClick={handleSaveSettings} 
                        variant="contained"
                        disabled={saving || !securityCodeInput || securityCodeInput.length !== 4}
                        startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
                    >
                        {saving ? 'Saving...' : 'Save Settings'}
                    </Button>
                </DialogActions>
            </Dialog>
            
            {/* PIN Display Dialog */}
            <Dialog 
                open={showPinDialog} 
                onClose={() => {
                    setShowPinDialog(false);
                    setGeneratedPin(null);
                }}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>
                    <Box display="flex" alignItems="center" gap={1}>
                        <CheckCircleIcon color="success" />
                        New Security PIN Generated
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Alert severity="info" sx={{ mb: 2 }}>
                        <Typography variant="h4" align="center" sx={{ mb: 1, fontFamily: 'monospace', letterSpacing: 3 }}>
                            {generatedPin}
                        </Typography>
                        <Typography variant="body2" align="center">
                            Please write down this PIN. You&apos;ll need it to save admin settings.
                            This PIN will expire in 1 hour.
                        </Typography>
                    </Alert>
                    <Alert severity="warning">
                        <Typography variant="body2">
                            <strong>Security Notice:</strong> This PIN will only be displayed once. 
                            Keep it secure and don&apos;t share it with others.
                        </Typography>
                    </Alert>
                </DialogContent>
                <DialogActions>
                    <Button 
                        onClick={() => {
                            setShowPinDialog(false);
                            setGeneratedPin(null);
                        }} 
                        variant="contained"
                    >
                        I&apos;ve Saved the PIN
                    </Button>
                </DialogActions>
            </Dialog>
            
            {/* Success Snackbar */}
            <Snackbar
                open={showSnackbar}
                autoHideDuration={6000}
                onClose={() => setShowSnackbar(false)}
                message={success}
            />
        </Box>
    );
}
