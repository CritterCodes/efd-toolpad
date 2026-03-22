import { Card, CardContent, Typography, Grid, TextField, InputAdornment } from '@mui/material';
import { Language as WebsiteIcon, Instagram as InstagramIcon, Facebook as FacebookIcon } from '@mui/icons-material';

export default function OnlinePresenceSection({ profileData, handleInputChange }) {
    return (
        <Card>
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                <Typography variant="h6" gutterBottom>
                    Online Presence
                </Typography>
                <Grid container spacing={{ xs: 2, sm: 3 }}>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Portfolio Website"
                            value={profileData.portfolioWebsite}
                            onChange={(e) => handleInputChange('portfolioWebsite', e.target.value)}
                            placeholder="https://yourwebsite.com"
                            size="small"
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <WebsiteIcon />
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Instagram Handle"
                            value={profileData.instagramHandle}
                            onChange={(e) => handleInputChange('instagramHandle', e.target.value)}
                            placeholder="@yourusername"
                            size="small"
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <InstagramIcon />
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Facebook Page"
                            value={profileData.facebookPage}
                            onChange={(e) => handleInputChange('facebookPage', e.target.value)}
                            placeholder="facebook.com/yourpage"
                            size="small"
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <FacebookIcon />
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="TikTok Handle"
                            value={profileData.tiktokHandle}
                            onChange={(e) => handleInputChange('tiktokHandle', e.target.value)}
                            placeholder="@yourusername"
                            size="small"
                        />
                    </Grid>
                </Grid>
            </CardContent>
        </Card>
    );
}