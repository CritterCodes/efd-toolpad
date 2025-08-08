import React from 'react';
import { Grid, Typography, Box, Alert } from '@mui/material';
import WorkCard from './WorkCard';

const WorkGrid = ({ 
    repairs, 
    bulkSelectMode = false,
    selectedRepairs = new Set(),
    onToggleSelect,
    onAssignJeweler,
    onStartWork,
    onViewDetails,
    emptyMessage = "No repairs ready for work"
}) => {
    if (repairs.length === 0) {
        return (
            <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                    {emptyMessage}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Repairs will appear here when they have all necessary parts and are ready to work on.
                </Typography>
            </Box>
        );
    }

    const getGridStats = () => {
        const total = repairs.length;
        const rush = repairs.filter(r => r.isRush).length;
        const assigned = repairs.filter(r => r.assignedJeweler).length;
        const overdue = repairs.filter(r => {
            if (!r.promiseDate) return false;
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const dueDate = new Date(r.promiseDate);
            dueDate.setHours(0, 0, 0, 0);
            return dueDate < today;
        }).length;

        return { total, rush, assigned, overdue };
    };

    const stats = getGridStats();

    return (
        <Box>
            {/* Stats Summary */}
            <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Alert severity="info" sx={{ flex: 1, minWidth: 200 }}>
                    <Typography variant="body2">
                        <strong>{stats.total}</strong> repairs ready for work
                    </Typography>
                </Alert>
                
                {stats.rush > 0 && (
                    <Alert severity="error" sx={{ flex: 1, minWidth: 200 }}>
                        <Typography variant="body2">
                            <strong>{stats.rush}</strong> rush order{stats.rush > 1 ? 's' : ''}
                        </Typography>
                    </Alert>
                )}
                
                {stats.overdue > 0 && (
                    <Alert severity="warning" sx={{ flex: 1, minWidth: 200 }}>
                        <Typography variant="body2">
                            <strong>{stats.overdue}</strong> overdue item{stats.overdue > 1 ? 's' : ''}
                        </Typography>
                    </Alert>
                )}
                
                <Alert severity="success" sx={{ flex: 1, minWidth: 200 }}>
                    <Typography variant="body2">
                        <strong>{stats.assigned}</strong> assigned to jewelers
                    </Typography>
                </Alert>
            </Box>

            {/* Repairs Grid */}
            <Grid container spacing={2}>
                {repairs.map((repair) => (
                    <Grid item xs={12} sm={6} lg={4} key={repair.repairID}>
                        <WorkCard
                            repair={repair}
                            bulkSelectMode={bulkSelectMode}
                            isSelected={selectedRepairs.has(repair.repairID)}
                            onToggleSelect={onToggleSelect}
                            onAssignJeweler={onAssignJeweler}
                            onStartWork={onStartWork}
                            onViewDetails={onViewDetails}
                        />
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
};

export default WorkGrid;
