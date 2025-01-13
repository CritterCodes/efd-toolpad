import React from 'react';
import { Box, Typography } from '@mui/material';

const RepairImage = ({ picture }) => {
    return (
        <Box
            sx={{
                flex: 1,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                textAlign: 'center',
                overflow: 'hidden',
                borderRadius: '12px',
                width: '100%', 
                maxWidth: '400px', // Optional for controlling the image size on larger screens
                aspectRatio: '1 / 1' // ✅ Enforcing a square aspect ratio
            }}
        >
            {picture ? (
                <img
                    src={picture}
                    alt="Repair Image"
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover', // ✅ Crops and covers the square fully
                        borderRadius: '12px'
                    }}
                />
            ) : (
                <Typography>No Image Available</Typography>
            )}
        </Box>
    );
};

export default RepairImage;
