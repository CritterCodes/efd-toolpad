import React from 'react';
import {
    Card,
    CardContent,
    Divider,
    FormControlLabel,
    Grid,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Switch,
    Typography
} from '@mui/material';
import {
    GetApp as InstallIcon,
    WifiOff as OfflineIcon,
    Storage as CacheIcon,
    Security as SecurityIcon
} from '@mui/icons-material';

export default function PWAConfiguration({ installPromptEnabled, handleToggleInstallPrompt }) {
    return (
        <Grid item xs={12}>
            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        PWA Configuration
                    </Typography>
                    
                    <FormControlLabel
                        control={
                            <Switch
                                checked={installPromptEnabled}
                                onChange={handleToggleInstallPrompt}
                                color="primary"
                            />
                        }
                        label="Show install prompt to users"
                    />
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
                        When enabled, users will see a prompt to install the app after a few seconds.
                    </Typography>

                    <Divider sx={{ my: 2 }} />

                    <Typography variant="subtitle2" gutterBottom>
                        App Features
                    </Typography>
                    <List dense>
                        <ListItem>
                            <ListItemIcon><InstallIcon /></ListItemIcon>
                            <ListItemText 
                                primary="Installable"
                                secondary="Can be installed on desktop and mobile devices"
                            />
                        </ListItem>
                        <ListItem>
                            <ListItemIcon><OfflineIcon /></ListItemIcon>
                            <ListItemText 
                                primary="Offline Support"
                                secondary="Works without internet connection for basic features"
                            />
                        </ListItem>
                        <ListItem>
                            <ListItemIcon><CacheIcon /></ListItemIcon>
                            <ListItemText 
                                primary="Smart Caching"
                                secondary="Automatically caches resources for faster loading"
                            />
                        </ListItem>
                        <ListItem>
                            <ListItemIcon><SecurityIcon /></ListItemIcon>
                            <ListItemText 
                                primary="Secure HTTPS"
                                secondary="Runs over secure connection for data protection"
                            />
                        </ListItem>
                    </List>
                </CardContent>
            </Card>
        </Grid>
    );
}
