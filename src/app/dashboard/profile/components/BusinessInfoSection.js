import { Card, CardContent, Typography, Grid, TextField, Autocomplete, Chip, InputAdornment } from '@mui/material';
import { Business as BusinessIcon } from '@mui/icons-material';
import Constants from '@/lib/constants';

export default function BusinessInfoSection({ profileData, handleInputChange }) {
    const artisanTypes = Constants.ARTISAN_TYPES || [];

    return (
        <Card>
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                <Typography variant="h6" gutterBottom startIcon={<BusinessIcon />}>
                    Business Information
                </Typography>
                <Grid container spacing={{ xs: 2, sm: 3 }}>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Business Name"
                            value={profileData.businessName}
                            onChange={(e) => handleInputChange('businessName', e.target.value)}
                            required
                            size="small"
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Autocomplete
                            multiple
                            options={artisanTypes}
                            value={profileData.artisanType || []}
                            onChange={(event, newValue) => handleInputChange('artisanType', newValue)}
                            renderTags={(value, getTagProps) =>
                                value.map((option, index) => (
                                    <Chip key={index} variant="outlined" label={option} size="small" {...getTagProps({ index })} />
                                ))
                            }
                            renderInput={(params) => (
                                <TextField {...params} label="Artisan Type" placeholder="Select your artisan types..." size="small" />
                            )}
                            size="small"
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            multiline
                            rows={{ xs: 3, sm: 4 }}
                            label="About Your Business"
                            value={profileData.about}
                            onChange={(e) => handleInputChange('about', e.target.value)}
                            placeholder="Tell potential customers about your business, style, and what makes you unique..."
                            size="small"
                        />
                    </Grid>
                    <Grid item xs={12} md={8}>
                        <TextField
                            fullWidth
                            multiline
                            rows={{ xs: 2, sm: 3 }}
                            label="Experience & Background"
                            value={profileData.experience}
                            onChange={(e) => handleInputChange('experience', e.target.value)}
                            placeholder="Describe your training, experience, and background in jewelry making..."
                            size="small"
                        />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <TextField
                            fullWidth
                            type="number"
                            label="Years of Experience"
                            value={profileData.yearsExperience}
                            onChange={(e) => handleInputChange('yearsExperience', parseInt(e.target.value) || 0)}
                            InputProps={{ inputProps: { min: 0, max: 100 } }}
                            size="small"
                        />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <TextField
                            fullWidth
                            type="number"
                            label="Custom Design Fee"
                            value={profileData.customDesignFee ?? ''}
                            onChange={(e) => handleInputChange('customDesignFee', parseFloat(e.target.value) || 0)}
                            helperText="Your fee for a custom design; the shop charges this × its markup."
                            InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment>, inputProps: { min: 0, step: 5 } }}
                            size="small"
                        />
                    </Grid>
                </Grid>
            </CardContent>
        </Card>
    );
}