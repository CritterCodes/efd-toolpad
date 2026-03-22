import React from 'react';
import {
    Alert,
    Card,
    CardContent,
    Grid,
    List,
    ListItem,
    ListItemText,
    Typography
} from '@mui/material';

export default function DebugInformation({ deferredPrompt, installStatus }) {
    return (
        <Grid item xs={12}>
            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Debug Information
                    </Typography>
                    
                    <Alert severity={deferredPrompt ? "success" : "warning"} sx={{ mb: 2 }}>
                        <strong>Install Prompt Status:</strong> {deferredPrompt ? 'Available' : 'Not Available'}
                        <br />
                        {!deferredPrompt && (
                            <>
                                In development mode, the browser may not show the automatic install prompt.
                                <br />
                                <strong>Manual Installation:</strong> Look for the install icon (⊕) in your browser&apos;s address bar.
                            </>
                        )}
                    </Alert>

                    <List dense>
                        <ListItem>
                            <ListItemText 
                                primary="Service Worker Support"
                                secondary={`${'serviceWorker' in navigator ? 'Supported' : 'Not Supported'}`}
                            />
                        </ListItem>
                        <ListItem>
                            <ListItemText 
                                primary="Display Mode"
                                secondary={installStatus.isStandalone ? 'Standalone (Installed)' : 'Browser Mode'}
                            />
                        </ListItem>
                        <ListItem>
                            <ListItemText 
                                primary="User Agent"
                                secondary={typeof window !== 'undefined' ? navigator.userAgent.slice(0, 100) + '...' : 'Unknown'}
                            />
                        </ListItem>
                        <ListItem>
                            <ListItemText 
                                primary="Current URL"
                                secondary={typeof window !== 'undefined' ? window.location.origin : 'Unknown'}
                            />
                        </ListItem>
                    </List>
                </CardContent>
            </Card>
        </Grid>
    );
}
