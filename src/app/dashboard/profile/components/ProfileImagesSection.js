import { Card, CardContent, Typography, Grid, Box, Avatar, Button } from '@mui/material';
import { Person as PersonIcon, PhotoCamera as PhotoCameraIcon } from '@mui/icons-material';

export default function ProfileImagesSection({ profileImagePreview, coverImagePreview, handleImageUpload }) {
    return (
        <Card>
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                <Typography variant="h6" gutterBottom>
                    Profile Images
                </Typography>
                <Grid container spacing={{ xs: 2, sm: 3 }}>
                    <Grid item xs={12} md={6}>
                        <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="subtitle2" gutterBottom>
                                Profile Image
                            </Typography>
                            <Avatar
                                src={profileImagePreview}
                                sx={{ width: { xs: 80, sm: 120 }, height: { xs: 80, sm: 120 }, mx: 'auto', mb: 2 }}
                            >
                                <PersonIcon sx={{ fontSize: { xs: 40, sm: 60 } }} />
                            </Avatar>
                            <input
                                accept="image/*"
                                style={{ display: 'none' }}
                                id="profile-image-upload"
                                type="file"
                                onChange={(e) => handleImageUpload(e, 'profile')}
                            />
                            <label htmlFor="profile-image-upload">
                                <Button variant="outlined" component="span" startIcon={<PhotoCameraIcon />} size="small" fullWidth={{ xs: true, sm: false }}>
                                    Upload Profile Image
                                </Button>
                            </label>
                        </Box>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="subtitle2" gutterBottom>
                                Cover Image
                            </Typography>
                            <Box
                                sx={{
                                    width: '100%',
                                    height: { xs: 80, sm: 120 },
                                    border: '2px dashed #ccc',
                                    borderRadius: 2,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundImage: coverImagePreview ? `url(${coverImagePreview})` : 'none',
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                    mb: 2
                                }}
                            >
                                {!coverImagePreview && (
                                    <Typography variant="body2" color="text.secondary">
                                        Cover Image Preview
                                    </Typography>
                                )}
                            </Box>
                            <input
                                accept="image/*"
                                style={{ display: 'none' }}
                                id="cover-image-upload"
                                type="file"
                                onChange={(e) => handleImageUpload(e, 'cover')}
                            />
                            <label htmlFor="cover-image-upload">
                                <Button variant="outlined" component="span" startIcon={<PhotoCameraIcon />} size="small" fullWidth={{ xs: true, sm: false }}>
                                    Upload Cover Image
                                </Button>
                            </label>
                        </Box>
                    </Grid>
                </Grid>
            </CardContent>
        </Card>
    );
}