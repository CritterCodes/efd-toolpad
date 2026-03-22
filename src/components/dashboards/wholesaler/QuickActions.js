import React from 'react';
import { Card, CardContent, Typography, Box, Button, Divider, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import { Add as AddIcon, Assignment as AssignmentIcon, Build as BuildIcon } from '@mui/icons-material';
import { useRouter } from 'next/navigation';

export default function QuickActions() {
    const router = useRouter();

    return (
        <Card sx={{ height: '100%' }}>
            <CardContent>
                <Typography variant="h6" gutterBottom fontWeight="bold">
                    Quick Actions
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Button 
                        variant="contained" 
                        color="primary" 
                        startIcon={<AddIcon />}
                        onClick={() => router.push('/dashboard/repairs/new')}
                        fullWidth
                    >
                        Create New Repair
                    </Button>
                    
                    <Button 
                        variant="outlined" 
                        color="primary" 
                        startIcon={<AssignmentIcon />}
                        onClick={() => router.push('/dashboard/repairs')}
                        fullWidth
                    >
                        View All Repairs
                    </Button>
                </Box>
                
                <Typography variant="subtitle2" color="textSecondary" sx={{ mt: 3, mb: 1 }}>
                    Helpful Links
                </Typography>
                
                <List dense disablePadding>
                    <ListItem button onClick={() => router.push('/dashboard/repairs/pricing')} sx={{ px: 0 }}>
                        <ListItemIcon sx={{ minWidth: 36 }}>
                            <BuildIcon fontSize="small" color="action" />
                        </ListItemIcon>
                        <ListItemText 
                            primary="View Pricing Guide" 
                            primaryTypographyProps={{ variant: 'body2' }} 
                        />
                    </ListItem>
                </List>
            </CardContent>
        </Card>
    );
}
