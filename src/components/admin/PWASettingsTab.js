'use client';

import { useState, useEffect } from 'react';
import { 
    Alert,
    Box, 
    Button, 
    Card, 
    CardContent, 
    Chip,
    Divider,
    Grid,
    Typography,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Switch,
    FormControlLabel
} from '@mui/material';
import {
    GetApp as InstallIcon,
    CheckCircle as InstalledIcon,
    PhoneIphone as MobileIcon,
    Computer as DesktopIcon,
    Wifi as OnlineIcon,
    WifiOff as OfflineIcon,
    Storage as CacheIcon,
    Notifications as NotificationIcon,
    Security as SecurityIcon,
    Update as UpdateIcon
} from '@mui/icons-material';

export default function PWASettingsTab() {
    const [installStatus, setInstallStatus] = useState({
        isInstallable: false,
        isInstalled: false,
        isStandalone: false,
        platform: 'unknown'
    });
    
    const [appStatus, setAppStatus] = useState({
        isOnline: true,
        serviceWorker: false,
        cacheSize: 0
    });
    
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [installPromptEnabled, setInstallPromptEnabled] = useState(true);

    useEffect(() => {
        checkInstallStatus();
        checkAppStatus();
        setupInstallPrompt();
    }, []);

    const checkInstallStatus = () => {
        if (typeof window !== 'undefined') {
            const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                               window.navigator.standalone === true;
            const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            
            setInstallStatus({
                isInstalled: isStandalone,
                isStandalone: isStandalone,
                platform: isMobile ? 'mobile' : 'desktop',
                isInstallable: !isStandalone && 'serviceWorker' in navigator
            });
        }
    };

    const checkAppStatus = () => {
        if (typeof window !== 'undefined') {
            const isOnline = navigator.onLine;
            const hasServiceWorker = 'serviceWorker' in navigator;
            
            setAppStatus({
                isOnline,
                serviceWorker: hasServiceWorker,
                cacheSize: 0 // Could be calculated from cache API
            });

            // Listen for online/offline events
            const handleOnline = () => setAppStatus(prev => ({ ...prev, isOnline: true }));
            const handleOffline = () => setAppStatus(prev => ({ ...prev, isOnline: false }));
            
            window.addEventListener('online', handleOnline);
            window.addEventListener('offline', handleOffline);
            
            return () => {
                window.removeEventListener('online', handleOnline);
                window.removeEventListener('offline', handleOffline);
            };
        }
    };

    const setupInstallPrompt = () => {
        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setInstallStatus(prev => ({ ...prev, isInstallable: true }));
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        
        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    };

    const handleInstall = async () => {
        if (deferredPrompt) {
            try {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                
                if (outcome === 'accepted') {
                    console.log('PWA installed');
                    alert('PWA installation accepted!');
                }
                
                setDeferredPrompt(null);
                setTimeout(checkInstallStatus, 1000);
            } catch (error) {
                console.error('Installation failed:', error);
                alert('Installation failed: ' + error.message);
            }
        } else {
            // Development mode fallback - provide manual installation instructions
            const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
            const isEdge = /Edg/.test(navigator.userAgent);
            
            let instructions = "To install this PWA manually:\n\n";
            
            if (isChrome || isEdge) {
                instructions += "1. Look for the install icon (⊕) in the address bar\n";
                instructions += "2. Or use the browser menu: More Tools → Install App\n";
                instructions += "3. Or use Ctrl+Shift+A keyboard shortcut\n\n";
            } else {
                instructions += "1. Use a Chromium-based browser (Chrome, Edge) for best PWA support\n";
                instructions += "2. Navigate to the app in the browser\n";
                instructions += "3. Look for install options in the browser menu\n\n";
            }
            
            instructions += "Note: PWA installation prompts work better in production builds.\n";
            instructions += "For development, manual installation may be required.";
            
            alert(instructions);
            console.log('Manual PWA installation instructions shown');
        }
    };

    const handleToggleInstallPrompt = (event) => {
        const enabled = event.target.checked;
        setInstallPromptEnabled(enabled);
        
        if (enabled) {
            localStorage.removeItem('pwa-install-dismissed');
            localStorage.removeItem('pwa-install-dismissed-time');
        } else {
            localStorage.setItem('pwa-install-dismissed', 'true');
            localStorage.setItem('pwa-install-dismissed-time', Date.now().toString());
        }
    };

    const clearAppData = async () => {
        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (let registration of registrations) {
                registration.unregister();
            }
        }
        
        if ('caches' in window) {
            const cacheNames = await caches.keys();
            for (let cacheName of cacheNames) {
                await caches.delete(cacheName);
            }
        }
        
        localStorage.removeItem('pwa-install-dismissed');
        localStorage.removeItem('pwa-install-dismissed-time');
        
        alert('App data cleared. Please refresh the page.');
    };

    return (
        <Box>
            <Typography variant="h5" gutterBottom>
                Progressive Web App Settings
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
                Configure your PWA installation and manage app behavior for the checkout counter.
            </Typography>

            <Grid container spacing={3}>
                {/* Installation Status */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Installation Status
                            </Typography>
                            
                            <List dense>
                                <ListItem>
                                    <ListItemIcon>
                                        {installStatus.isInstalled ? 
                                            <InstalledIcon color="success" /> : 
                                            <InstallIcon color="action" />
                                        }
                                    </ListItemIcon>
                                    <ListItemText 
                                        primary="App Installation"
                                        secondary={installStatus.isInstalled ? 'Installed' : 'Not installed'}
                                    />
                                    <Chip 
                                        label={installStatus.isInstalled ? 'Installed' : 'Available'} 
                                        color={installStatus.isInstalled ? 'success' : 'default'}
                                        size="small"
                                    />
                                </ListItem>
                                
                                <ListItem>
                                    <ListItemIcon>
                                        {installStatus.platform === 'mobile' ? 
                                            <MobileIcon color="primary" /> : 
                                            <DesktopIcon color="primary" />
                                        }
                                    </ListItemIcon>
                                    <ListItemText 
                                        primary="Platform"
                                        secondary={`Running on ${installStatus.platform}`}
                                    />
                                </ListItem>
                                
                                <ListItem>
                                    <ListItemIcon>
                                        <SecurityIcon color={installStatus.isStandalone ? 'success' : 'action'} />
                                    </ListItemIcon>
                                    <ListItemText 
                                        primary="Standalone Mode"
                                        secondary={installStatus.isStandalone ? 'Running as app' : 'Running in browser'}
                                    />
                                </ListItem>
                            </List>

                            {installStatus.isInstallable && !installStatus.isInstalled && (
                                <Box sx={{ mt: 2 }}>
                                    <Button
                                        variant="contained"
                                        startIcon={<InstallIcon />}
                                        onClick={handleInstall}
                                        fullWidth
                                    >
                                        {deferredPrompt ? 'Install App Now' : 'Manual Install Instructions'}
                                    </Button>
                                    {!deferredPrompt && (
                                        <Typography variant="caption" display="block" sx={{ mt: 1, textAlign: 'center' }}>
                                            Auto-install prompt not available in development mode
                                        </Typography>
                                    )}
                                </Box>
                            )}
                            
                            {!installStatus.isInstallable && !installStatus.isInstalled && (
                                <Box sx={{ mt: 2 }}>
                                    <Alert severity="info">
                                        PWA installation not available. Make sure you're using HTTPS or localhost with a service worker.
                                    </Alert>
                                </Box>
                            )}
                        </CardContent>
                    </Card>
                </Grid>

                {/* App Status */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                App Status
                            </Typography>
                            
                            <List dense>
                                <ListItem>
                                    <ListItemIcon>
                                        {appStatus.isOnline ? 
                                            <OnlineIcon color="success" /> : 
                                            <OfflineIcon color="error" />
                                        }
                                    </ListItemIcon>
                                    <ListItemText 
                                        primary="Network Status"
                                        secondary={appStatus.isOnline ? 'Online' : 'Offline'}
                                    />
                                    <Chip 
                                        label={appStatus.isOnline ? 'Online' : 'Offline'} 
                                        color={appStatus.isOnline ? 'success' : 'error'}
                                        size="small"
                                    />
                                </ListItem>
                                
                                <ListItem>
                                    <ListItemIcon>
                                        <UpdateIcon color={appStatus.serviceWorker ? 'success' : 'action'} />
                                    </ListItemIcon>
                                    <ListItemText 
                                        primary="Service Worker"
                                        secondary={appStatus.serviceWorker ? 'Active' : 'Not available'}
                                    />
                                </ListItem>
                                
                                <ListItem>
                                    <ListItemIcon>
                                        <CacheIcon color="primary" />
                                    </ListItemIcon>
                                    <ListItemText 
                                        primary="Offline Cache"
                                        secondary="Enables offline functionality"
                                    />
                                </ListItem>
                            </List>
                        </CardContent>
                    </Card>
                </Grid>

                {/* PWA Configuration */}
                <Grid item xs={12}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                PWA Configuration
                            </Typography>
                            
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={installPromptEnabled}
                                        onChange={handleToggleInstallPrompt}
                                        color="primary"
                                    />
                                }
                                label="Show install prompt to users"
                            />
                            
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
                                When enabled, users will see a prompt to install the app after a few seconds.
                            </Typography>

                            <Divider sx={{ my: 2 }} />

                            <Typography variant="subtitle2" gutterBottom>
                                App Features
                            </Typography>
                            <List dense>
                                <ListItem>
                                    <ListItemIcon><InstallIcon /></ListItemIcon>
                                    <ListItemText 
                                        primary="Installable"
                                        secondary="Can be installed on desktop and mobile devices"
                                    />
                                </ListItem>
                                <ListItem>
                                    <ListItemIcon><OfflineIcon /></ListItemIcon>
                                    <ListItemText 
                                        primary="Offline Support"
                                        secondary="Works without internet connection for basic features"
                                    />
                                </ListItem>
                                <ListItem>
                                    <ListItemIcon><CacheIcon /></ListItemIcon>
                                    <ListItemText 
                                        primary="Smart Caching"
                                        secondary="Automatically caches resources for faster loading"
                                    />
                                </ListItem>
                                <ListItem>
                                    <ListItemIcon><SecurityIcon /></ListItemIcon>
                                    <ListItemText 
                                        primary="Secure HTTPS"
                                        secondary="Runs over secure connection for data protection"
                                    />
                                </ListItem>
                            </List>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Debug Information */}
                <Grid item xs={12}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Debug Information
                            </Typography>
                            
                            <Alert severity={deferredPrompt ? "success" : "warning"} sx={{ mb: 2 }}>
                                <strong>Install Prompt Status:</strong> {deferredPrompt ? 'Available' : 'Not Available'}
                                <br />
                                {!deferredPrompt && (
                                    <>
                                        In development mode, the browser may not show the automatic install prompt.
                                        <br />
                                        <strong>Manual Installation:</strong> Look for the install icon (⊕) in your browser's address bar.
                                    </>
                                )}
                            </Alert>

                            <List dense>
                                <ListItem>
                                    <ListItemText 
                                        primary="Service Worker Support"
                                        secondary={`${'serviceWorker' in navigator ? 'Supported' : 'Not Supported'}`}
                                    />
                                </ListItem>
                                <ListItem>
                                    <ListItemText 
                                        primary="Display Mode"
                                        secondary={installStatus.isStandalone ? 'Standalone (Installed)' : 'Browser Mode'}
                                    />
                                </ListItem>
                                <ListItem>
                                    <ListItemText 
                                        primary="User Agent"
                                        secondary={typeof window !== 'undefined' ? navigator.userAgent.slice(0, 100) + '...' : 'Unknown'}
                                    />
                                </ListItem>
                                <ListItem>
                                    <ListItemText 
                                        primary="Current URL"
                                        secondary={typeof window !== 'undefined' ? window.location.origin : 'Unknown'}
                                    />
                                </ListItem>
                            </List>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Troubleshooting */}
                <Grid item xs={12}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom color="warning.main">
                                Troubleshooting
                            </Typography>
                            
                            <Alert severity="info" sx={{ mb: 2 }}>
                                <strong>For OrangePi Installation:</strong>
                                <br />
                                1. Use Chrome/Chromium browser
                                <br />
                                2. Visit this page over HTTPS (production server)
                                <br />
                                3. Look for install icon in address bar
                                <br />
                                4. Or use the &quot;Install App Now&quot; button above
                            </Alert>

                            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                <Button
                                    variant="outlined"
                                    color="warning"
                                    onClick={clearAppData}
                                >
                                    Clear App Data
                                </Button>
                                
                                <Button
                                    variant="outlined"
                                    onClick={() => window.location.reload()}
                                >
                                    Refresh App
                                </Button>
                            </Box>
                            
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                                Clear app data if experiencing issues. This will remove cached files and reset the app.
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
}
