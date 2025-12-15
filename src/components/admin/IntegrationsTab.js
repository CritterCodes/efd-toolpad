'use client';

import { useState, useEffect } from 'react';
import { 
    Card, 
    CardContent, 
    CardHeader, 
    Typography,
    Button,
    TextField,
    Alert,
    AlertTitle,
    Box,
    Grid,
    CircularProgress,
    Switch,
    FormControlLabel,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Divider,
    Chip,
    Stack,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    IconButton,
    Tooltip
} from '@mui/material';
import { 
    Extension as IntegrationIcon,
    CheckCircle as CheckCircleIcon,
    Error as ErrorIcon,
    Refresh as RefreshIcon,
    Settings as SettingsIcon,
    Store as ShopifyIcon,
    Diamond as StullerIcon,
    Visibility as VisibilityIcon,
    VisibilityOff as VisibilityOffIcon
} from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';

export default function IntegrationsTab() {
    // Stuller Integration State
    const [stullerSettings, setStullerSettings] = useState({
        enabled: false,
        username: '',
        password: '',
        apiUrl: 'https://api.stuller.com',
        updateFrequency: 'daily',
        hasPassword: false
    });
    const [stullerLoading, setStullerLoading] = useState(false);
    const [stullerTesting, setStullerTesting] = useState(false);
    const [stullerError, setStullerError] = useState(null);
    const [stullerSuccess, setStullerSuccess] = useState(null);
    const [showStullerPassword, setShowStullerPassword] = useState(false);

    // Shopify Integration State
    const [shopifySettings, setShopifySettings] = useState({
        enabled: false,
        shopUrl: '',
        accessToken: '',
        apiVersion: '2025-07',
        webhooksEnabled: false,
        hasAccessToken: false
    });
    const [shopifyLoading, setShopifyLoading] = useState(false);
    const [shopifyTesting, setShopifyTesting] = useState(false);
    const [webhooksLoading, setWebhooksLoading] = useState(false);
    const [shopifyError, setShopifyError] = useState(null);
    const [shopifySuccess, setShopifySuccess] = useState(null);
    const [showShopifyToken, setShowShopifyToken] = useState(false);
    const [migrationLoading, setMigrationLoading] = useState(false);

    // Materials with integrations
    const [materials, setMaterials] = useState([]);
    const [showMaterialsDialog, setShowMaterialsDialog] = useState(false);

    useEffect(() => {
        loadStullerSettings();
        loadShopifySettings();
        loadMaterials();
    }, []);

    // Stuller Integration Functions
    const loadStullerSettings = async () => {
        try {
            setStullerLoading(true);
            const response = await fetch('/api/admin/settings/stuller');
            
            if (!response.ok) {
                throw new Error('Failed to load Stuller settings');
            }
            
            const data = await response.json();
            setStullerSettings({
                enabled: data.stuller.enabled,
                username: data.stuller.username,
                password: data.stuller.hasPassword ? '••••••••' : '',
                apiUrl: data.stuller.apiUrl,
                updateFrequency: data.stuller.updateFrequency,
                hasPassword: data.stuller.hasPassword
            });
            setStullerError(null);
        } catch (error) {
            console.error('Error loading Stuller settings:', error);
            setStullerError(error.message);
        } finally {
            setStullerLoading(false);
        }
    };

    const saveStullerSettings = async () => {
        try {
            setStullerLoading(true);
            setStullerError(null);
            setStullerSuccess(null);

            const response = await fetch('/api/admin/settings/stuller', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(stullerSettings)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to save settings');
            }

            setStullerSuccess('Stuller settings saved successfully');
            loadStullerSettings(); // Reload to get masked password

        } catch (error) {
            console.error('Error saving Stuller settings:', error);
            setStullerError(error.message);
        } finally {
            setStullerLoading(false);
        }
    };

    const testStullerConnection = async () => {
        try {
            setStullerTesting(true);
            setStullerError(null);

            // Send current settings for testing
            const response = await fetch('/api/admin/settings/stuller', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    action: 'test',
                    username: stullerSettings.username,
                    password: stullerSettings.password,
                    apiUrl: stullerSettings.apiUrl
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Connection test failed');
            }

            setStullerSuccess('Stuller connection test successful');

        } catch (error) {
            console.error('Error testing Stuller connection:', error);
            setStullerError(error.message);
        } finally {
            setStullerTesting(false);
        }
    };

    // Shopify Integration Functions
    const loadShopifySettings = async () => {
        try {
            setShopifyLoading(true);
            const response = await fetch('/api/admin/settings/shopify');
            
            if (!response.ok) {
                throw new Error('Failed to load Shopify settings');
            }
            
            const data = await response.json();
            setShopifySettings({
                enabled: data.shopify.enabled || false,
                shopUrl: data.shopify.shopUrl || '',
                accessToken: data.shopify.hasAccessToken ? '••••••••••••••••' : '',
                apiVersion: data.shopify.apiVersion || '2025-07',
                webhooksEnabled: data.shopify.webhooksEnabled || false,
                hasAccessToken: data.shopify.hasAccessToken || false
            });
        } catch (error) {
            console.error('Error loading Shopify settings:', error);
            setShopifyError('Failed to load Shopify settings');
        } finally {
            setShopifyLoading(false);
        }
    };

    const saveShopifySettings = async () => {
        try {
            setShopifyLoading(true);
            setShopifyError(null);
            setShopifySuccess(null);

            const response = await fetch('/api/admin/settings/shopify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    enabled: shopifySettings.enabled,
                    shopUrl: shopifySettings.shopUrl,
                    accessToken: shopifySettings.accessToken,
                    apiVersion: shopifySettings.apiVersion,
                    webhooksEnabled: shopifySettings.webhooksEnabled
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to save Shopify settings');
            }

            const result = await response.json();
            setShopifySuccess('Shopify settings saved successfully');
            
            // Update state to show masked token
            if (shopifySettings.accessToken && !shopifySettings.accessToken.includes('•')) {
                setShopifySettings(prev => ({
                    ...prev,
                    accessToken: '••••••••••••••••',
                    hasAccessToken: true
                }));
            }
            
        } catch (error) {
            console.error('Error saving Shopify settings:', error);
            setShopifyError('Failed to save Shopify settings');
        } finally {
            setShopifyLoading(false);
        }
    };

    const testShopifyConnection = async () => {
        try {
            setShopifyTesting(true);
            setShopifyError(null);
            setShopifySuccess(null);

            if (!shopifySettings.shopUrl || !shopifySettings.accessToken) {
                throw new Error('Shop URL and Access Token are required');
            }

            const response = await fetch('/api/admin/settings/shopify', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    shopUrl: shopifySettings.shopUrl,
                    accessToken: shopifySettings.accessToken,
                    apiVersion: shopifySettings.apiVersion,
                    action: 'test'
                }),
            });

            const result = await response.json();

            if (response.ok && result.success) {
                setShopifySuccess(`Connection successful! Shop: ${result.shop?.name || 'Connected'}`);
            } else {
                throw new Error(result.error || 'Connection test failed');
            }

        } catch (error) {
            console.error('Shopify connection test error:', error);
            setShopifyError(`Connection test failed: ${error.message}`);
        } finally {
            setShopifyTesting(false);
        }
    };

    const setupShopifyWebhooks = async () => {
        try {
            setWebhooksLoading(true);
            setShopifyError(null);
            setShopifySuccess(null);

            console.log('🔧 Setting up Shopify webhooks...');

            const response = await fetch('/api/admin/shopify/webhooks/setup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            const result = await response.json();

            if (response.ok) {
                setShopifySuccess(`Successfully registered ${result.webhooks.length} webhooks for payment notifications`);
                console.log('✅ Webhooks registered:', result.webhooks);
            } else {
                throw new Error(result.message || 'Failed to setup webhooks');
            }

        } catch (error) {
            console.error('Webhook setup error:', error);
            setShopifyError(`Webhook setup failed: ${error.message}`);
        } finally {
            setWebhooksLoading(false);
        }
    };

    const handleMigrateCatalog = async () => {
        if (!window.confirm('This will import/update all Jewelry and Gemstone products from Shopify. This process runs in batches and may take several minutes. Continue?')) {
            return;
        }

        try {
            setMigrationLoading(true);
            setShopifyError(null);
            setShopifySuccess('Starting migration...');

            let totalProcessed = 0;
            let totalNew = 0;
            let totalUpdated = 0;
            let batchCount = 0;
            let keepGoing = true;
            const MAX_BATCHES = 500; // Safety limit

            while (keepGoing && batchCount < MAX_BATCHES) {
                batchCount++;
                setShopifySuccess(`Processing batch ${batchCount}... (Total processed so far: ${totalProcessed})`);
                
                const response = await fetch('/api/admin/migrate-shopify', {
                    method: 'POST'
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.error || 'Migration failed');
                }

                const stats = result.stats;
                
                // Log detailed stats and errors to console
                console.log(`Batch ${batchCount} Stats:`, stats);
                
                if (stats.logs && stats.logs.length > 0) {
                    console.log(`Batch ${batchCount} Logs:`, stats.logs);
                }

                if (stats.errors && stats.errors.length > 0) {
                    console.error(`Batch ${batchCount} Errors:`, stats.errors);
                }

                const batchProcessed = stats.processed || 0;
                totalProcessed += batchProcessed;
                totalNew += ((stats.jewelry?.new || 0) + (stats.gemstones?.new || 0));
                totalUpdated += ((stats.jewelry?.updated || 0) + (stats.gemstones?.updated || 0));

                // Stop if we processed 0 items (end of list)
                if (batchProcessed === 0) {
                    keepGoing = false;
                } else {
                    // Small delay to prevent rate limiting
                    await new Promise(r => setTimeout(r, 1000));
                }
            }

            setShopifySuccess(`Migration Complete! Processed ${totalProcessed} products. (${totalNew} new, ${totalUpdated} updated). Check console for detailed logs.`);

        } catch (error) {
            console.error('Migration error:', error);
            setShopifyError(`Migration failed: ${error.message}`);
        } finally {
            setMigrationLoading(false);
        }
    };

    const loadMaterials = async () => {
        try {
            const response = await fetch('/api/repair-materials');
            if (response.ok) {
                const data = await response.json();
                const integratedMaterials = data.materials.filter(m => 
                    m.stuller_item_number
                );
                setMaterials(integratedMaterials);
            }
        } catch (error) {
            console.error('Error loading materials:', error);
        }
    };

    return (
        <Box>
            <Grid container spacing={3}>
                {/* Stuller Integration */}
                <Grid item xs={12} lg={6}>
                    <Card>
                        <CardHeader 
                            title="Stuller Integration"
                            avatar={<StullerIcon color="primary" />}
                            action={
                                <Chip 
                                    label={stullerSettings.enabled ? 'Enabled' : 'Disabled'}
                                    color={stullerSettings.enabled ? 'success' : 'default'}
                                    size="small"
                                />
                            }
                        />
                        <CardContent>
                            <Stack spacing={2}>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={stullerSettings.enabled}
                                            onChange={(e) => setStullerSettings(prev => ({
                                                ...prev,
                                                enabled: e.target.checked
                                            }))}
                                        />
                                    }
                                    label="Enable Stuller Integration"
                                />

                                {stullerSettings.enabled && (
                                    <>
                                        <TextField
                                            fullWidth
                                            label="Stuller Username"
                                            value={stullerSettings.username}
                                            onChange={(e) => setStullerSettings(prev => ({
                                                ...prev,
                                                username: e.target.value
                                            }))}
                                            placeholder="Enter your Stuller username"
                                        />

                                        <TextField
                                            fullWidth
                                            label="Stuller Password"
                                            type={showStullerPassword ? 'text' : 'password'}
                                            value={stullerSettings.password}
                                            onChange={(e) => setStullerSettings(prev => ({
                                                ...prev,
                                                password: e.target.value
                                            }))}
                                            placeholder="Enter your Stuller password"
                                            InputProps={{
                                                endAdornment: (
                                                    <IconButton
                                                        onClick={() => setShowStullerPassword(!showStullerPassword)}
                                                        edge="end"
                                                    >
                                                        {showStullerPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                                                    </IconButton>
                                                )
                                            }}
                                        />

                                        <FormControl fullWidth>
                                            <InputLabel>Price Update Frequency</InputLabel>
                                            <Select
                                                value={stullerSettings.updateFrequency}
                                                label="Price Update Frequency"
                                                onChange={(e) => setStullerSettings(prev => ({
                                                    ...prev,
                                                    updateFrequency: e.target.value
                                                }))}
                                            >
                                                <MenuItem value="manual">Manual Only</MenuItem>
                                                <MenuItem value="daily">Daily</MenuItem>
                                                <MenuItem value="weekly">Weekly</MenuItem>
                                                <MenuItem value="monthly">Monthly</MenuItem>
                                            </Select>
                                        </FormControl>

                                        <Box display="flex" gap={1}>
                                            <LoadingButton
                                                variant="contained"
                                                onClick={saveStullerSettings}
                                                loading={stullerLoading}
                                                disabled={!stullerSettings.username || !stullerSettings.password}
                                            >
                                                Save Settings
                                            </LoadingButton>
                                            
                                            <LoadingButton
                                                variant="outlined"
                                                onClick={testStullerConnection}
                                                loading={stullerTesting}
                                                disabled={!stullerSettings.username || !stullerSettings.password}
                                                startIcon={<RefreshIcon />}
                                            >
                                                Test Connection
                                            </LoadingButton>
                                        </Box>
                                    </>
                                )}

                                {stullerError && (
                                    <Alert severity="error">
                                        <AlertTitle>Stuller Error</AlertTitle>
                                        {stullerError}
                                    </Alert>
                                )}

                                {stullerSuccess && (
                                    <Alert severity="success">
                                        <AlertTitle>Success</AlertTitle>
                                        {stullerSuccess}
                                    </Alert>
                                )}
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Shopify Integration */}
                <Grid item xs={12} lg={6}>
                    <Card>
                        <CardHeader 
                            title="Shopify Integration"
                            avatar={<ShopifyIcon color="primary" />}
                            action={
                                <Chip 
                                    label={shopifySettings.enabled ? 'Enabled' : 'Disabled'}
                                    color={shopifySettings.enabled ? 'success' : 'default'}
                                    size="small"
                                />
                            }
                        />
                        <CardContent>
                            <Stack spacing={2}>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={shopifySettings.enabled}
                                            onChange={(e) => setShopifySettings(prev => ({
                                                ...prev,
                                                enabled: e.target.checked
                                            }))}
                                        />
                                    }
                                    label="Enable Shopify Integration"
                                />

                                {shopifySettings.enabled && (
                                    <>
                                        <TextField
                                            fullWidth
                                            label="Shop URL"
                                            value={shopifySettings.shopUrl}
                                            onChange={(e) => setShopifySettings(prev => ({
                                                ...prev,
                                                shopUrl: e.target.value
                                            }))}
                                            placeholder="your-shop.myshopify.com"
                                            helperText="Enter your Shopify store URL"
                                        />

                                        <TextField
                                            fullWidth
                                            label="Access Token"
                                            type={showShopifyToken ? 'text' : 'password'}
                                            value={shopifySettings.accessToken}
                                            onChange={(e) => setShopifySettings(prev => ({
                                                ...prev,
                                                accessToken: e.target.value
                                            }))}
                                            placeholder="Enter your Shopify access token"
                                            InputProps={{
                                                endAdornment: (
                                                    <IconButton
                                                        onClick={() => setShowShopifyToken(!showShopifyToken)}
                                                        edge="end"
                                                    >
                                                        {showShopifyToken ? <VisibilityOffIcon /> : <VisibilityIcon />}
                                                    </IconButton>
                                                )
                                            }}
                                        />

                                        <FormControl fullWidth>
                                            <InputLabel>API Version</InputLabel>
                                            <Select
                                                value={shopifySettings.apiVersion}
                                                label="API Version"
                                                onChange={(e) => setShopifySettings(prev => ({
                                                    ...prev,
                                                    apiVersion: e.target.value
                                                }))}
                                            >
                                                <MenuItem value="2025-07">2025-07 (Latest)</MenuItem>
                                                <MenuItem value="2025-04">2025-04</MenuItem>
                                                <MenuItem value="2025-01">2025-01</MenuItem>
                                                <MenuItem value="2024-10">2024-10</MenuItem>
                                                <MenuItem value="2024-07">2024-07</MenuItem>
                                                <MenuItem value="2024-04">2024-04</MenuItem>
                                                <MenuItem value="2024-01">2024-01</MenuItem>
                                            </Select>
                                        </FormControl>

                                        <FormControlLabel
                                            control={
                                                <Switch
                                                    checked={shopifySettings.webhooksEnabled}
                                                    onChange={(e) => setShopifySettings(prev => ({
                                                        ...prev,
                                                        webhooksEnabled: e.target.checked
                                                    }))}
                                                />
                                            }
                                            label="Enable Webhooks"
                                        />

                                        <Box display="flex" gap={1} flexWrap="wrap">
                                            <LoadingButton
                                                variant="contained"
                                                onClick={saveShopifySettings}
                                                loading={shopifyLoading}
                                                disabled={!shopifySettings.shopUrl || !shopifySettings.accessToken}
                                            >
                                                Save Settings
                                            </LoadingButton>
                                            
                                            <LoadingButton
                                                variant="outlined"
                                                onClick={testShopifyConnection}
                                                loading={shopifyTesting}
                                                disabled={!shopifySettings.shopUrl || !shopifySettings.accessToken}
                                                startIcon={<RefreshIcon />}
                                            >
                                                Test Connection
                                            </LoadingButton>

                                            <LoadingButton
                                                variant="outlined"
                                                color="secondary"
                                                onClick={setupShopifyWebhooks}
                                                loading={webhooksLoading}
                                                disabled={!shopifySettings.shopUrl || !shopifySettings.accessToken || !shopifySettings.enabled}
                                                startIcon={<RefreshIcon />}
                                            >
                                                Setup Webhooks
                                            </LoadingButton>

                                            <LoadingButton
                                                variant="outlined"
                                                color="warning"
                                                onClick={handleMigrateCatalog}
                                                loading={migrationLoading}
                                                disabled={!shopifySettings.shopUrl || !shopifySettings.accessToken || !shopifySettings.enabled}
                                                startIcon={<RefreshIcon />}
                                            >
                                                Sync Catalog
                                            </LoadingButton>
                                        </Box>
                                    </>
                                )}

                                {shopifyError && (
                                    <Alert severity="error">
                                        <AlertTitle>Shopify Error</AlertTitle>
                                        {shopifyError}
                                    </Alert>
                                )}

                                {shopifySuccess && (
                                    <Alert severity="success">
                                        <AlertTitle>Success</AlertTitle>
                                        {shopifySuccess}
                                    </Alert>
                                )}
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Integration Overview */}
                <Grid item xs={12}>
                    <Card>
                        <CardHeader 
                            title="Integration Overview"
                            avatar={<IntegrationIcon color="primary" />}
                        />
                        <CardContent>
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6} md={3}>
                                    <Box textAlign="center">
                                        <Typography variant="h4" color="primary">
                                            {materials.filter(m => m.stuller_item_number).length}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Stuller Materials
                                        </Typography>
                                    </Box>
                                </Grid>
                                <Grid item xs={12} sm={6} md={3}>
                                    <Box textAlign="center">
                                        <Typography variant="h4" color="success.main">
                                            {stullerSettings.enabled && shopifySettings.enabled ? 2 : 
                                             stullerSettings.enabled || shopifySettings.enabled ? 1 : 0}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Active Integrations
                                        </Typography>
                                    </Box>
                                </Grid>
                                <Grid item xs={12} sm={6} md={3}>
                                    <Box textAlign="center">
                                        <Button
                                            variant="outlined"
                                            onClick={() => setShowMaterialsDialog(true)}
                                            startIcon={<SettingsIcon />}
                                        >
                                            View Materials
                                        </Button>
                                    </Box>
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Materials Dialog */}
            <Dialog 
                open={showMaterialsDialog} 
                onClose={() => setShowMaterialsDialog(false)}
                maxWidth="md" 
                fullWidth
            >
                <DialogTitle>Materials with Integrations</DialogTitle>
                <DialogContent>
                    <List>
                        {materials.map((material) => (
                            <ListItem key={material._id}>
                                <ListItemIcon>
                                    <StullerIcon color="primary" />
                                </ListItemIcon>
                                <ListItemText
                                    primary={material.displayName}
                                    secondary={`Stuller Item: ${material.stuller_item_number}`}
                                />
                                <Chip
                                    size="small"
                                    label="Stuller"
                                    color="primary"
                                />
                            </ListItem>
                        ))}
                        {materials.length === 0 && (
                            <ListItem>
                                <ListItemText
                                    primary="No integrated materials found"
                                    secondary="Add materials with Stuller item numbers to see them here."
                                />
                            </ListItem>
                        )}
                    </List>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowMaterialsDialog(false)}>Close</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
