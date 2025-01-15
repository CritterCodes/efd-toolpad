import React from 'react';
import { Box, IconButton, Menu, MenuItem, Tabs, Tab } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import UsersService from '@/services/users'; 

const UserHeader = ({ onSave, hasChanges, user, activeTab, setActiveTab }) => {
    const [anchorEl, setAnchorEl] = React.useState(null);
    const open = Boolean(anchorEl);

    const handleClick = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleInvite = async () => {
        try {
            await UsersService.sendInvite(user.email);
            alert(`✅ Invite sent to ${user.email}`);
        } catch (error) {
            alert(`❌ Failed to send invite: ${error.message}`);
        }
        handleClose();
    };

    const handleTabChange = (event, newValue) => {
        setActiveTab(newValue);
    };

    return (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            
            {/* Tabs Section - Integrated into the header */}
            <Tabs value={activeTab} onChange={handleTabChange}>
                <Tab label="User Details" />
                <Tab label="Repairs" />
            </Tabs>

            {/* Three Dots for Actions Section */}
            <IconButton aria-label="more" onClick={handleClick}>
                <MoreVertIcon />
            </IconButton>

            {/* Dropdown Menu for Actions */}
            <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
                {/* Save Changes Option */}
                <MenuItem onClick={onSave} disabled={!hasChanges}>
                    Save Changes
                </MenuItem>
                
                {/* Invite User Option - Only if the user is not verified */}
                {user.status !== "verified" && (
                    <MenuItem onClick={handleInvite}>
                        Invite User
                    </MenuItem>
                )}
            </Menu>
        </Box>
    );
};

export default UserHeader;
