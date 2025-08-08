import React from 'react';
import { 
    Box, 
    Typography, 
    List, 
    ListItem, 
    ListItemText, 
    IconButton, 
    Chip 
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

const RepairListItem = ({ repair, repairID, onRemove }) => {
    return (
        <ListItem
            sx={{
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                mb: 1,
                backgroundColor: '#fafafa'
            }}
            secondaryAction={
                <IconButton edge="end" onClick={() => onRemove(repairID)} color="error">
                    <DeleteIcon />
                </IconButton>
            }
        >
            <ListItemText 
                primary={`Repair ID: ${repairID}`}
                secondary={repair ? (
                    <Box>
                        <Typography variant="body2" color="text.secondary">
                            Client: {repair.clientName} | Current Status: {repair.status}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {repair.description}
                        </Typography>
                        {repair.isRush && (
                            <Chip 
                                label="RUSH" 
                                color="error" 
                                size="small" 
                                sx={{ ml: 1, fontSize: '0.6rem', height: '16px' }} 
                            />
                        )}
                        {repair.promiseDate && (
                            <Typography variant="caption" display="block" color="text.secondary">
                                Due: {new Date(repair.promiseDate).toLocaleDateString()}
                            </Typography>
                        )}
                    </Box>
                ) : 'Repair details not found'}
            />
        </ListItem>
    );
};

const RepairList = ({ repairIDs, repairs, onRemoveRepair }) => {
    if (repairIDs.length === 0) {
        return (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                No repairs added yet. Scan or type repair IDs above.
            </Typography>
        );
    }

    return (
        <List>
            {repairIDs.map((repairID, index) => {
                const repair = repairs.find(r => r.repairID === repairID);
                return (
                    <RepairListItem
                        key={index}
                        repair={repair}
                        repairID={repairID}
                        onRemove={onRemoveRepair}
                    />
                );
            })}
        </List>
    );
};

export default RepairList;
