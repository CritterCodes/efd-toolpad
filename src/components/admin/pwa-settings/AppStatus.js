import React from 'react';
import {
    Card,
    CardContent,
    Chip,
    Grid,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Typography
} from '@mui/material';
import {
    Wifi as OnlineIcon,
    WifiOff as OfflineIcon,
    Storage as CacheIcon,
    Update as UpdateIcon
} from '@mui/icons-material';

export default function AppStatus({ appStatus }) {
    return (
        <Grid item xs={12} md={6}>
            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        App Status
                    </Typography>
                    
                    <List dense>
                        <ListItem>
                            <ListItemIcon>
                                {appStatus.isOnline ? 
                                    <OnlineIcon color="success" /> : 
                                    <OfflineIcon color="error" />
                                }
                            </ListItemIcon>
                            <ListItemText 
                                primary="Network Status"
                                secondary={appStatus.isOnline ? 'Online' : 'Offline'}
                            />
                            <Chip 
                                label={appStatus.isOnline ? 'Online' : 'Offline'} 
                                color={appStatus.isOnline ? 'success' : 'error'}
                                size="small"
                            />
                        </ListItem>
                        
                        <ListItem>
                            <ListItemIcon>
                                <UpdateIcon color={appStatus.serviceWorker ? 'success' : 'action'} />
                            </ListItemIcon>
                            <ListItemText 
                                primary="Service Worker"
                                secondary={appStatus.serviceWorker ? 'Active' : 'Not available'}
                            />
                        </ListItem>
                        
                        <ListItem>
                            <ListItemIcon>
                                <CacheIcon color="primary" />
                            </ListItemIcon>
                            <ListItemText 
                                primary="Offline Cache"
                                secondary="Enables offline functionality"
                            />
                        </ListItem>
                    </List>
                </CardContent>
            </Card>
        </Grid>
    );
}
