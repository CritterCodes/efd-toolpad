import React, { useState } from 'react';
import { Typography, Button, Box } from "@mui/material";
import Image from 'next/image';

const QCPhotoStep = ({ handleImageUpload }) => {
    const [preview, setPreview] = useState(null);
    const [errorMessage, setErrorMessage] = useState("");

    /**
     * Handle image capture/upload and provide a preview
     */
    const handleCaptureImage = (event) => {
        const file = event.target.files[0];

        if (file && file.type.startsWith("image/")) {
            const imageURL = URL.createObjectURL(file);
            setPreview(imageURL); // Set the preview for the image
            handleImageUpload(file); // Pass the file to the parent component
            setErrorMessage(""); // Clear any previous error
        } else {
            setErrorMessage("Please upload a valid image file.");
        }
    };

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                mt: 2,
                gap: 2
            }}
        >
            <Typography fontWeight="bold">
                Document the completed repair.
            </Typography>

            {/* File Upload Button */}
            <Button
                component="label"
                variant="contained"
                sx={{
                    backgroundColor: "#3f51b5",
                    color: "white",
                    borderRadius: "8px",
                    padding: "12px 20px",
                    '&:hover': {
                        backgroundColor: "#303f9f",
                    }
                }}
            >
                📸 Choose Image
                <input
                    type="file"
                    accept="image/*"
                    onChange={handleCaptureImage} // Use the unified logic
                    style={{ display: 'none' }}
                />
            </Button>

            {/* Error Message */}
            {errorMessage && (
                <Typography variant="body2" color="error">
                    {errorMessage}
                </Typography>
            )}

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
};

export default QCPhotoStep;
