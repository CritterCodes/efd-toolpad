import React from 'react';
import { Box, Avatar } from '@mui/material';

const UserImage = ({ picture }) => {
    return (
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <Avatar
                src={picture || '/default-avatar.png'}
                sx={{ width: 350, height: 350 }}
            />
        </Box>
    );
};

export default UserImage;
