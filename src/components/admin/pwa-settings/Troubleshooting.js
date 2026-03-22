import React from 'react';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Grid,
    Typography
} from '@mui/material';

export default function Troubleshooting({ clearAppData }) {
    return (
        <Grid item xs={12}>
            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom color="warning.main">
                        Troubleshooting
                    </Typography>
                    
                    <Alert severity="info" sx={{ mb: 2 }}>
                        <strong>For OrangePi Installation:</strong>
                        <br />
                        1. Use Chrome/Chromium browser
                        <br />
                        2. Visit this page over HTTPS (production server)
                        <br />
                        3. Look for install icon in address bar
                        <br />
                        4. Or use the &quot;Install App Now&quot; button above
                    </Alert>

                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        <Button
                            variant="outlined"
                            color="warning"
                            onClick={clearAppData}
                        >
                            Clear App Data
                        </Button>
                        
                        <Button
                            variant="outlined"
                            onClick={() => window.location.reload()}
                        >
                            Refresh App
                        </Button>
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                        Clear app data if experiencing issues. This will remove cached files and reset the app.
                    </Typography>
                </CardContent>
            </Card>
        </Grid>
    );
}
