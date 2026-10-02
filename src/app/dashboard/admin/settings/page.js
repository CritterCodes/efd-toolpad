'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { TabRail } from '@/components/facelift';
import {
    Alert,
    AlertTitle,
    Box,
    CircularProgress,
    Typography
} from '@mui/material';
import {
    Store as StoreIcon,
    Extension as IntegrationIcon,
    PhoneIphone as PWAIcon,
    Diamond as DesignIcon
} from '@mui/icons-material';
import StoreSettingsTab from '@/components/admin/StoreSettingsTab';
import IntegrationsTab from '@/components/admin/IntegrationsTab';
import PWASettingsTab from '@/components/admin/PWASettingsTab';
import CustomDesignPricingTab from '@/components/admin/CustomDesignPricingTab';

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
                <Typography component="h1" variant="h5" fontWeight={600} sx={{ color: '#D1D5DB' }}>Admin Settings</Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.66)', mt: 0.5 }}>Configure store pricing, integrations, and system settings.</Typography>
            </Box>
            <Box sx={{ width: '100%' }}>
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                        <TabRail
                            ariaLabel="Admin settings"
                            value={tabValue}
                            onChange={(key) => handleTabChange(null, key)}
                            items={[
                                { key: 0, label: 'Store Settings', icon: <StoreIcon /> },
                                { key: 1, label: 'Integrations', icon: <IntegrationIcon /> },
                                { key: 2, label: 'PWA / App Install', icon: <PWAIcon /> },
                                { key: 3, label: 'Custom Design', icon: <DesignIcon /> },
                            ]}
                        />
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

                    <TabPanel value={tabValue} index={3}>
                        <CustomDesignPricingTab />
                    </TabPanel>
                </Box>
            </Box>
    );
}

