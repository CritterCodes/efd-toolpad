import React from 'react';
import { Grid, Box, Typography } from '@mui/material';
import {
    Build as BuildIcon,
    Handyman as HandymanIcon,
    Inventory2 as InventoryIcon
} from '@mui/icons-material';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';

const cards = [
    { label: 'Active Repairs', valueKey: 'currentRepairsCount', icon: BuildIcon },
    { label: 'In Progress', valueKey: 'inProgressCount', icon: HandymanIcon },
    { label: 'Ready for Pickup', valueKey: 'readyForPickupCount', icon: InventoryIcon }
];

const RepairsStatsCards = ({ currentRepairsCount, inProgressCount, readyForPickupCount }) => {
    const values = { currentRepairsCount, inProgressCount, readyForPickupCount };

    return (
        <Grid container spacing={2} sx={{ mb: 3 }}>
            {cards.map(({ label, valueKey, icon: Icon }) => (
                <Grid item xs={12} sm={4} key={valueKey}>
                    <Box
                        sx={{
                            backgroundColor: REPAIRS_UI.bgPanel,
                            border: `1px solid ${REPAIRS_UI.border}`,
                            borderRadius: 3,
                            boxShadow: REPAIRS_UI.shadow,
                            p: 2.25,
                            height: '100%'
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box
                                sx={{
                                    width: 42,
                                    height: 42,
                                    borderRadius: 2,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: `1px solid ${REPAIRS_UI.border}`,
                                    backgroundColor: REPAIRS_UI.bgCard
                                }}
                            >
                                <Icon sx={{ color: REPAIRS_UI.accent, fontSize: 20 }} />
                            </Box>
                            <Box>
                                <Typography sx={{ fontSize: { xs: '1.8rem', md: '2rem' }, lineHeight: 1.1, fontWeight: 700, color: REPAIRS_UI.textHeader }}>
                                    {values[valueKey]}
                                </Typography>
                                <Typography sx={{ color: REPAIRS_UI.textSecondary }}>
                                    {label}
                                </Typography>
                            </Box>
                        </Box>
                    </Box>
                </Grid>
            ))}
        </Grid>
    );
};

export default RepairsStatsCards;
