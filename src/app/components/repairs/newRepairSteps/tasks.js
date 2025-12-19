"use client";

import * as React from "react";
import PropTypes from "prop-types";
import {
    TextField,
    Autocomplete,
    Box,
    Typography,
    List,
    ListItem,
    Button,
    IconButton,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Grid,
    Chip,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import FilterListIcon from "@mui/icons-material/FilterList";
import tasksService from "@/services/tasks.service";
import { SKILL_LEVEL } from "@/constants/pricing.constants.mjs";

export default function TasksStep({ formData, setFormData, isWholesale }) {
    const [repairTasks, setRepairTasks] = React.useState([]);
    const [uniqueTasks, setUniqueTasks] = React.useState([]);
    const [selectedRepairTasks, setSelectedRepairTasks] = React.useState(
        formData.repairTasks || []
    );
    const [taskSearch, setTaskSearch] = React.useState("");
    const [client, setClient] = React.useState({});
    
    // New filtering state
    const [categoryFilter, setCategoryFilter] = React.useState("");
    const [metalTypeFilter, setMetalTypeFilter] = React.useState("");
    const [showFilters, setShowFilters] = React.useState(false);

    React.useEffect(() => {
        const fetchRepairTasks = async () => {
            try {
                const response = await tasksService.getTasks({ isActive: 'true' });
                if (Array.isArray(response)) {
                    // Normalize task data to handle both old and new structures
                    const normalizedTasks = response.map(task => ({
                        ...task,
                        // Ensure price field exists (map from basePrice if needed)
                        price: task.price || task.basePrice || 0,
                        // Ensure sku field exists (use generated SKU from new system)
                        sku: task.sku || `TASK-${task._id?.slice(-6) || Math.random().toString(36).slice(2, 8)}`,
                        // Map category for filtering if needed
                        category: task.category || 'repair',
                        // Map metalType for filtering
                        metalType: task.metalType || '',
                    }));
                    
                    const uniqueTasks = normalizedTasks.reduce((acc, task) => {
                        if (!acc.some((t) => t.title === task.title)) {
                            acc.push(task);
                        }
                        return acc;
                    }, []);
                    setUniqueTasks(uniqueTasks);
                    setRepairTasks(normalizedTasks);
                } else {
                    console.error("API response is not an array:", response);
                }
            } catch (error) {
                console.error("Failed to fetch repair tasks:", error);
            }
        };
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
        const { type, karat } = formData.metalType;
        const selectedMetal = `${type} - ${karat}`;
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

    const handleRepairTaskChange = (event, value) => {
        const updatedTasks = value.map((taskTitle) => {
            const existingTask = uniqueTasks.find((t) => t.title === taskTitle);
    
            if (existingTask) {
                // If task is from predefined list, use its details
                const actualSku = buildSku(existingTask.sku);
                const correctTask = repairTasks.find((t) => t.sku === actualSku);
                
                // Get price from either the correct task or existing task
                const taskPrice = correctTask?.price || correctTask?.basePrice || existingTask.price || existingTask.basePrice || 0;
                
                return {
                    title: existingTask.title,
                    sku: actualSku,
                    price: isWholesale
                        ? (parseFloat(taskPrice) / 2).toFixed(2)
                        : taskPrice,
                    quantity: 1, // Default quantity
                    // Include additional fields from new tasks system
                    category: existingTask.category,
                    metalType: existingTask.metalType,
                    laborHours: existingTask.laborHours,
                    skillLevel: existingTask.skillLevel,
                    riskLevel: existingTask.riskLevel,
                };
            } else {
                // Handle custom tasks
                const existingCustomTask = selectedRepairTasks.find(
                    (task) => task.title === taskTitle
                );
    
                return (
                    existingCustomTask || {
                        title: taskTitle, // Use the custom title
                        sku: "", // No SKU for custom tasks
                        price: "", // Leave price editable
                        quantity: 1, // Default quantity
                        category: "custom", // Mark as custom
                        metalType: "",
                        laborHours: 0,
                        skillLevel: "standard",
                        riskLevel: "low",
                    }
                );
            }
        });
    
        setSelectedRepairTasks(updatedTasks);
        setFormData({ ...formData, repairTasks: updatedTasks });
    };
    

    const handleQuantityChange = (index, quantity) => {
        const updatedTasks = [...selectedRepairTasks];
        updatedTasks[index].quantity = quantity;
        setSelectedRepairTasks(updatedTasks);
        setFormData({ ...formData, repairTasks: updatedTasks });
    };

    const handlePriceChange = (index, price) => {
        const updatedTasks = [...selectedRepairTasks];
        updatedTasks[index].price = price;
        setSelectedRepairTasks(updatedTasks);
        setFormData({ ...formData, repairTasks: updatedTasks });
    };

    const handleRemoveTask = (index) => {
        const updatedTasks = selectedRepairTasks.filter((_, i) => i !== index);
        setSelectedRepairTasks(updatedTasks);
        setFormData({ ...formData, repairTasks: updatedTasks });
    };

    const filteredTasks = uniqueTasks.filter((task) => {
        const matchesSearch = task.title.toLowerCase().includes(taskSearch.toLowerCase());
        const matchesCategory = !categoryFilter || task.category === categoryFilter;
        const matchesMetal = !metalTypeFilter || task.metalType === metalTypeFilter;
        
        return matchesSearch && matchesCategory && matchesMetal;
    });

    // Get unique categories and metal types for filter dropdowns
    const availableCategories = [...new Set(uniqueTasks.map(task => task.category).filter(Boolean))];
    const availableMetalTypes = [...new Set(uniqueTasks.map(task => task.metalType).filter(Boolean))];

    return (
        <div>
            {/* Search and Filter Section */}
            <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
                    <Autocomplete
                        freeSolo
                        multiple
                        filterSelectedOptions
                        options={filteredTasks.map((task) => task.title)}
                        value={selectedRepairTasks.map((task) => task.title)}
                        onInputChange={(event, newValue) => setTaskSearch(newValue)}
                        onChange={handleRepairTaskChange}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="Search & Select Repair Tasks"
                                margin="normal"
                                fullWidth
                                helperText={`${filteredTasks.length} tasks available`}
                            />
                        )}
                        sx={{ flex: 1 }}
                    />
                    <Button
                        variant="outlined"
                        startIcon={<FilterListIcon />}
                        onClick={() => setShowFilters(!showFilters)}
                        sx={{ mt: 1 }}
                    >
                        Filters
                    </Button>
                </Box>

                {/* Filter Controls */}
                {showFilters && (
                    <Grid container spacing={2} sx={{ mb: 2 }}>
                        <Grid item xs={12} sm={4}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Category</InputLabel>
                                <Select
                                    value={categoryFilter}
                                    label="Category"
                                    onChange={(e) => setCategoryFilter(e.target.value)}
                                >
                                    <MenuItem value="">All Categories</MenuItem>
                                    {availableCategories.map((category) => (
                                        <MenuItem key={category} value={category}>
                                            {category.replace('_', ' ').toUpperCase()}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Metal Type</InputLabel>
                                <Select
                                    value={metalTypeFilter}
                                    label="Metal Type"
                                    onChange={(e) => setMetalTypeFilter(e.target.value)}
                                >
                                    <MenuItem value="">All Metals</MenuItem>
                                    {availableMetalTypes.map((metal) => (
                                        <MenuItem key={metal} value={metal}>
                                            {metal.toUpperCase()}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <Button
                                variant="outlined"
                                fullWidth
                                onClick={() => {
                                    setCategoryFilter("");
                                    setMetalTypeFilter("");
                                    setTaskSearch("");
                                }}
                            >
                                Clear Filters
                            </Button>
                        </Grid>
                    </Grid>
                )}

                {/* Active Filters Display */}
                {(categoryFilter || metalTypeFilter) && (
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                        {categoryFilter && (
                            <Chip
                                label={`Category: ${categoryFilter.replace('_', ' ')}`}
                                onDelete={() => setCategoryFilter("")}
                                size="small"
                                color="primary"
                            />
                        )}
                        {metalTypeFilter && (
                            <Chip
                                label={`Metal: ${metalTypeFilter}`}
                                onDelete={() => setMetalTypeFilter("")}
                                size="small"
                                color="primary"
                            />
                        )}
                    </Box>
                )}
            </Box>

            {selectedRepairTasks.length > 0 && (
                <Box>
                    <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
                        Selected Tasks
                    </Typography>
                    <List>
                        {selectedRepairTasks.map((task, index) => (
                            <ListItem key={index} disableGutters>
                                <Box
                                    sx={{
                                        display: "flex",
                                        flexDirection: "column",
                                        width: "100%",
                                        gap: 1,
                                        p: 2,
                                        border: "1px solid #e0e0e0",
                                        borderRadius: 1,
                                    }}
                                >
                                    {/* Task Title and Category */}
                                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                                            {task.title}
                                        </Typography>
                                        {task.category && task.category !== 'custom' && (
                                            <Typography variant="caption" 
                                                sx={{ 
                                                    bgcolor: 'primary.light', 
                                                    color: 'primary.contrastText',
                                                    px: 1, 
                                                    py: 0.5, 
                                                    borderRadius: 1 
                                                }}
                                            >
                                                {task.category.replace('_', ' ').toUpperCase()}
                                            </Typography>
                                        )}
                                    </Box>
                                    
                                    {/* Task Details */}
                                    <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
                                        {task.sku && (
                                            <Typography variant="caption" color="text.secondary">
                                                SKU: {task.sku}
                                            </Typography>
                                        )}
                                        {task.metalType && (
                                            <Typography variant="caption" color="text.secondary">
                                                Metal: {task.metalType.toUpperCase()}
                                            </Typography>
                                        )}
                                        {task.laborHours > 0 && (
                                            <Typography variant="caption" color="text.secondary">
                                                Labor: {task.laborHours}h
                                            </Typography>
                                        )}
                                        {task.skillLevel && task.skillLevel !== SKILL_LEVEL.STANDARD && (
                                            <Typography variant="caption" color="text.secondary">
                                                Skill: {task.skillLevel.toUpperCase()}
                                            </Typography>
                                        )}
                                    </Box>
                                    
                                    {/* Price and Quantity Controls */}
                                    <Box
                                        sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            gap: 2,
                                        }}
                                    >
                                        <TextField
                                            label="Price"
                                            type="number"
                                            value={task.price || ""}
                                            onChange={(e) =>
                                                handlePriceChange(index, e.target.value)
                                            }
                                            size="small"
                                            sx={{ width: "120px" }}
                                            InputProps={{
                                                startAdornment: '$'
                                            }}
                                        />
                                        <TextField
                                            label="Quantity"
                                            type="number"
                                            value={task.quantity || 1}
                                            onChange={(e) =>
                                                handleQuantityChange(index, Number(e.target.value))
                                            }
                                            size="small"
                                            sx={{ width: "80px" }}
                                            inputProps={{ min: 1 }}
                                        />
                                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                            <Typography variant="body2" color="primary" sx={{ fontWeight: 'bold' }}>
                                                Total: ${((task.price || 0) * (task.quantity || 1)).toFixed(2)}
                                            </Typography>
                                            <IconButton
                                                edge="end"
                                                color="error"
                                                onClick={() => handleRemoveTask(index)}
                                            >
                                                <DeleteIcon />
                                            </IconButton>
                                        </Box>
                                    </Box>
                                </Box>
                            </ListItem>
                        ))}
                    </List>
                    
                    {/* Total Summary */}
                    <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                        <Typography variant="h6" color="primary">
                            Total Cost: ${selectedRepairTasks.reduce((total, task) => 
                                total + ((task.price || 0) * (task.quantity || 1)), 0
                            ).toFixed(2)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {selectedRepairTasks.length} task{selectedRepairTasks.length !== 1 ? 's' : ''} selected
                        </Typography>
                    </Box>
                </Box>
            )}

            <Button
                variant="contained"
                color="primary"
                fullWidth
                sx={{ mt: 3 }}
                onClick={() => console.log("FormData:", formData)}
            >
                Submit Tasks
            </Button>
        </div>
    );
}

TasksStep.propTypes = {
    formData: PropTypes.object.isRequired,
    setFormData: PropTypes.func.isRequired,
};
