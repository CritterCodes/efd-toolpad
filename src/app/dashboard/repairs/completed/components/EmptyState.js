import React from 'react';
import { Card, CardContent, Typography, Button } from '@mui/material';
import { CheckCircle as CompletedIcon, Add as AddIcon } from '@mui/icons-material';

export const EmptyState = ({ completedRepairsLength, handleCreateRepair }) => {
    return (
        <Card>
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
                <CompletedIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                    {completedRepairsLength === 0 ? 'No completed repairs yet' : 'No repairs match your search'}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {completedRepairsLength === 0
                        ? 'Complete some repairs to see them here'
                        : 'Try adjusting your search criteria or filters'
                    }
                </Typography>
                {completedRepairsLength === 0 && (
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
};
