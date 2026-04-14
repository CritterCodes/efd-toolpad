"use client";
import React from "react";
import {
    Box,
    Typography,
    Card,
    CardContent,
    Alert,
    Breadcrumbs,
    Link,
    Chip,
    Stack
} from "@mui/material";
import {
    Payment as PaymentIcon,
    LocalShipping as PickupIcon,
    Construction as ComingSoonIcon
} from "@mui/icons-material";
import { useRouter } from 'next/navigation';

const PaymentPickupPage = () => {
    const router = useRouter();

    return (
        <Box sx={{ padding: '20px' }}>
            {/* Breadcrumbs */}
            <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
                <Link 
                    underline="hover" 
                    color="inherit" 
                    onClick={() => router.push('/dashboard')} 
                    sx={{ cursor: 'pointer' }}
                >
                    Dashboard
                </Link>
                <Link 
                    underline="hover" 
                    color="inherit" 
                    onClick={() => router.push('/dashboard/repairs')} 
                    sx={{ cursor: 'pointer' }}
                >
                    Repairs
                </Link>
                <Typography color="text.primary">Payment & Pickup</Typography>
            </Breadcrumbs>

            <Typography variant="h4" sx={{ mb: 1, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                <PaymentIcon />
                Payment & Pickup System
            </Typography>

            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                Order creation and payment processing for completed repairs
            </Typography>

            {/* Coming Soon Alert */}
            <Alert severity="info" sx={{ mb: 4 }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                    🚧 Feature Coming Soon!
                </Typography>
                <Typography>
                    This page is currently under development and will be available in Phase 1 of our roadmap.
                </Typography>
            </Alert>

            {/* Feature Preview Cards */}
            <Typography variant="h5" sx={{ mb: 3, fontWeight: 'bold' }}>
                Planned Features:
            </Typography>

            <Stack spacing={3}>
                <Card>
                    <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                            <PaymentIcon color="primary" />
                            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                                Order Creation
                            </Typography>
                            <Chip label="Phase 1" color="primary" size="small" />
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                            • Bundle completed repairs by customer<br/>
                            • Automatically create orders with repair details<br/>
                            • Include all repair costs, taxes, and service fees<br/>
                            • Generate customer-friendly order summaries
                        </Typography>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                            <PickupIcon color="success" />
                            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                                Bulk Pickup Processing
                            </Typography>
                            <Chip label="Phase 1" color="primary" size="small" />
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                            • Mark multiple repairs as picked up simultaneously<br/>
                            • Update repair statuses to &quot;COMPLETED&quot;<br/>
                            • Generate pickup receipts and confirmations<br/>
                            • Track pickup dates and customer signatures
                        </Typography>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                            <PaymentIcon color="warning" />
                            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                                Order Splitting
                            </Typography>
                            <Chip label="Phase 1" color="primary" size="small" />
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                            • Split large orders into multiple pickups<br/>
                            • Partial payment processing capabilities<br/>
                            • Manage deposits and remaining balances<br/>
                            • Customer communication for split orders
                        </Typography>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                            <ComingSoonIcon color="info" />
                            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                                Customer Notifications
                            </Typography>
                            <Chip label="Future" color="secondary" size="small" />
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                            • Automated pickup ready notifications<br/>
                            • SMS and email integration<br/>
                            • Payment reminders and confirmations<br/>
                            • Pickup appointment scheduling
                        </Typography>
                    </CardContent>
                </Card>
            </Stack>

            <Alert severity="warning" sx={{ mt: 4 }}>
                <Typography variant="body2">
                    <strong>Current Workaround:</strong> Use the existing pickup status functionality and manual order creation until this feature is deployed.
                </Typography>
            </Alert>
        </Box>
    );
};

export default PaymentPickupPage;
