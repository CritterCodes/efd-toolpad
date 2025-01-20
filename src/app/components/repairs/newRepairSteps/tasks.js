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
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import RepairTaskService from "@/services/repairTasks";

export default function TasksStep({ formData, setFormData, isWholesale }) {
    const [repairTasks, setRepairTasks] = React.useState([]);
    const [uniqueTasks, setUniqueTasks] = React.useState([]);
    const [selectedRepairTasks, setSelectedRepairTasks] = React.useState(
        formData.repairTasks || []
    );
    const [taskSearch, setTaskSearch] = React.useState("");
    const [client, setClient] = React.useState({});

    React.useEffect(() => {
        const fetchRepairTasks = async () => {
            try {
                const response = await RepairTaskService.fetchRepairTasks();
                if (Array.isArray(response)) {
                    const uniqueTasks = response.reduce((acc, task) => {
                        if (!acc.some((t) => t.title === task.title)) {
                            acc.push(task);
                        }
                        return acc;
                    }, []);
                    setUniqueTasks(uniqueTasks);
                    setRepairTasks(response);
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
    
                return {
                    title: existingTask.title,
                    sku: actualSku,
                    price: isWholesale
                        ? (parseFloat(correctTask.price || 0) / 2).toFixed(2)
                        : correctTask.price,
                    quantity: 1, // Default quantity
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

    const filteredTasks = uniqueTasks.filter((task) =>
        task.title.toLowerCase().includes(taskSearch.toLowerCase())
    );

    return (
        <div>
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
                        label="Repair Tasks (Searchable)"
                        margin="normal"
                        fullWidth
                    />
                )}
            />

            {selectedRepairTasks.length > 0 && (
                <Box>
                    <List>
                        {selectedRepairTasks.map((task, index) => (
                            <ListItem key={index} disableGutters>
                                <Box
                                    sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        width: "100%",
                                        gap: 2,
                                    }}
                                >
                                    <Typography sx={{ flex: 2 }}>{task.title}</Typography>
                                    <TextField
                                        label="Price"
                                        type="number"
                                        value={task.price || ""}
                                        onChange={(e) =>
                                            handlePriceChange(index, e.target.value)
                                        }
                                        size="small"
                                        sx={{ width: "80px" }}
                                    />
                                    <TextField
                                        label="Qty"
                                        type="number"
                                        value={task.quantity || 1}
                                        onChange={(e) =>
                                            handleQuantityChange(index, Number(e.target.value))
                                        }
                                        size="small"
                                        sx={{ width: "80px" }}
                                    />
                                    <IconButton
                                        edge="end"
                                        color="error"
                                        onClick={() => handleRemoveTask(index)}
                                    >
                                        <DeleteIcon />
                                    </IconButton>
                                </Box>
                            </ListItem>
                        ))}
                    </List>
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
