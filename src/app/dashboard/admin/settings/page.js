'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { 
    Alert,
    AlertTitle,
    Box,
    CircularProgress,
    Container,
    Tabs,
    Tab
} from '@mui/material';
import { 
    Store as StoreIcon,
    Extension as IntegrationIcon
} from '@mui/icons-material';
import { PageContainer } from '@toolpad/core/PageContainer';
import StoreSettingsTab from '@/components/admin/StoreSettingsTab';
import IntegrationsTab from '@/components/admin/IntegrationsTab';

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
    const { data: session, status } = useSession();
    const [tabValue, setTabValue] = useState(0);

    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
    };

    if (status === 'loading') {
        return (
            <PageContainer title="Admin Settings">
                <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                    <CircularProgress />
                </Box>
            </PageContainer>
        );
    }

    if (!session?.user?.email?.includes('@')) {
        return (
            <PageContainer title="Admin Settings">
                <Alert severity="error">
                    <AlertTitle>Access Denied</AlertTitle>
                    You don&apos;t have permission to access admin settings.
                </Alert>
            </PageContainer>
        );
    }

    return (
        <PageContainer title="Admin Settings">
            <Container maxWidth="lg">
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
                                label="Pricing & Business" 
                                id="admin-tab-0"
                                aria-controls="admin-tabpanel-0"
                            />
                            <Tab 
                                icon={<IntegrationIcon />} 
                                label="Integrations" 
                                id="admin-tab-1"
                                aria-controls="admin-tabpanel-1"
                            />
                        </Tabs>
                    </Box>
                    
                    <TabPanel value={tabValue} index={0}>
                        <StoreSettingsTab />
                    </TabPanel>
                    
                    <TabPanel value={tabValue} index={1}>
                        <IntegrationsTab />
                    </TabPanel>
                </Box>
            </Container>
        </PageContainer>
    );
}
