import React from 'react';
import { Grid, Typography, Box } from '@mui/material';
import RepairCard from './RepairCard';

const RepairsList = ({ 
    repairs, 
    pendingParts, 
    onAddMaterial, 
    onEditMaterial,
    onMarkPartsOrdered,
    onMarkReadyForWork,
    emptyMessage = "No repairs found" 
}) => {
    if (repairs.length === 0) {
        return (
            <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="h6" color="text.secondary">
                    {emptyMessage}
                </Typography>
            </Box>
        );
    }

    return (
        <Grid container spacing={3}>
            {repairs.map((repair) => (
                <Grid item xs={12} lg={6} key={repair.repairID}>
                    <RepairCard
                        repair={repair}
                        pendingMaterials={pendingParts[repair.repairID] || []}
                        onAddMaterial={onAddMaterial}
                        onEditMaterial={onEditMaterial}
                        onMarkPartsOrdered={onMarkPartsOrdered}
                        onMarkReadyForWork={onMarkReadyForWork}
                    />
                </Grid>
            ))}
        </Grid>
    );
};

export default RepairsList;
