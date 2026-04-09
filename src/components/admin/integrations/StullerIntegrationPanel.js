
'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
    Alert, Box, Card, CardActions, CardContent, CircularProgress,
    FormControl, FormControlLabel, Grid, InputLabel, MenuItem,
    Select, Stack, Switch, TextField, Typography
} from '@mui/material';
import { LoadingButton } from '@mui/lab';

const DEFAULT_SETTINGS = {
    enabled: false,
    username: '',
    password: '',
    apiUrl: 'https://api.stuller.com',
    updateFrequency: 'daily',
    hasPassword: false
};

export default function StullerIntegrationPanel() {
    const [settings, setSettings] = useState(DEFAULT_SETTINGS);
    const [materials, setMaterials] = useState([]);
    const [loading, setLoading] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [testing, setTesting] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const loadSettings = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/admin/settings/stuller');
            if (!res.ok) throw new Error('Failed to load Stuller settings');
            const data = await res.json();
            setSettings({
                enabled: data.stuller.enabled,
                username: data.stuller.username,
                password: data.stuller.hasPassword ? '********' : '',
                apiUrl: data.stuller.apiUrl,
                updateFrequency: data.stuller.updateFrequency,
                hasPassword: data.stuller.hasPassword
            });
            setError(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const loadMaterials = useCallback(async () => {
        try {
            const res = await fetch('/api/stuller/update-prices');
            if (!res.ok) throw new Error('Failed to load Stuller materials');
            const data = await res.json();
            setMaterials(data.materials || []);
        } catch (err) {
            console.error('Error loading Stuller materials:', err);
        }
    }, []);

    useEffect(() => {
        loadSettings();
        loadMaterials();
    }, [loadSettings, loadMaterials]);

    const saveSettings = async () => {
        try {
            setUpdating(true);
            setError(null);
            setSuccess(null);
            const res = await fetch('/api/admin/settings/stuller', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            });
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to save settings');
            }
            setSuccess('Stuller settings saved successfully');
            loadSettings();
        } catch (err) {
            setError(err.message);
        } finally {
            setUpdating(false);
        }
    };

    const testConnection = async () => {
        try {
            setTesting(true);
            setError(null);
            setSuccess(null);
            const testData = {
                username: settings.username,
                password: settings.password === '********' ? '' : settings.password,
                apiUrl: settings.apiUrl
            };
            if (!testData.username || (!testData.password && !settings.hasPassword)) {
                throw new Error('Username and password are required for testing');
            }
            const res = await fetch('/api/admin/settings/stuller', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(testData)
            });
            const result = await res.json();
            if (result.success) setSuccess(result.message);
            else setError(result.error);
        } catch (err) {
            setError(err.message);
        } finally {
            setTesting(false);
        }
    };

    const updatePrices = async (force = false) => {
        try {
            setUpdating(true);
            setError(null);
            setSuccess(null);
            const res = await fetch('/api/stuller/update-prices', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ force })
            });
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to update prices');
            }
            const result = await res.json();
            setSuccess(`${result.message}. Updated ${result.updated} of ${result.total} materials.`);
            if (result.errors?.length) setError(`Some errors: ${result.errors.join(', ')}`);
            loadMaterials();
        } catch (err) {
            setError(err.message);
        } finally {
            setUpdating(false);
        }
    };

    if (loading && settings.username === '') {
        return (
            <Box display="flex" justifyContent="center" p={4}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Stack spacing={3} sx={{ mb: 4 }}>
            {error && <Alert severity="error">{error}</Alert>}
            {success && <Alert severity="success">{success}</Alert>}

            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom>Stuller API Configuration</Typography>
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={settings.enabled}
                                        onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                                    />
                                }
                                label="Enable Stuller Integration"
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Username"
                                value={settings.username}
                                onChange={(e) => setSettings({ ...settings, username: e.target.value })}
                                disabled={!settings.enabled}
                                helperText="Your Stuller account username"
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                type="password"
                                label="Password"
                                value={settings.password}
                                onChange={(e) => setSettings({ ...settings, password: e.target.value })}
                                disabled={!settings.enabled}
                                helperText={settings.hasPassword ? 'Enter new password to change' : 'Your Stuller account password'}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="API URL"
                                value={settings.apiUrl}
                                onChange={(e) => setSettings({ ...settings, apiUrl: e.target.value })}
                                disabled={!settings.enabled}
                                helperText="Stuller API endpoint URL"
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth disabled={!settings.enabled}>
                                <InputLabel>Update Frequency</InputLabel>
                                <Select
                                    value={settings.updateFrequency}
                                    label="Update Frequency"
                                    onChange={(e) => setSettings({ ...settings, updateFrequency: e.target.value })}
                                >
                                    <MenuItem value="hourly">Hourly</MenuItem>
                                    <MenuItem value="daily">Daily</MenuItem>
                                    <MenuItem value="weekly">Weekly</MenuItem>
                                    <MenuItem value="manual">Manual Only</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                    </Grid>
                </CardContent>
                <CardActions>
                    <LoadingButton variant="contained" loading={updating} onClick={saveSettings} disabled={!settings.enabled}>
                        Save Settings
                    </LoadingButton>
                    <LoadingButton variant="outlined" loading={testing} onClick={testConnection} disabled={!settings.enabled || !settings.username}>
                        Test Connection
                    </LoadingButton>
                </CardActions>
            </Card>

            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom>Price Update Controls</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Materials with &quot;Auto-update pricing&quot; enabled will be updated according to the frequency set above.
                    </Typography>
                </CardContent>
                <CardActions>
                    <LoadingButton variant="contained" loading={updating} onClick={() => updatePrices(false)} disabled={!settings.enabled}>
                        Update Prices Now
                    </LoadingButton>
                    <LoadingButton variant="outlined" loading={updating} onClick={() => updatePrices(true)} disabled={!settings.enabled}>
                        Force Update All
                    </LoadingButton>
                </CardActions>
            </Card>

            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom>Materials with Stuller Integration</Typography>
                    {materials.length === 0 ? (
                        <Typography color="text.secondary">No materials found with Stuller integration enabled.</Typography>
                    ) : (
                        <Grid container spacing={2}>
                            {materials.map((material) => (
                                <Grid item xs={12} sm={6} md={4} key={material._id}>
                                    <Card variant="outlined">
                                        <CardContent>
                                            <Typography variant="subtitle1" gutterBottom>{material.displayName}</Typography>
                                            <Typography variant="body2" color="text.secondary">Stuller #: {material.stuller_item_number}</Typography>
                                            <Typography variant="body2" color="text.secondary">Current Price: ${material.unitCost}</Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Last Updated: {material.last_price_update
                                                    ? new Date(material.last_price_update).toLocaleDateString()
                                                    : 'Never'}
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            ))}
                        </Grid>
                    )}
                </CardContent>
            </Card>
        </Stack>
    );
}
