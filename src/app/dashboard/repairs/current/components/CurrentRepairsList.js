import React from 'react';
import {
    Grid,
    Card,
    CardContent,
    Typography,
    Button
} from '@mui/material';
import { Add as AddIcon, Build as RepairIcon, Visibility as ViewIcon } from '@mui/icons-material';
import RepairCard from '@/components/business/repairs/RepairCard';

const CurrentRepairsList = ({
    repairs,
    handleCreateRepair,
    handleViewRepair,
    currentRepairsCount
}) => {
    if (repairs.length === 0) {
        return (
            <Card>
                <CardContent sx={{ textAlign: 'center', py: 4 }}>
                    <RepairIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                        {currentRepairsCount === 0 ? 'No active repairs found' : 'No repairs match your search'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {currentRepairsCount === 0
                            ? 'All your repairs are completed or you haven\'t submitted any yet'
                            : 'Try adjusting your search criteria or filters'
                        }
                    </Typography>
                    {currentRepairsCount === 0 && (
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={handleCreateRepair}
                        >
                            Create New Repair
                        </Button>
                    )}
                </CardContent>
            </Card>
        );
    }

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
                                onClick={() => handleViewRepair(repair.repairID || repair._id)}
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

export default CurrentRepairsList;