import React, { useState } from 'react';
import { FaceliftRoot, Field, FieldList } from '@/components/facelift';
import { 
    Box, 
    Card, 
    CardContent, 
    Typography, 
    Avatar,
    Button,
    TextField,
    Alert
} from '@mui/material';
import { PhotoCamera as PhotoCameraIcon, Person as PersonIcon } from '@mui/icons-material';

const ArtisanImage = ({ artisan, onImageChange }) => {
    const [imageUrl, setImageUrl] = useState(artisan.image || '');
    const [imageError, setImageError] = useState(false);

    const handleImageUrlChange = (event) => {
        const url = event.target.value;
        setImageUrl(url);
        setImageError(false);
        onImageChange(url);
    };

    const handleImageError = () => {
        setImageError(true);
    };

    const getInitials = () => {
        const firstName = artisan.firstName || '';
        const lastName = artisan.lastName || '';
        return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    };

    return (
        <Card>
            <CardContent>
                <Typography variant="h6" gutterBottom>
                    Profile Image
                </Typography>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    {/* Avatar Display */}
                    <Avatar
                        src={imageUrl && !imageError ? imageUrl : undefined}
                        sx={{ 
                            width: 120, 
                            height: 120,
                            bgcolor: 'primary.main',
                            fontSize: '2rem'
                        }}
                        onError={handleImageError}
                    >
                        {imageUrl && !imageError ? null : (
                            getInitials() || <PersonIcon sx={{ fontSize: '3rem' }} />
                        )}
                    </Avatar>

                    {/* Image URL Input */}
                    <TextField
                        fullWidth
                        label="Image URL"
                        value={imageUrl}
                        onChange={handleImageUrlChange}
                        variant="outlined"
                        size="small"
                        helperText="Enter a URL for the profile image"
                        placeholder="https://example.com/image.jpg"
                    />

                    {imageError && (
                        <Alert severity="warning" sx={{ width: '100%' }}>
                            Failed to load image from URL. Please check the URL and try again.
                        </Alert>
                    )}

                    {/* Upload Button (Future Enhancement) */}
                    <Button
                        variant="outlined"
                        startIcon={<PhotoCameraIcon />}
                        disabled
                        sx={{ width: '100%' }}
                    >
                        Upload Image (Coming Soon)
                    </Button>

                    {/* Business Info */}
                    <Box sx={{ width: '100%', mt: 2 }}>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            Business Information
                        </Typography>
                        <FaceliftRoot>
                            {/* 160, not the default 120: this card is ~250px inside, and an email in a
                                121px column breaks mid-word. One column reads; two do not. */}
                            <FieldList min={160}>
                                <Field label="Business" value={artisan.business} />
                                <Field label="Email" value={artisan.email} mono />
                                <Field label="Phone" value={artisan.phoneNumber} mono />
                            </FieldList>
                        </FaceliftRoot>
                    </Box>
                </Box>
            </CardContent>
        </Card>
    );
};

export default ArtisanImage;