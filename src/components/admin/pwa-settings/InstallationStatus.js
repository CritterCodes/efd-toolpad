import React from 'react';
import {
    Alert,
    Box,
    Button,
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
    GetApp as InstallIcon,
    CheckCircle as InstalledIcon,
    PhoneIphone as MobileIcon,
    Computer as DesktopIcon,
    Security as SecurityIcon
} from '@mui/icons-material';

export default function InstallationStatus({ installStatus, deferredPrompt, handleInstall }) {
    return (
        <Grid item xs={12} md={6}>
            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Installation Status
                    </Typography>
                    
                    <List dense>
                        <ListItem>
                            <ListItemIcon>
                                {installStatus.isInstalled ? 
                                    <InstalledIcon color="success" /> : 
                                    <InstallIcon color="action" />
                                }
                            </ListItemIcon>
                            <ListItemText 
                                primary="App Installation"
                                secondary={installStatus.isInstalled ? 'Installed' : 'Not installed'}
                            />
                            <Chip 
                                label={installStatus.isInstalled ? 'Installed' : 'Available'} 
                                color={installStatus.isInstalled ? 'success' : 'default'}
                                size="small"
                            />
                        </ListItem>
                        
                        <ListItem>
                            <ListItemIcon>
                                {installStatus.platform === 'mobile' ? 
                                    <MobileIcon color="primary" /> : 
                                    <DesktopIcon color="primary" />
                                }
                            </ListItemIcon>
                            <ListItemText 
                                primary="Platform"
                                secondary={`Running on ${installStatus.platform}`}
                            />
                        </ListItem>
                        
                        <ListItem>
                            <ListItemIcon>
                                <SecurityIcon color={installStatus.isStandalone ? 'success' : 'action'} />
                            </ListItemIcon>
                            <ListItemText 
                                primary="Standalone Mode"
                                secondary={installStatus.isStandalone ? 'Running as app' : 'Running in browser'}
                            />
                        </ListItem>
                    </List>

                    {installStatus.isInstallable && !installStatus.isInstalled && (
                        <Box sx={{ mt: 2 }}>
                            <Button
                                variant="contained"
                                startIcon={<InstallIcon />}
                                onClick={handleInstall}
                                fullWidth
                            >
                                {deferredPrompt ? 'Install App Now' : 'Manual Install Instructions'}
                            </Button>
                            {!deferredPrompt && (
                                <Typography variant="caption" display="block" sx={{ mt: 1, textAlign: 'center' }}>
                                    Auto-install prompt not available in development mode
                                </Typography>
                            )}
                        </Box>
                    )}
                    
                    {!installStatus.isInstallable && !installStatus.isInstalled && (
                        <Box sx={{ mt: 2 }}>
                            <Alert severity="info">
                                PWA installation not available. Make sure you&apos;re using HTTPS or localhost with a service worker.
                            </Alert>
                        </Box>
                    )}
                </CardContent>
            </Card>
        </Grid>
    );
}
