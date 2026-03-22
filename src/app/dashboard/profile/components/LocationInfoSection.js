import { Card, CardContent, Typography, Grid, TextField, Autocomplete } from '@mui/material';
import { LocationOn as LocationIcon } from '@mui/icons-material';

const usStates = [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado',
    'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho',
    'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana',
    'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota',
    'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada',
    'New Hampshire', 'New Jersey', 'New Mexico', 'New York',
    'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon',
    'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
    'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
    'West Virginia', 'Wisconsin', 'Wyoming'
];

export default function LocationInfoSection({ profileData, handleInputChange }) {
    return (
        <Card>
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                <Typography variant="h6" gutterBottom>
                    <LocationIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Business Location
                </Typography>
                <Grid container spacing={{ xs: 2, sm: 3 }}>
                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            label="Business Address"
                            value={profileData.businessAddress}
                            onChange={(e) => handleInputChange('businessAddress', e.target.value)}
                            size="small"
                        />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <TextField
                            fullWidth
                            label="City"
                            value={profileData.businessCity}
                            onChange={(e) => handleInputChange('businessCity', e.target.value)}
                            size="small"
                        />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <Autocomplete
                            options={usStates}
                            value={profileData.businessState}
                            onChange={(event, newValue) => handleInputChange('businessState', newValue || '')}
                            renderInput={(params) => (
                                <TextField {...params} label="State" size="small" />
                            )}
                            freeSolo
                            size="small"
                        />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <TextField
                            fullWidth
                            label="ZIP Code"
                            value={profileData.businessZip}
                            onChange={(e) => handleInputChange('businessZip', e.target.value)}
                            size="small"
                        />
                    </Grid>
                </Grid>
            </CardContent>
        </Card>
    );
}