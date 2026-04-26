import React from 'react';
import {
    Grid,
    Box,
    Typography,
    Button
} from '@mui/material';
import { Add as AddIcon, Build as RepairIcon, Visibility as ViewIcon } from '@mui/icons-material';
import RepairCard from '@/components/business/repairs/RepairCard';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';

const CurrentRepairsList = ({
    repairs,
    handleCreateRepair,
    handleViewRepair,
    currentRepairsCount
}) => {
    if (repairs.length === 0) {
        return (
            <Box
                sx={{
                    backgroundColor: REPAIRS_UI.bgPanel,
                    border: `1px solid ${REPAIRS_UI.border}`,
                    borderRadius: 3,
                    boxShadow: REPAIRS_UI.shadow,
                    px: 3,
                    py: 5,
                    textAlign: 'center'
                }}
            >
                <RepairIcon sx={{ fontSize: 48, color: REPAIRS_UI.textMuted, mb: 2 }} />
                <Typography variant="h6" sx={{ color: REPAIRS_UI.textHeader, mb: 1 }}>
                    {currentRepairsCount === 0 ? 'No active repairs found' : 'No repairs match the current filters'}
                </Typography>
                <Typography sx={{ color: REPAIRS_UI.textSecondary, mb: 2.5 }}>
                    {currentRepairsCount === 0
                        ? 'There are no active repairs in the system right now.'
                        : 'Adjust the search or filter settings and try again.'}
                </Typography>
                {currentRepairsCount === 0 && (
                    <Button
                        variant="outlined"
                        startIcon={<AddIcon />}
                        onClick={handleCreateRepair}
                        sx={{ color: REPAIRS_UI.textPrimary, borderColor: REPAIRS_UI.border, backgroundColor: REPAIRS_UI.bgCard }}
                    >
                        Create Repair
                    </Button>
                )}
            </Box>
        );
    }

    return (
        <Grid container spacing={2}>
            {repairs.map((repair) => (
                <Grid item xs={12} sm={6} xl={4} key={repair._id || repair.repairID}>
                    <RepairCard
                        repair={repair}
                        actions={(
                            <Button
                                variant="outlined"
                                size="small"
                                startIcon={<ViewIcon />}
                                onClick={() => handleViewRepair(repair.repairID || repair._id)}
                                sx={{ color: REPAIRS_UI.textPrimary, borderColor: REPAIRS_UI.border, backgroundColor: REPAIRS_UI.bgPanel }}
                            >
                                View Details
                            </Button>
                        )}
                    />
                </Grid>
            ))}
        </Grid>
    );
};

export default CurrentRepairsList;
