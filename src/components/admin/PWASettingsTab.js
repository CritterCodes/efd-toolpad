'use client';

import { Box, Grid, Typography } from '@mui/material';
import { usePWASettings } from '@/hooks/admin/usePWASettings';
import {
    InstallationStatus,
    AppStatus,
    PWAConfiguration,
    DebugInformation,
    Troubleshooting
} from './pwa-settings';

export default function PWASettingsTab() {
    const {
        installStatus,
        appStatus,
        deferredPrompt,
        installPromptEnabled,
        handleInstall,
        handleToggleInstallPrompt,
        clearAppData
    } = usePWASettings();

    return (
        <Box>
            <Typography variant="h5" gutterBottom>
                Progressive Web App Settings
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
                Configure your PWA installation and manage app behavior for the checkout counter.
            </Typography>

            <Grid container spacing={3}>
                <InstallationStatus 
                    installStatus={installStatus} 
                    deferredPrompt={deferredPrompt} 
                    handleInstall={handleInstall} 
                />
                
                <AppStatus appStatus={appStatus} />

                <PWAConfiguration 
                    installPromptEnabled={installPromptEnabled} 
                    handleToggleInstallPrompt={handleToggleInstallPrompt} 
                />

                <DebugInformation 
                    deferredPrompt={deferredPrompt} 
                    installStatus={installStatus} 
                />

                <Troubleshooting 
                    clearAppData={clearAppData} 
                />
            </Grid>
        </Box>
    );
}
