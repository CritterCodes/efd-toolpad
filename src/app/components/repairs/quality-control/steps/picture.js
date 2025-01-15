import React from 'react';
import { Typography, Button, Box } from "@mui/material";

const QCPhotoStep = ({ handleImageUpload }) => {
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

            {/* ✅ Modern file upload button styled with Material UI */}
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
                    onChange={handleImageUpload}
                    style={{ display: 'none' }} // ✅ Hides the default file input
                />
            </Button>
        </Box>
    );
};

export default QCPhotoStep;
