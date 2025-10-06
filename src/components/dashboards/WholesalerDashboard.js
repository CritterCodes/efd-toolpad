/**
 * Wholesaler-Specific Dashboard Content
 * Shows order history, wholesale catalog, and analytics for wholesale customers
 */

'use client';

import React, { useState, useEffect } from 'react';
import { 
    Card, 
    CardContent, 
    Typography, 
    Box, 
    Grid, 
    Button,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Avatar,
    List,
    ListItem,
    ListItemText,
    ListItemIcon
} from '@mui/material';
import { 
    ShoppingBag as OrderIcon,
    AttachMoney as SalesIcon,
    TrendingUp as TrendingUpIcon,
    Inventory as InventoryIcon,
    Star as StarIcon,
    LocalShipping as ShippingIcon,
    Receipt as ReceiptIcon,
    Schedule as PendingIcon
} from '@mui/icons-material';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function WholesalerDashboardContent() {
    const { data: session } = useSession();
    const router = useRouter();
    const [dashboardData, setDashboardData] = useState({
        stats: {
            totalOrders: 145,
            monthlySpend: 8950,
            averageOrderValue: 450,
            loyaltyPoints: 1250
        },
        recentOrders: [
            {
                id: 'ORD-2024-001',
                date: '2024-10-01',
                total: 450.00,
                status: 'Shipped',
                items: 3
            },
            {
                id: 'ORD-2024-002',
                date: '2024-10-03',
                total: 725.00,
                status: 'Processing',
                items: 5
            },
            {
                id: 'ORD-2024-003',
                date: '2024-10-05',
                total: 290.00,
                status: 'Pending',
                items: 2
            }
        ],
        featuredProducts: [
            {
                name: 'Sterling Silver Chains',
                category: 'Chains',
                price: '$45-85',
                stock: 'In Stock'
            },
            {
                name: 'Diamond Settings',
                category: 'Settings',
                price: '$120-350',
                stock: 'Limited'
            },
            {
                name: 'Gold Findings',
                category: 'Findings',
                price: '$25-95',
                stock: 'In Stock'
            }
        ],
        notifications: [
            'New seasonal catalog available',
            'Special bulk pricing on chains this month',
            'Your order ORD-2024-002 is being processed'
        ]
    });

    const getStatusColor = (status) => {
        switch (status) {
            case 'Shipped': return 'success';
            case 'Processing': return 'warning';
            case 'Pending': return 'default';
            default: return 'default';
        }
    };

    const handleViewOrders = () => {
        router.push('/dashboard/orders');
    };

    const handleViewCatalog = () => {
        router.push('/dashboard/wholesale');
    };

    return (
        <Box>
            {/* Welcome Section */}
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    Welcome back, {session?.user?.name}
                </Typography>
                <Typography variant="subtitle1" color="text.secondary">
                    Wholesale Dashboard - Manage your orders and explore our catalog
                </Typography>
            </Box>

            <Grid container spacing={3}>
                {/* Key Metrics */}
                <Grid item xs={12} md={6} lg={3}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                                    <OrderIcon />
                                </Avatar>
                                <Box>
                                    <Typography variant="h6">Total Orders</Typography>
                                    <Typography variant="h4" color="primary">
                                        {dashboardData.stats.totalOrders}
                                    </Typography>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={6} lg={3}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <Avatar sx={{ bgcolor: 'success.main', mr: 2 }}>
                                    <SalesIcon />
                                </Avatar>
                                <Box>
                                    <Typography variant="h6">Monthly Spend</Typography>
                                    <Typography variant="h4" color="success.main">
                                        ${dashboardData.stats.monthlySpend.toLocaleString()}
                                    </Typography>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={6} lg={3}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <Avatar sx={{ bgcolor: 'info.main', mr: 2 }}>
                                    <TrendingUpIcon />
                                </Avatar>
                                <Box>
                                    <Typography variant="h6">Avg Order Value</Typography>
                                    <Typography variant="h4" color="info.main">
                                        ${dashboardData.stats.averageOrderValue}
                                    </Typography>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={6} lg={3}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <Avatar sx={{ bgcolor: 'warning.main', mr: 2 }}>
                                    <StarIcon />
                                </Avatar>
                                <Box>
                                    <Typography variant="h6">Loyalty Points</Typography>
                                    <Typography variant="h4" color="warning.main">
                                        {dashboardData.stats.loyaltyPoints.toLocaleString()}
                                    </Typography>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Recent Orders */}
                <Grid item xs={12} md={8}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                                <Typography variant="h6" component="h2">
                                    Recent Orders
                                </Typography>
                                <Button 
                                    variant="outlined" 
                                    onClick={handleViewOrders}
                                    startIcon={<OrderIcon />}
                                >
                                    View All Orders
                                </Button>
                            </Box>
                            
                            <TableContainer>
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Order ID</TableCell>
                                            <TableCell>Date</TableCell>
                                            <TableCell>Items</TableCell>
                                            <TableCell>Total</TableCell>
                                            <TableCell>Status</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {dashboardData.recentOrders.map((order) => (
                                            <TableRow key={order.id}>
                                                <TableCell>
                                                    <Typography variant="subtitle2">
                                                        {order.id}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>{order.date}</TableCell>
                                                <TableCell>{order.items}</TableCell>
                                                <TableCell>
                                                    <Typography variant="subtitle2">
                                                        ${order.total.toFixed(2)}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip 
                                                        label={order.status} 
                                                        color={getStatusColor(order.status)}
                                                        size="small"
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Quick Actions & Notifications */}
                <Grid item xs={12} md={4}>
                    <Card sx={{ mb: 2 }}>
                        <CardContent>
                            <Typography variant="h6" component="h2" gutterBottom>
                                Quick Actions
                            </Typography>
                            
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                <Button 
                                    variant="contained" 
                                    fullWidth
                                    startIcon={<InventoryIcon />}
                                    onClick={handleViewCatalog}
                                >
                                    Browse Catalog
                                </Button>
                                <Button 
                                    variant="outlined" 
                                    fullWidth
                                    startIcon={<ReceiptIcon />}
                                >
                                    Reorder Previous
                                </Button>
                                <Button 
                                    variant="outlined" 
                                    fullWidth
                                    startIcon={<ShippingIcon />}
                                >
                                    Track Shipments
                                </Button>
                            </Box>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent>
                            <Typography variant="h6" component="h2" gutterBottom>
                                Notifications
                            </Typography>
                            <List dense>
                                {dashboardData.notifications.map((notification, index) => (
                                    <ListItem key={index}>
                                        <ListItemIcon>
                                            <PendingIcon color="primary" />
                                        </ListItemIcon>
                                        <ListItemText 
                                            primary={notification}
                                            primaryTypographyProps={{ variant: 'body2' }}
                                        />
                                    </ListItem>
                                ))}
                            </List>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Featured Products */}
                <Grid item xs={12}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" component="h2" gutterBottom>
                                Featured Products
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                                Popular items from our wholesale catalog
                            </Typography>
                            
                            <Grid container spacing={2}>
                                {dashboardData.featuredProducts.map((product, index) => (
                                    <Grid item xs={12} md={4} key={index}>
                                        <Card variant="outlined">
                                            <CardContent>
                                                <Typography variant="h6" gutterBottom>
                                                    {product.name}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                                    {product.category}
                                                </Typography>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                                                    <Typography variant="h6" color="primary">
                                                        {product.price}
                                                    </Typography>
                                                    <Chip 
                                                        label={product.stock}
                                                        color={product.stock === 'In Stock' ? 'success' : 'warning'}
                                                        size="small"
                                                    />
                                                </Box>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                ))}
                            </Grid>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
}