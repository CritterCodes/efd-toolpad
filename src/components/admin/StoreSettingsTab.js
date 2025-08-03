'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
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
        wage: 45.00,
        materialMarkup: 1.5,
        administrativeFee: 0.15,  // 15% as decimal
        businessFee: 0.25,       // 25% as decimal
        consumablesFee: 0.08     // 8% as decimal
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
                const settingsData = {
                    wage: pricingSettings.wage || 45.00,
                    materialMarkup: pricingSettings.materialMarkup || 1.5,
                    administrativeFee: pricingSettings.administrativeFee || 0.15,
                    businessFee: pricingSettings.businessFee || 0.25,
                    consumablesFee: pricingSettings.consumablesFee || 0.08
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
            if (field === 'administrativeFee' || field === 'businessFee' || field === 'consumablesFee') {
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

            const response = await fetch('/api/admin/settings', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    pricing: settings,  // Send as 'pricing' object to match API expectation
                    securityCode: securityCodeInput
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to save settings');
            }

            if (data.success) {
                setOriginalSettings({ ...settings });
                setSuccess('Settings saved successfully');
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

    const calculateLaborRate = () => {
        // Convert percentage fees to dollar amounts based on wage
        const adminFee = settings.wage * settings.administrativeFee;
        const bizFee = settings.wage * settings.businessFee;
        const consumablesFee = settings.wage * settings.consumablesFee;
        
        return settings.wage + adminFee + bizFee + consumablesFee;
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
                                    <TextField
                                        fullWidth
                                        label="Base Hourly Wage"
                                        type="number"
                                        value={settings.wage}
                                        onChange={(e) => handleSettingChange('wage', e.target.value)}
                                        InputProps={{
                                            startAdornment: <InputAdornment position="start">$</InputAdornment>,
                                            inputProps: { min: 0, step: 0.01 }
                                        }}
                                        helperText="Base hourly wage before fees"
                                    />
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

                {/* Labor Rate Summary */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardHeader 
                            title="Labor Rate Summary"
                            avatar={<CalculateIcon color="success" />}
                        />
                        <CardContent>
                            <Grid container spacing={1}>
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
                                <Grid item xs={12}>
                                    <Divider sx={{ my: 1 }} />
                                </Grid>
                                <Grid item xs={8}>
                                    <Typography variant="h6" color="success.main">Total Labor Rate:</Typography>
                                </Grid>
                                <Grid item xs={4}>
                                    <Typography variant="h6" color="success.main" align="right">
                                        ${calculateLaborRate().toFixed(2)}/hr
                                    </Typography>
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Sample Project Calculation */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardHeader 
                            title="Sample Project (2hr, $25 materials)"
                            avatar={<CheckCircleIcon color="info" />}
                        />
                        <CardContent>
                            <Grid container spacing={1}>
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
                                    <Typography variant="h6" color="info.main">Project Total:</Typography>
                                </Grid>
                                <Grid item xs={4}>
                                    <Typography variant="h6" color="info.main" align="right">
                                        ${sampleProject.total.toFixed(2)}
                                    </Typography>
                                </Grid>
                            </Grid>
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
