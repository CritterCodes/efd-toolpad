import React from 'react';
import { Typography, TextField } from "@mui/material";

const QCPhotoStep = ({ handleImageUpload }) => {
    return (
        <>
            <Typography sx={{ mt: 2 }}>
                Upload a picture for liability and documentation.
            </Typography>
            <TextField
                type="file"
                onChange={handleImageUpload}
                fullWidth
                sx={{ mt: 2 }}
            />
        </>
    );
};

export default QCPhotoStep;
