import React from 'react';
import { Box, IconButton, Menu, MenuItem, Button } from '@mui/material';
import { TabRail } from '@/components/facelift';
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

    return (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            
            {/* Tabs Section */}
            <TabRail
                ariaLabel="Artisan sections"
                value={activeTab}
                onChange={setActiveTab}
                items={[
                    { key: 0, label: 'Artisan Details' },
                    { key: 1, label: 'Vendor Profile' },
                    { key: 2, label: 'Staff / Repair Ops' },
                    { key: 3, label: 'My Bench' },
                ]}
            />

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
                    <MenuItem onClick={handleClose}>
                        Delete Artisan
                    </MenuItem>
                </Menu>
            </Box>
        </Box>
    );
};

export default ArtisanHeader;
