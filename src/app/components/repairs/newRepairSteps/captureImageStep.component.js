"use client";

import * as React from 'react';
import PropTypes from 'prop-types';
import { Button, Box, Typography } from '@mui/material';
import Image from 'next/image';

/**
 * CaptureImageStep Component (Fixed to Prevent Empty src)
 */
export default function CaptureImageStep({ formData, setFormData }) {
    const [preview, setPreview] = React.useState(formData.picture ? URL.createObjectURL(formData.picture) : null);

    /**
     * Handle image capture/upload and store the File object directly
     */
    const handleCaptureImage = (event) => {
        const file = event.target.files[0];
        if (file) {
            const imageURL = URL.createObjectURL(file);
            setPreview(imageURL);
            setFormData((prev) => ({ ...prev, picture: file }));  // ✅ Save as File object
        }
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            {/* Capture Button */}
            <Button
                variant="contained"
                component="label"
                sx={{ width: '100%' }}
            >
                Capture Picture
                <input
                    type="file"
                    accept="image/*"
                    capture="environment" 
                    hidden
                    onChange={handleCaptureImage}
                />
            </Button>

            {/* Image Preview Section */}
            {preview ? (
                <Box
                    sx={{
                        mt: 2,
                        border: '1px solid #ddd',
                        borderRadius: 2,
                        overflow: 'hidden',
                        maxWidth: '300px',
                        position: 'relative',
                        width: '100%',
                        height: 'auto',
                    }}
                >
                    <Typography variant="body2" align="center">Captured Image:</Typography>
                    <Image
                        src={preview}
                        alt="Captured Image"
                        layout="responsive"
                        width={300}
                        height={300}
                        objectFit="cover"
                        priority={true}
                    />
                </Box>
            ) : (
                <Typography variant="body2">No image captured yet.</Typography>
            )}
        </Box>
    );
}

CaptureImageStep.propTypes = {
    formData: PropTypes.object.isRequired,
    setFormData: PropTypes.func.isRequired,
};
