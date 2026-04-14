import React from 'react';
import { Box } from '@mui/material';

const SideBySideLayout = ({ children }) => {
    return (
        <Box
            sx={{
                display: 'flex',
                width: '100%',
                height: '100%',
                '@media print': {
                    height: '100%',
                },
                gap: 0,
            }}
        >
            {children}
        </Box>
    );
};

export default SideBySideLayout;
