import React from 'react';
import { Box, IconButton, Menu, MenuItem, Tabs, Tab, Button } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import SaveIcon from '@mui/icons-material/Save';

const ArtisanHeader = ({ onSave, hasChanges, artisan, activeTab, setActiveTab }) => {
    const [anchorEl, setAnchorEl] = React.useState(null);
    const open = Boolean(anchorEl);

    const handleClick = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleCreateVendorProfile = async () => {
        try {
            const response = await fetch('/api/artisans/sync-vendor', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    userId: artisan._id,
                    artisanData: artisan 
                })
            });

            const data = await response.json();
            
            if (data.success) {
                alert('✅ Vendor profile created successfully');
                window.location.reload(); // Refresh to show updated data
            } else {
                alert(`❌ Failed to create vendor profile: ${data.error}`);
            }
        } catch (error) {
            console.error('Error creating vendor profile:', error);
            alert('❌ Error creating vendor profile');
        }
        handleClose();
    };

    const handleTabChange = (event, newValue) => {
        setActiveTab(newValue);
    };

    return (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            
            {/* Tabs Section */}
            <Tabs value={activeTab} onChange={handleTabChange}>
                <Tab label="Artisan Details" />
                <Tab label="Vendor Profile" />
            </Tabs>

            {/* Actions Section */}
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                {/* Save Button */}
                {hasChanges && (
                    <Button
                        variant="contained"
                        startIcon={<SaveIcon />}
                        onClick={onSave}
                        color="primary"
                    >
                        Save Changes
                    </Button>
                )}

                {/* Three Dots Menu */}
                <IconButton aria-label="more" onClick={handleClick}>
                    <MoreVertIcon />
                </IconButton>

                <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
                    {!artisan.vendorProfileId && (
                        <MenuItem onClick={handleCreateVendorProfile}>
                            Create Vendor Profile
                        </MenuItem>
                    )}
                    <MenuItem onClick={handleClose}>
                        Delete Artisan
                    </MenuItem>
                </Menu>
            </Box>
        </Box>
    );
};

export default ArtisanHeader;