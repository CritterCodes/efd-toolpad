
import React from 'react';
import { Box, Typography, List, ListItem, Button, IconButton, Chip } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

export default function TaskSelectionList({ selectedRepairTasks, handleRemoveRepairTask }) {
    return (
        <Box>
            <Typography variant="h6">Selected Tasks</Typography>
            <List>
                {selectedRepairTasks.map((task, index) => (
                    <ListItem key={index}>
                        <Typography>{task.title} ({task.sku})</Typography>
                        <IconButton edge="end" onClick={() => handleRemoveRepairTask(task)}>
                            <DeleteIcon />
                        </IconButton>
                    </ListItem>
                ))}
            </List>
        </Box>
    );
}
