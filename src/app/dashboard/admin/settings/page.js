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
    Snackbar
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
    Save as SaveIcon
} from '@mui/icons-material';

export default function AdminSettingsPage() {
    const { data: session, status } = useSession();
    
    // State management
    const [settings, setSettings] = useState({
        wage: 45.00,
        administrativeFee: 15,
        businessFee: 25,
        consumablesFee: 8
    });
    
    const [originalSettings, setOriginalSettings] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showSecurityDialog, setShowSecurityDialog] = useState(false);
    const [securityCode, setSecurityCode] = useState('');
    const [securityCodeInput, setSecurityCodeInput] = useState('');
    const [priceImpact, setPriceImpact] = useState(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showSnackbar, setShowSnackbar] = useState(false);
    
    // Load settings on component mount
    useEffect(() => {
        loadSettings();
    }, []);
    
    const loadSettings = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/admin/settings');
            if (response.ok) {
                const data = await response.json();
                // Extract settings from the API response structure
                // Convert decimal fees to percentages for UI display
                const loadedSettings = {
                    wage: data.pricing?.wage || 45.00,
                    administrativeFee: (data.pricing?.administrativeFee || 0.15) * 100, // Convert 0.15 to 15
                    businessFee: (data.pricing?.businessFee || 0.25) * 100, // Convert 0.25 to 25
                    consumablesFee: (data.pricing?.consumablesFee || 0.08) * 100 // Convert 0.08 to 8
                };
                setSettings(loadedSettings);
                setOriginalSettings(loadedSettings);
            } else {
                setError('Failed to load settings');
            }
        } catch (err) {
            setError('Error loading settings: ' + err.message);
        } finally {
            setLoading(false);
        }
    };
    
    const generateSecurityCode = async () => {
        try {
            const response = await fetch('/api/admin/settings/verify-code', {
                method: 'PUT'
            });
            const data = await response.json();
            if (response.ok) {
                setSecurityCode(data.code);
                setSuccess(`Security PIN generated: ${data.code} (expires in 1 hour)`);
                setShowSnackbar(true);
            } else {
                setError(data.error || 'Failed to generate security PIN');
            }
        } catch (err) {
            setError('Error generating security PIN: ' + err.message);
        }
    };
    
    const verifySecurityCode = async (code) => {
        try {
            const response = await fetch('/api/admin/settings/verify-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ securityCode: code })
            });
            return response.ok;
        } catch (err) {
            setError('Error verifying security code: ' + err.message);
            return false;
        }
    };
    
    const getPriceImpact = async () => {
        try {
            const response = await fetch('/api/admin/settings/pricing-impact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ newSettings: settings })
            });
            const data = await response.json();
            if (response.ok) {
                setPriceImpact(data);
            }
        } catch (err) {
            console.error('Error getting price impact:', err);
        }
    };
    
    const handleSaveSettings = async () => {
        if (!securityCodeInput) {
            setError('Security PIN is required to save settings');
            return;
        }
        
        const isValidCode = await verifySecurityCode(securityCodeInput);
        if (!isValidCode) {
            setError('Invalid or expired security PIN');
            return;
        }
        
        try {
            setSaving(true);
            
            // Convert percentage values to decimals for API
            const settingsForAPI = {
                wage: settings.wage,
                administrativeFee: settings.administrativeFee / 100, // Convert 15 to 0.15
                businessFee: settings.businessFee / 100, // Convert 25 to 0.25
                consumablesFee: settings.consumablesFee / 100 // Convert 8 to 0.08
            };
            
            const response = await fetch('/api/admin/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    pricing: settingsForAPI, 
                    securityCode: securityCodeInput 
                })
            });
            
            const data = await response.json();
            if (response.ok) {
                setSuccess('Settings saved successfully! Prices updated for all repair tasks.');
                setOriginalSettings(settings);
                setShowSecurityDialog(false);
                setSecurityCodeInput('');
                setShowSnackbar(true);
                loadSettings(); // Reload to get updated data
            } else {
                setError(data.error || 'Failed to save settings');
            }
        } catch (err) {
            setError('Error saving settings: ' + err.message);
        } finally {
            setSaving(false);
        }
    };
    
    const handleSettingChange = (field, value) => {
        setSettings(prev => ({
            ...prev,
            [field]: parseFloat(value) || 0
        }));
        setError('');
    };
    
    const hasChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings);
    
    const totalFeePercentage = (settings?.administrativeFee || 0) + (settings?.businessFee || 0) + (settings?.consumablesFee || 0);
    
    // Show loading or authentication check
    if (status === 'loading' || loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                <CircularProgress />
                <Typography sx={{ ml: 2 }}>Loading admin settings...</Typography>
            </Box>
        );
    }
    
    if (!session) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error">
                    Access denied. Admin authentication required.
                </Alert>
            </Box>
        );
    }
    
    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ShieldIcon color="primary" />
                    Admin Settings
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Secure business settings and pricing configuration
                </Typography>
            </Box>
            
            {/* Security Status */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <ShieldIcon color="primary" />
                            <Box>
                                <Typography variant="h6">Security Status</Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Protected by time-based security PINs
                                </Typography>
                            </Box>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            {securityCode ? (
                                <Chip 
                                    icon={<CheckCircleIcon />} 
                                    label="Code Generated" 
                                    color="success" 
                                />
                            ) : (
                                <Chip 
                                    icon={<LockIcon />} 
                                    label="Code Required" 
                                    color="warning" 
                                />
                            )}
                        </Box>
                    </Box>
                    <Box sx={{ mt: 2 }}>
                        <Button 
                            variant="outlined" 
                            startIcon={<ShieldIcon />}
                            onClick={generateSecurityCode}
                        >
                            Generate Security PIN
                        </Button>
                    </Box>
                </CardContent>
            </Card>
            
            {/* Error/Success Messages */}
            {error && (
                <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
                    <AlertTitle>Error</AlertTitle>
                    {error}
                </Alert>
            )}
            
            {success && (
                <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
                    <AlertTitle>Success</AlertTitle>
                    {success}
                </Alert>
            )}
            
            {/* Pricing Settings */}
            <Card sx={{ mb: 3 }}>
                <CardHeader 
                    title={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <DollarSignIcon />
                            Pricing Configuration
                        </Box>
                    }
                />
                <CardContent>
                    <Grid container spacing={3}>
                        <Grid item xs={12} sm={6} md={3}>
                            <TextField
                                fullWidth
                                label="Hourly Wage ($)"
                                type="number"
                                value={settings.wage || 0}
                                onChange={(e) => handleSettingChange('wage', e.target.value)}
                                inputProps={{ step: '0.01', min: '0' }}
                            />
                        </Grid>
                        
                        <Grid item xs={12} sm={6} md={3}>
                            <TextField
                                fullWidth
                                label="Administrative Fee (%)"
                                type="number"
                                value={settings.administrativeFee || 0}
                                onChange={(e) => handleSettingChange('administrativeFee', e.target.value)}
                                inputProps={{ step: '0.1', min: '0', max: '100' }}
                            />
                        </Grid>
                        
                        <Grid item xs={12} sm={6} md={3}>
                            <TextField
                                fullWidth
                                label="Business Fee (%)"
                                type="number"
                                value={settings.businessFee || 0}
                                onChange={(e) => handleSettingChange('businessFee', e.target.value)}
                                inputProps={{ step: '0.1', min: '0', max: '100' }}
                            />
                        </Grid>
                        
                        <Grid item xs={12} sm={6} md={3}>
                            <TextField
                                fullWidth
                                label="Consumables Fee (%)"
                                type="number"
                                value={settings.consumablesFee || 0}
                                onChange={(e) => handleSettingChange('consumablesFee', e.target.value)}
                                inputProps={{ step: '0.1', min: '0', max: '100' }}
                            />
                        </Grid>
                    </Grid>
                    
                    {/* Pricing Summary */}
                    <Box sx={{ mt: 3, p: 2, bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 1 }}>
                        <Typography variant="h6" gutterBottom>
                            Pricing Formula Summary
                        </Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>
                            ((Labor Hours × ${settings.wage || 0}/hr) + (Material Cost × 1.5)) × ({totalFeePercentage}% fees + 1)
                        </Typography>
                        <Typography variant="body2">
                            <strong>Total Fee Percentage:</strong> {totalFeePercentage.toFixed(1)}%
                        </Typography>
                    </Box>
                </CardContent>
            </Card>
            
            {/* Price Impact Preview */}
            {hasChanges && (
                <Card sx={{ mb: 3 }}>
                    <CardHeader 
                        title={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <CalculateIcon />
                                Price Impact Preview
                            </Box>
                        }
                    />
                    <CardContent>
                        <Button 
                            variant="outlined" 
                            onClick={getPriceImpact}
                            startIcon={<RefreshCwIcon />}
                        >
                            Calculate Price Impact
                        </Button>
                        
                        {priceImpact && (
                            <Box sx={{ mt: 2 }}>
                                <Typography variant="body2">
                                    Average price change: {priceImpact.averageChange > 0 ? '+' : ''}{priceImpact.averageChange.toFixed(1)}%
                                </Typography>
                                <Typography variant="body2">
                                    Tasks affected: {priceImpact.tasksAffected}
                                </Typography>
                            </Box>
                        )}
                    </CardContent>
                </Card>
            )}
            
            {/* Save Actions */}
            <Card>
                <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                            <Typography variant="h6">Save Changes</Typography>
                            <Typography variant="body2" color="text.secondary">
                                Security PIN required to update pricing settings
                            </Typography>
                        </Box>
                        <Button
                            variant="contained"
                            startIcon={<SaveIcon />}
                            onClick={() => setShowSecurityDialog(true)}
                            disabled={!hasChanges}
                        >
                            Save Settings
                        </Button>
                    </Box>
                </CardContent>
            </Card>
            
            {/* Security PIN Dialog */}
            <Dialog open={showSecurityDialog} onClose={() => setShowSecurityDialog(false)}>
                <DialogTitle>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LockIcon />
                        Security Verification Required
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 2 }}>
                        Enter the security code to save pricing settings. This will update prices for all repair tasks.
                    </DialogContentText>
                    <TextField
                        fullWidth
                        label="Security PIN"
                        type="number"
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
