
import React from 'react';
import { Card, CardHeader, CardContent, Typography, Button } from '@mui/material';

export default function ShopifyIntegrationPanel({ settings, setSettings, saveSettings, testConnection, loading }) {
    return (
        <Card sx={{ mb: 4 }}>
            <CardHeader title="Shopify Integration" />
            <CardContent>
                <Typography>Shopify configs here...</Typography>
                <Button>Test Connection</Button>
            </CardContent>
        </Card>
    );
}
