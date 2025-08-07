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
import tasksService from '@/services/tasks.service';

const RepairTasksTable = ({ repairTasks, onEdit, isWholesale, selectedMetal }) => {
    const [shopifyTasks, setShopifyTasks] = useState([]);
    const [uniqueTasks, setUniqueTasks] = useState([]);
    const [taskSearch, setTaskSearch] = useState('');
    const [metalType, setMetalType] = useState(null);

    useEffect(() => {
        const fetchRepairTasks = async () => {
            try {
                const response = await tasksService.getTasks({ isActive: 'true' });
                if (Array.isArray(response)) {
                    const uniqueTasks = response.reduce((acc, task) => {
                        if (!acc.some((t) => t.title === task.title)) {
                            acc.push(task);
                        }
                        return acc;
                    }, []);
                    setUniqueTasks(uniqueTasks);
                    setShopifyTasks(response);
                } else {
                    console.error("API response is not an array:", response);
                }
            } catch (error) {
                console.error("Error fetching repair tasks:", error);
            }
        };
        console.log('is wholesale (tasks table):', isWholesale);
        fetchRepairTasks();
    }, []);

    const parseMetalType = (metalType) => {
        console.log('parsing metalType', metalType);
        if (typeof metalType === 'string') {
            const [type, karat] = metalType.split(' - ');
            console.log('type', type, 'karat', karat);
            if (!karat) {
                return { type, karat: '' };
            }
            console.log('trimming karat');
            const trimmedKarat = karat.slice(0, -1); // Remove the last character ('k')
            console.log('karat', trimmedKarat);
            const formattedMT = `${trimmedKarat}${type.toLowerCase()}`;
            console.log('formattedMT', formattedMT);
            return formattedMT;
        }
        return { type: '', karat: '' };
    };



    const buildSku = (sku) => {
        const formattedMT = parseMetalType(selectedMetal);
        const [tag, num, title, mType] = sku.split('-');
        console.log('tag', tag, 'num', typeof num, 'title', title, 'mType', mType);
        if (!mType) {
            return sku
        };
        console.log('formattedMT', formattedMT);
        let metalIdentity;
        switch (formattedMT) {
            case 'ss':
                metalIdentity = 1;
                break;
            case '14yg':
                metalIdentity = 2;
                break;
            case '14wg':
                metalIdentity = 3;
                break;
            case '18yg':
                metalIdentity = 4;
                break;
            case '18wg':
                metalIdentity = 5;
                break;
        }
        const taskNum =
    num.length === 4
        ? num
              .split('') // Convert string to array
              .map((char, index) =>
                  index === 1 ? metalIdentity : char // Replace the second character with `metalIdentity`
              )
              .join('') // Convert back to string
        : `${metalIdentity}${num.slice(1)}`; // Add `metalIdentity` and skip the first character

        console.log('taskNum', taskNum);
        return `${tag}-${taskNum}-${title}-${formattedMT}`;
    };



    const handleAddTask = () => {
        onEdit('repairTasks', [
            ...repairTasks,
            {
                title: "", // Allow editing for custom tasks
                price: "", // Custom tasks can have editable prices
                sku: "", // Custom tasks do not have SKUs
                quantity: 1, // Default quantity to 1
            },
        ]);
    };
    

    const handleDeleteTask = (index) => {
        const updatedTasks = repairTasks.filter((_, i) => i !== index);
        onEdit('repairTasks', updatedTasks);
    };

    const handleTaskChange = (index, field, value) => {
        const updatedTasks = [...repairTasks];
        updatedTasks[index] = {
            ...updatedTasks[index], // Preserve other fields
            [field]: value, // Update the specific field being edited
        };
    
        // Ensure title is properly set and saved
        if (field === "title" && !updatedTasks[index].sku) {
            updatedTasks[index].sku = ""; // Custom tasks don’t have a SKU
        }
    
        onEdit('repairTasks', updatedTasks);
    };
    

    const handleTaskSelect = (index, task) => {
        const updatedTasks = [...repairTasks];
    
        if (task) {
            console.log("task", task);
    
            const selectedTask = uniqueTasks.find((t) => t.title === task);
    
            if (selectedTask) {
                console.log("selectedTask", selectedTask);
                const selectedSku = buildSku(selectedTask.sku);
                const correctTask = shopifyTasks.find((t) => t.sku === selectedSku);
    
                if (correctTask) {
                    updatedTasks[index] = {
                        title: correctTask.title,
                        price: isWholesale
                            ? (parseFloat(correctTask.price || 0) / 2).toFixed(2)
                            : correctTask.price,
                        sku: correctTask.sku,
                        quantity: updatedTasks[index].quantity || 1, // Preserve quantity
                    };
                }
            } else {
                // Handle as a custom task since no match was found
                console.log("No match found, treating as custom task");
                updatedTasks[index] = {
                    ...updatedTasks[index], // Preserve existing fields
                    title: task, // Use the custom title
                    sku: "", // No SKU for custom tasks
                    price: updatedTasks[index].price || "", // Preserve price or allow input
                };
            }
        } else {
            console.log("No task selected, clearing task");
            // Clear task if input is empty
            updatedTasks[index] = {
                ...updatedTasks[index],
                title: "",
                sku: "",
            };
        }
    
        onEdit("repairTasks", updatedTasks);
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
                                options={uniqueTasks.map((t) => t.title)}
                                value={task.title}
                                onInputChange={(e, value) => setTaskSearch(value)}
                                onChange={(e, newValue) => handleTaskSelect(index, newValue)}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Task Title"
                                        fullWidth
                                    />
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
                                onChange={(e) => handleTaskChange(index, 'quantity', e.target.value)}
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
