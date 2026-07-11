'use client';

import React from 'react';
import { Box, Typography, Card, CardContent, Grid, Button } from '@mui/material';
import { useSession } from 'next-auth/react';
import DiamondIcon from '@mui/icons-material/Diamond';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import InboxIcon from '@mui/icons-material/Inbox';
import { useRouter } from 'next/navigation';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';

export default function ProductsPage() {
    const { data: session } = useSession();
    const router = useRouter();
    const artisanTypes = session?.user?.artisanTypes || [];
    const isAdmin = session?.user?.role === 'admin' || session?.user?.role === 'staff';

    const productTypes = [
        {
            type: 'Gem Cutter',
            title: 'Gemstones',
            description: isAdmin ? 'All gemstones from all artisans' : 'Your gemstone inventory and cutting work',
            icon: <DiamondIcon sx={{ fontSize: 28, color: '#64B5F6' }} />,
            accent: '#64B5F6',
            route: '/dashboard/products/gemstones',
        },
        {
            type: 'Jeweler',
            title: 'Jewelry',
            description: isAdmin ? 'All jewelry pieces from all artisans' : 'Your jewelry pieces and collections',
            icon: <AutoAwesomeIcon sx={{ fontSize: 28, color: REPAIRS_UI.accent }} />,
            accent: REPAIRS_UI.accent,
            route: '/dashboard/products/jewelry',
        },
    ];

    if (isAdmin) {
        productTypes.push({
            type: '__admin__',
            title: 'Awaiting Approval',
            description: 'Review products submitted by artisans for publishing',
            icon: <HourglassEmptyIcon sx={{ fontSize: 28, color: '#FFB74D' }} />,
            accent: '#FFB74D',
            route: '/dashboard/products/awaiting-approval',
        });
    }

    const availableProducts = isAdmin
        ? productTypes
        : productTypes.filter(p => p.type === '__admin__' || artisanTypes.includes(p.type));

    return (
        <Box sx={{ pb: 6 }}>
            <Box sx={{
                backgroundColor: { xs: 'transparent', sm: REPAIRS_UI.bgPanel },
                border: { xs: 'none', sm: `1px solid ${REPAIRS_UI.border}` },
                borderRadius: { xs: 0, sm: 3 },
                boxShadow: { xs: 'none', sm: REPAIRS_UI.shadow },
                p: { xs: 0.5, sm: 2.5, md: 3 },
                mb: 3,
            }}>
                <Typography sx={{
                    display: 'inline-flex', alignItems: 'center', gap: 1,
                    px: 1.25, py: 0.5, mb: 1.5,
                    fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em',
                    color: REPAIRS_UI.textPrimary,
                    backgroundColor: REPAIRS_UI.bgCard,
                    border: `1px solid ${REPAIRS_UI.border}`,
                    borderRadius: 2, textTransform: 'uppercase',
                }}>
                    <AutoAwesomeIcon sx={{ fontSize: 16, color: REPAIRS_UI.accent }} />
                    Product Catalog
                </Typography>
                <Typography sx={{ fontSize: { xs: 28, md: 36 }, fontWeight: 600, color: REPAIRS_UI.textHeader, mb: 1 }}>
                    Products
                </Typography>
                <Typography sx={{ color: REPAIRS_UI.textSecondary, lineHeight: 1.6 }}>
                    {isAdmin
                        ? 'Manage all products across artisans, or review items awaiting approval.'
                        : 'Manage your personal inventory and creations.'}
                </Typography>
            </Box>

            {availableProducts.length === 0 ? (
                <Box sx={{
                    p: 6, textAlign: 'center',
                    border: `1px dashed ${REPAIRS_UI.border}`,
                    borderRadius: 2,
                    backgroundColor: REPAIRS_UI.bgPanel,
                }}>
                    <InboxIcon sx={{ fontSize: 48, color: REPAIRS_UI.textMuted, mb: 1 }} />
                    <Typography sx={{ color: REPAIRS_UI.textSecondary, fontWeight: 600, mb: 0.5 }}>
                        No Product Categories Available
                    </Typography>
                    <Typography sx={{ color: REPAIRS_UI.textMuted, fontSize: '0.875rem' }}>
                        Your artisan profile doesn&apos;t have any specialties assigned yet.
                        Contact support to update your artisan capabilities.
                    </Typography>
                </Box>
            ) : (
                <Grid container spacing={2}>
                    {availableProducts.map((product) => (
                        <Grid item xs={12} md={4} key={product.type}>
                            <Card
                                onClick={() => router.push(product.route)}
                                sx={{
                                    height: '100%',
                                    cursor: 'pointer',
                                    backgroundColor: REPAIRS_UI.bgCard,
                                    backgroundImage: 'none',
                                    border: `1px solid ${REPAIRS_UI.border}`,
                                    borderRadius: 2,
                                    boxShadow: 'none',
                                    transition: 'border-color 0.15s',
                                    '&:hover': { borderColor: product.accent },
                                }}
                            >
                                <CardContent sx={{ p: 2.5 }}>
                                    <Box sx={{
                                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                        width: 52, height: 52, borderRadius: 2,
                                        backgroundColor: REPAIRS_UI.bgTertiary,
                                        border: `1px solid ${REPAIRS_UI.border}`,
                                        mb: 2,
                                    }}>
                                        {product.icon}
                                    </Box>
                                    <Typography sx={{ fontSize: 18, fontWeight: 600, color: REPAIRS_UI.textHeader, mb: 0.5 }}>
                                        {product.title}
                                    </Typography>
                                    <Typography sx={{ color: REPAIRS_UI.textSecondary, fontSize: '0.875rem', mb: 2.5, lineHeight: 1.5 }}>
                                        {product.description}
                                    </Typography>
                                    <Button
                                        variant="contained"
                                        fullWidth
                                        onClick={(e) => { e.stopPropagation(); router.push(product.route); }}
                                        sx={{
                                            backgroundColor: product.accent,
                                            color: '#1A1A1A',
                                            fontWeight: 600,
                                            '&:hover': { backgroundColor: product.accent, opacity: 0.85 },
                                        }}
                                    >
                                        View {product.title}
                                    </Button>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}
        </Box>
    );
}
