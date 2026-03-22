
import React from 'react';
import { Box, Alert, AlertTitle } from '@mui/material';
import { useIntegrationsSettings } from '@/hooks/admin/useIntegrationsSettings';
import StullerIntegrationPanel from './integrations/StullerIntegrationPanel';
import ShopifyIntegrationPanel from './integrations/ShopifyIntegrationPanel';
import SystemLogsPanel from './integrations/SystemLogsPanel';

export default function IntegrationsTab() {
    const { settings, setSettings, loading, status, saveSettings, testConnection } = useIntegrationsSettings();

    return (
        <Box>
            {status.message && (
                <Alert severity={status.type} sx={{ mb: 3 }}>
                    <AlertTitle>{status.type === 'error' ? 'Error' : 'Success'}</AlertTitle>
                    {status.message}
                </Alert>
            )}
            <StullerIntegrationPanel settings={settings} setSettings={setSettings} saveSettings={saveSettings} testConnection={testConnection} loading={loading} />
            <ShopifyIntegrationPanel settings={settings} setSettings={setSettings} saveSettings={saveSettings} testConnection={testConnection} loading={loading} />
            <SystemLogsPanel />
        </Box>
    );
}
