import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Box, IconButton, Menu, MenuItem, Tabs, Tab, Typography, Button, Stack, Avatar } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import StorefrontIcon from '@mui/icons-material/Storefront';

const WholesalerHeader = ({ onSave, hasChanges, wholesaler, activeTab, setActiveTab }) => {
    const [anchorEl, setAnchorEl] = React.useState(null);
    const open = Boolean(anchorEl);
    const router = useRouter();

    const handleClick = (event) => setAnchorEl(event.currentTarget);
    const handleClose = () => setAnchorEl(null);

    const profile = wholesaler?.wholesaleApplication || {};
    const email = profile.contactEmail || wholesaler?.email;
    const phone = profile.contactPhone || wholesaler?.contactPhone || wholesaler?.phoneNumber;
    const businessName = profile.businessName || wholesaler?.businessName || wholesaler?.business || 'Wholesale Account';
    const displayName = [profile.contactFirstName || wholesaler?.firstName, profile.contactLastName || wholesaler?.lastName]
        .filter(Boolean)
        .join(' ')
        .trim();
    const accountId = wholesaler?.id || wholesaler?.userID;

    const handleTabChange = (event, newValue) => setActiveTab(newValue);

    return (
        <Box>
            {/* Top row: back + identity */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Button
                    startIcon={<ArrowBackIcon />}
                    onClick={() => router.push('/dashboard/users/wholesalers')}
                >
                    Wholesalers
                </Button>
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
                    <Avatar><StorefrontIcon /></Avatar>
                    <Box sx={{ minWidth: 0 }}>
                        <Typography variant="h6" noWrap>{businessName}</Typography>
                        <Typography variant="body2" color="text.secondary" noWrap>
                            {displayName || email || wholesaler?.userID}
                        </Typography>
                    </Box>
                </Stack>
            </Box>

            {/* Tabs + actions row (mirrors client detail header) */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Tabs value={activeTab} onChange={handleTabChange}>
                    <Tab label="Details" />
                    <Tab label="Repairs" />
                </Tabs>

                <IconButton aria-label="more" onClick={handleClick}>
                    <MoreVertIcon />
                </IconButton>

                <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
                    <MenuItem onClick={() => { onSave(); handleClose(); }} disabled={!hasChanges}>
                        Save Changes
                    </MenuItem>
                    <MenuItem
                        component={Link}
                        href={`/dashboard/users/wholesalers/${encodeURIComponent(accountId)}/print-intake-slips`}
                        onClick={handleClose}
                    >
                        Print Intake Slips
                    </MenuItem>
                    {email && (
                        <MenuItem component="a" href={`mailto:${email}`} onClick={handleClose}>
                            Email
                        </MenuItem>
                    )}
                    {phone && (
                        <MenuItem component="a" href={`tel:${phone}`} onClick={handleClose}>
                            Call
                        </MenuItem>
                    )}
                </Menu>
            </Box>
        </Box>
    );
};

export default WholesalerHeader;
