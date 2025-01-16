"use client";
import React, { useState, useEffect } from 'react';
import {
    Box,
    IconButton,
    TextField,
    Autocomplete,
    Typography,
    Divider,
    Grid
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import RepairTaskService from '@/services/repairTasks';

const RepairTasksTable = ({ repairTasks, onEdit }) => {
    const [shopifyTasks, setShopifyTasks] = useState([]);
    const [taskSearch, setTaskSearch] = useState('');

    useEffect(() => {
        const fetchRepairTasks = async () => {
            try {
                const response = await RepairTaskService.fetchRepairTasks();
                if (Array.isArray(response)) {
                    setShopifyTasks(response);
                }
            } catch (error) {
                console.error("Error fetching repair tasks:", error);
            }
        };
        fetchRepairTasks();
    }, []);

    const handleAddTask = () => {
        onEdit('repairTasks', [...repairTasks, { title: '', price: '', sku: '' }]);
    };

    const handleDeleteTask = (index) => {
        const updatedTasks = repairTasks.filter((_, i) => i !== index);
        onEdit('repairTasks', updatedTasks);
    };

    const handleTaskChange = (index, field, value) => {
        const updatedTasks = [...repairTasks];
        updatedTasks[index][field] = value;
        onEdit('repairTasks', updatedTasks);
    };

    const handleTaskSelect = (index, task) => {
        const selectedTask = shopifyTasks.find(t => t.title === task);
        if (selectedTask) {
            const updatedTasks = [...repairTasks];
            updatedTasks[index] = {
                title: selectedTask.title,
                price: selectedTask.price,
                sku: selectedTask.sku
            };
            onEdit('repairTasks', updatedTasks);
        }
    };

    return (
        <Box sx={{ width: '100%', mt: 4 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Repair Tasks</Typography>

            {repairTasks.map((task, index) => (
                <Box
                    key={index}
                    sx={{
                        display: 'flex',
                        flexDirection: { xs: 'column', md: 'row' },
                        gap: 2,
                        mb: 2,
                        p: 2,
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        alignItems: 'center'
                    }}
                >
                    <Grid container spacing={2} alignItems="center">
                        {/* Task Title Field */}
                        <Grid item xs={12} md={8}>
                            <Autocomplete
                                freeSolo
                                options={shopifyTasks.map((t) => t.title)}
                                value={task.title}
                                onInputChange={(e, value) => setTaskSearch(value)}
                                onChange={(e, newValue) => handleTaskSelect(index, newValue)}
                                renderInput={(params) => (
                                    <TextField {...params} label="Task Title" fullWidth />
                                )}
                            />
                        </Grid>

                        {/* Price Field */}
                        <Grid item xs={12} md={2}>
                            <TextField
                                type="number"
                                label="Price"
                                value={task.price}
                                onChange={(e) => handleTaskChange(index, 'price', e.target.value)}
                                fullWidth
                            />
                        </Grid>

                        {/* Price Field */}
                        <Grid item xs={12} md={1}>
                            <TextField
                                type="number"
                                label="Quantity"
                                value={task.quantity}
                                onChange={(e) => handleTaskChange(index, 'price', e.target.value)}
                                fullWidth
                            />
                        </Grid>


                        {/* Trash Icon Adjusted */}
                        <Grid item xs={12} md="auto">
                            <IconButton
                                onClick={() => handleDeleteTask(index)}
                                color="error"
                                sx={{
                                    fontSize: { xs: '2rem', md: '1.5rem' },
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    padding: '8px'
                                }}
                            >
                                <DeleteIcon fontSize="inherit" />
                            </IconButton>
                        </Grid>

                    </Grid>
                </Box>
            ))}

            {/* Add Task Button */}
            <Divider sx={{ mt: 2, mb: 2 }} />
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: { xs: 'center', md: 'flex-end' }
                }}
            >
                <IconButton onClick={handleAddTask} color="primary">
                    <AddIcon fontSize="large" />
                    <Typography sx={{ ml: 1 }}>Add Task</Typography>
                </IconButton>
            </Box>
        </Box>
    );
};

export default RepairTasksTable;
