'use client';

import React from 'react';
import { Box, Typography, Card, CardContent, Grid, Button } from '@mui/material';
import { useSession } from 'next-auth/react';
import DesignServicesIcon from '@mui/icons-material/DesignServices';
import ReceiptIcon from '@mui/icons-material/Receipt';
import { useRouter } from 'next/navigation';

export default function RequestsPage() {
    const { data: session } = useSession();
    const router = useRouter();
    const isAdmin = session?.user?.role === 'admin' || session?.user?.role === 'staff';
    const isCADDesigner = session?.user?.artisanTypes?.includes('CAD Designer');

    const requestTypes = [
        {
            type: 'CAD Designer',
            title: 'CAD Requests',
            description: isAdmin ? 'All CAD requests from all customers' : 'CAD design requests assigned to you',
            icon: <DesignServicesIcon sx={{ fontSize: 48, color: 'primary.main' }} />,
            route: '/dashboard/requests/cad-requests',
            color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        },
        {
            type: 'Universal',
            title: 'Custom Tickets',
            description: isAdmin ? 'All custom work tickets' : 'Your custom work tickets',
            icon: <ReceiptIcon sx={{ fontSize: 48, color: 'warning.main' }} />,
            route: '/dashboard/requests/custom-tickets',
            color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
        }
    ];

    // For admins, show all request types
    // For CAD Designers, show CAD requests and custom tickets
    // For other artisans, show custom tickets
    const availableRequests = isAdmin 
        ? requestTypes 
        : requestTypes.filter(req => 
            req.type === 'Universal' || 
            (req.type === 'CAD Designer' && isCADDesigner)
        );

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
                Requests & Tickets
            </Typography>
            <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 4 }}>
                {isAdmin ? 'View and manage all requests from all artisans' : 'View and manage your requests'}
            </Typography>

            <Grid container spacing={3}>
                {availableRequests.map((request) => (
                    <Grid item xs={12} sm={6} md={4} key={request.title}>
                        <Card 
                            sx={{ 
                                height: '100%',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                background: request.color,
                                '&:hover': {
                                    transform: 'translateY(-8px)',
                                    boxShadow: 6
                                }
                            }}
                            onClick={() => router.push(request.route)}
                        >
                            <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%', color: 'white' }}>
                                <Box sx={{ mb: 2 }}>
                                    {request.icon}
                                </Box>
                                <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                                    {request.title}
                                </Typography>
                                <Typography variant="body2" sx={{ mb: 3, opacity: 0.9 }}>
                                    {request.description}
                                </Typography>
                                <Box sx={{ mt: 'auto' }}>
                                    <Button
                                        variant="contained"
                                        sx={{
                                            backgroundColor: 'rgba(255, 255, 255, 0.3)',
                                            color: 'white',
                                            '&:hover': {
                                                backgroundColor: 'rgba(255, 255, 255, 0.5)'
                                            }
                                        }}
                                    >
                                        View Requests
                                    </Button>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
}
