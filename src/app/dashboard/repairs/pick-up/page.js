"use client";
import React from "react";
import {
    Box,
    Typography,
    Grid,
    Alert,
    Chip,
} from "@mui/material";
import {
    Payment as PaymentIcon,
    LocalShipping as PickupIcon,
    Construction as ComingSoonIcon,
    NotificationsActive as NotifyIcon,
} from "@mui/icons-material";
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';

const featureItems = [
    {
        icon: PaymentIcon,
        title: 'Order Creation',
        phase: 'Phase 1',
        description: [
            'Bundle completed repairs by customer',
            'Automatically create orders with repair details',
            'Include all repair costs, taxes, and service fees',
            'Generate customer-friendly order summaries',
        ]
    },
    {
        icon: PickupIcon,
        title: 'Bulk Pickup Processing',
        phase: 'Phase 1',
        description: [
            'Mark multiple repairs as picked up simultaneously',
            'Update repair statuses to COMPLETED',
            'Generate pickup receipts and confirmations',
            'Track pickup dates and customer signatures',
        ]
    },
    {
        icon: PaymentIcon,
        title: 'Order Splitting',
        phase: 'Phase 1',
        description: [
            'Split large orders into multiple pickups',
            'Partial payment processing capabilities',
            'Manage deposits and remaining balances',
            'Customer communication for split orders',
        ]
    },
    {
        icon: NotifyIcon,
        title: 'Customer Notifications',
        phase: 'Future',
        description: [
            'Automated pickup ready notifications',
            'SMS and email integration',
            'Payment reminders and confirmations',
            'Pickup appointment scheduling',
        ]
    },
];

const PaymentPickupPage = () => {
    return (
        <Box sx={{ pb: 10, position: 'relative' }}>
            <Box
                sx={{
                    backgroundColor: { xs: 'transparent', sm: REPAIRS_UI.bgPanel },
                    border: { xs: 'none', sm: `1px solid ${REPAIRS_UI.border}` },
                    borderRadius: { xs: 0, sm: 3 },
                    boxShadow: { xs: 'none', sm: REPAIRS_UI.shadow },
                    p: { xs: 0.5, sm: 2.5, md: 3 },
                    mb: 3
                }}
            >
                <Box sx={{ maxWidth: 920 }}>
                    <Typography
                        sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 1,
                            px: 1.25,
                            py: 0.5,
                            mb: 1.5,
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            letterSpacing: '0.08em',
                            color: REPAIRS_UI.textPrimary,
                            backgroundColor: REPAIRS_UI.bgCard,
                            border: `1px solid ${REPAIRS_UI.border}`,
                            borderRadius: 2,
                            textTransform: 'uppercase'
                        }}
                    >
                        <PaymentIcon sx={{ fontSize: 16, color: REPAIRS_UI.accent }} />
                        Payment &amp; pickup
                    </Typography>

                    <Typography sx={{ fontSize: { xs: 28, md: 36 }, fontWeight: 600, color: REPAIRS_UI.textHeader, mb: 1 }}>
                        Payment &amp; Pickup System
                    </Typography>
                    <Typography sx={{ color: REPAIRS_UI.textSecondary, lineHeight: 1.6, mb: 2 }}>
                        Order creation and payment processing for completed repairs.
                    </Typography>
                </Box>

                <Alert
                    severity="info"
                    sx={{
                        backgroundColor: REPAIRS_UI.bgCard,
                        color: REPAIRS_UI.textPrimary,
                        border: `1px solid ${REPAIRS_UI.border}`,
                        '& .MuiAlert-icon': { color: REPAIRS_UI.accent }
                    }}
                >
                    This page is currently under development and will be available in Phase 1 of our roadmap.
                    Use the existing pickup status functionality and manual order creation in the meantime.
                </Alert>
            </Box>

            <Typography variant="overline" sx={{ color: REPAIRS_UI.textSecondary, fontWeight: 700, display: 'block', mb: 2, letterSpacing: '0.08em' }}>
                Planned Features
            </Typography>

            <Grid container spacing={2}>
                {featureItems.map(({ icon: Icon, title, phase, description }) => (
                    <Grid item xs={12} sm={6} key={title}>
                        <Box
                            sx={{
                                backgroundColor: REPAIRS_UI.bgPanel,
                                border: `1px solid ${REPAIRS_UI.border}`,
                                borderRadius: 3,
                                boxShadow: REPAIRS_UI.shadow,
                                p: 2.5
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                                <Box
                                    sx={{
                                        width: 38,
                                        height: 38,
                                        borderRadius: 2,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: `1px solid ${REPAIRS_UI.border}`,
                                        backgroundColor: REPAIRS_UI.bgCard
                                    }}
                                >
                                    <Icon sx={{ color: REPAIRS_UI.accent, fontSize: 18 }} />
                                </Box>
                                <Typography sx={{ fontWeight: 600, color: REPAIRS_UI.textHeader, flex: 1 }}>
                                    {title}
                                </Typography>
                                <Chip
                                    label={phase}
                                    size="small"
                                    sx={{
                                        backgroundColor: REPAIRS_UI.bgCard,
                                        color: phase === 'Future' ? REPAIRS_UI.textMuted : REPAIRS_UI.accent,
                                        border: `1px solid ${REPAIRS_UI.border}`,
                                        fontSize: '0.7rem',
                                        fontWeight: 600
                                    }}
                                />
                            </Box>
                            <Box component="ul" sx={{ pl: 2, m: 0 }}>
                                {description.map((line) => (
                                    <Typography
                                        key={line}
                                        component="li"
                                        variant="body2"
                                        sx={{ color: REPAIRS_UI.textSecondary, mb: 0.5 }}
                                    >
                                        {line}
                                    </Typography>
                                ))}
                            </Box>
                        </Box>
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
};

export default PaymentPickupPage;
