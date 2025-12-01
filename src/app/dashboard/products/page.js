'use client';

import React from 'react';
import { Box, Typography, Card, CardContent, Grid, Button } from '@mui/material';
import { useSession } from 'next-auth/react';
import DiamondIcon from '@mui/icons-material/Diamond';
import CircleIcon from '@mui/icons-material/Circle';
import DesignServicesIcon from '@mui/icons-material/DesignServices';
import { useRouter } from 'next/navigation';

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
            icon: <DiamondIcon sx={{ fontSize: 48, color: 'primary.main' }} />,
            route: '/dashboard/products/gemstones',
            color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        },
        {
            type: 'Jeweler',
            title: 'Jewelry',
            description: isAdmin ? 'All jewelry pieces from all artisans' : 'Your jewelry pieces and collections',
            icon: <CircleIcon sx={{ fontSize: 48, color: 'warning.main' }} />,
            route: '/dashboard/products/jewelry',
            color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
        },
        {
            type: 'CAD Designer',
            title: 'CAD Designs',
            description: isAdmin ? 'All CAD designs from all artisans' : 'Your digital jewelry models and prototypes',
            icon: <DesignServicesIcon sx={{ fontSize: 48, color: 'success.main' }} />,
            route: '/dashboard/products/cad-design',
            color: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
        }
    ];

    // For admins, show all product types. For artisans, filter by their capabilities
    const availableProducts = isAdmin 
        ? productTypes 
        : productTypes.filter(product => artisanTypes.includes(product.type));

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
                Products
            </Typography>
            <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 4 }}>
                Manage your personal inventory and creations
            </Typography>

            <Grid container spacing={3}>
                {availableProducts.map((product) => (
                    <Grid item xs={12} md={6} lg={4} key={product.type}>
                        <Card 
                            sx={{ 
                                height: '100%',
                                cursor: 'pointer',
                                transition: 'transform 0.2s, box-shadow 0.2s',
                                '&:hover': {
                                    transform: 'translateY(-4px)',
                                    boxShadow: 6
                                }
                            }}
                            onClick={() => router.push(product.route)}
                        >
                            <Box
                                sx={{
                                    height: 120,
                                    background: product.color,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                {product.icon}
                            </Box>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    {product.title}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {product.description}
                                </Typography>
                                <Button 
                                    variant="outlined" 
                                    fullWidth 
                                    sx={{ mt: 2 }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        router.push(product.route);
                                    }}
                                >
                                    View {product.title}
                                </Button>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {availableProducts.length === 0 && (
                <Box 
                    sx={{ 
                        textAlign: 'center', 
                        py: 8,
                        color: 'text.secondary'
                    }}
                >
                    <Typography variant="h6" gutterBottom>
                        No Product Categories Available
                    </Typography>
                    <Typography variant="body2">
                        Your artisan profile doesn&apos;t have any specialties assigned yet.
                        Contact support to update your artisan capabilities.
                    </Typography>
                </Box>
            )}
        </Box>
    );
}