"use client";
import React from 'react';
import { Grid, Card, CardContent, Avatar, Typography, Button, Divider } from '@mui/material';

/**
 * ✅ Client Card Grid Component
 * - Displays a grid of client cards.
 * - Each card shows the client's info and links to their profile page.
 */
const ClientCardGrid = ({ clients, onCardClick }) => {
    return (
        <Grid container spacing={3}>
            {clients.map((client) => (
                <Grid item xs={12} sm={6} md={4} key={client.userID}>
                    <Card
                        variant="outlined"
                        sx={{
                            borderRadius: '12px',
                            boxShadow: 1,
                            transition: 'transform 0.2s ease-in-out',
                            '&:hover': { transform: 'scale(1.03)' },
                            cursor: 'pointer',
                        }}
                        onClick={() => onCardClick(client.userID)}
                    >
                        <CardContent sx={{ textAlign: 'center' }}>
                            <Avatar
                                src={client.image || '/default-avatar.png'}
                                sx={{ width: 80, height: 80, margin: 'auto' }}
                            />
                            <Typography variant="h6" sx={{ mt: 2 }}>
                                {client.firstName} {client.lastName}
                            </Typography>
                            <Typography color="text.secondary">{client.email}</Typography>
                            <Typography color="text.secondary">{client.phone}</Typography>
                        </CardContent>
                        <Divider />
                        <Button
                            fullWidth
                            variant="contained"
                            color="primary"
                            sx={{ borderRadius: '0 0 12px 12px' }}
                        >
                            View Profile
                        </Button>
                    </Card>
                </Grid>
            ))}
        </Grid>
    );
};

export default ClientCardGrid;
