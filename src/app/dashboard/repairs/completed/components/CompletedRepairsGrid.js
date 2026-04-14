import React from 'react';
import {
    Grid,
    Button
} from '@mui/material';
import { Visibility as ViewIcon } from '@mui/icons-material';
import RepairCard from '@/components/business/repairs/RepairCard';

export const CompletedRepairsGrid = ({ repairs, handleViewRepair }) => {
    return (
        <Grid container spacing={2}>
            {repairs.map((repair) => (
                <Grid item xs={12} sm={6} lg={4} key={repair._id || repair.repairID}>
                    <RepairCard
                        repair={repair}
                        actions={
                            <Button
                                variant="outlined"
                                size="small"
                                startIcon={<ViewIcon />}
                                onClick={() => handleViewRepair(repair._id || repair.repairID)}
                            >
                                View Details
                            </Button>
                        }
                    />
                </Grid>
            ))}
        </Grid>
    );
};
