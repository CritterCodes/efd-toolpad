'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import {
    Alert,
    AlertTitle,
    Box,
    CircularProgress,
    Tabs,
    Tab,
    Typography
} from '@mui/material';
import { 
    Store as StoreIcon,
    Extension as IntegrationIcon,
    PhoneIphone as PWAIcon
} from '@mui/icons-material';
import StoreSettingsTab from '@/components/admin/StoreSettingsTab';
import IntegrationsTab from '@/components/admin/IntegrationsTab';
import PWASettingsTab from '@/components/admin/PWASettingsTab';

function TabPanel({ children, value, index, ...other }) {
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`admin-tabpanel-${index}`}
            aria-labelledby={`admin-tab-${index}`}
            {...other}
        >
            {value === index && (
                <Box sx={{ py: 3 }}>
                    {children}
                </Box>
            )}
        </div>
    );
}

export default function AdminSettingsPage() {
    const sessionState = useSession() || {};
    const { data: session = null, status = 'loading' } = sessionState;
    const [tabValue, setTabValue] = useState(0);

    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
    };

    if (status === 'loading') {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    if (!session?.user?.email?.includes('@')) {
        return (
            <Alert severity="error">
                <AlertTitle>Access Denied</AlertTitle>
                You don&apos;t have permission to access admin settings.
            </Alert>
        );
    }

    return (
        <Box sx={{ pb: 10 }}>
            <Box sx={{ mb: 3 }}>
                <Typography variant="h5" fontWeight={600} sx={{ color: '#D1D5DB' }}>Admin Settings</Typography>
                <Typography variant="body2" sx={{ color: '#9CA3AF', mt: 0.5 }}>Configure store pricing, integrations, and system settings.</Typography>
            </Box>
            <Box sx={{ width: '100%' }}>
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                        <Tabs 
                            value={tabValue} 
                            onChange={handleTabChange} 
                            aria-label="admin settings tabs"
                            variant="scrollable"
                            scrollButtons="auto"
                        >
                            <Tab 
                                icon={<StoreIcon />} 
                                label="Store Settings" 
                                id="admin-tab-0"
                                aria-controls="admin-tabpanel-0"
                            />
                            <Tab 
                                icon={<IntegrationIcon />} 
                                label="Integrations" 
                                id="admin-tab-1"
                                aria-controls="admin-tabpanel-1"
                            />
                            <Tab 
                                icon={<PWAIcon />} 
                                label="PWA / App Install" 
                                id="admin-tab-2"
                                aria-controls="admin-tabpanel-2"
                            />
                        </Tabs>
                    </Box>
                    
                    <TabPanel value={tabValue} index={0}>
                        <StoreSettingsTab />
                    </TabPanel>
                    
                    <TabPanel value={tabValue} index={1}>
                        <IntegrationsTab />
                    </TabPanel>
                    
                    <TabPanel value={tabValue} index={2}>
                        <PWASettingsTab />
                    </TabPanel>
                </Box>
            </Box>
    );
}

