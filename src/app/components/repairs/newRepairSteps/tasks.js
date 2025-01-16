"use client";

import * as React from "react";
import PropTypes from "prop-types";
import {
    TextField,
    Autocomplete,
    Chip,
    Box,
    Typography,
    List,
    ListItem,
    Button,
    IconButton,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import RepairTaskService from "@/services/repairTasks";

export default function TasksStep({ formData, setFormData }) {
    const [repairTasks, setRepairTasks] = React.useState([]);
    const [selectedRepairTasks, setSelectedRepairTasks] = React.useState(
        formData.repairTasks || []
    );
    const [taskSearch, setTaskSearch] = React.useState("");

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
                    setRepairTasks(uniqueTasks);
                } else {
                    console.error("API response is not an array:", response);
                }
            } catch (error) {
                console.error("Failed to fetch repair tasks:", error);
            }
        };
        fetchRepairTasks();
    }, []);

    const getSKUForRepairTask = (task) => {
        if (!task.sku) {
            return `undefined-sku-${crypto.randomUUID()}`;
        }
        const { selectedMetal, karatOptions } = formData;
        if (selectedMetal === "Yellow Gold") {
            if (karatOptions?.["14k"]) return `${task.sku}-14yg`;
            if (karatOptions?.["18k"]) return `${task.sku}-18yg`;
        }
        if (selectedMetal === "White Gold" && karatOptions?.["14k"]) {
            return `${task.sku}-14wg`;
        }
        if (selectedMetal === "Silver") {
            return `${task.sku}-ss`;
        }

        return task.sku;
    };

    const handleRepairTaskChange = (event, value) => {
        const tasksWithSKU = value
            .map((taskTitle) => {
                const task = repairTasks.find((t) => t.title === taskTitle);
                return task
                    ? {
                          ...task,
                          sku: getSKUForRepairTask(task),
                          quantity: task.quantity || 1, // Default quantity to 1 if not set
                      }
                    : null;
            })
            .filter(Boolean);

        setSelectedRepairTasks(tasksWithSKU);
        setFormData({ ...formData, repairTasks: tasksWithSKU });
    };

    const handleQuantityChange = (index, quantity) => {
        const updatedTasks = [...selectedRepairTasks];
        updatedTasks[index].quantity = quantity;
        setSelectedRepairTasks(updatedTasks);
        setFormData({ ...formData, repairTasks: updatedTasks });
    };

    const handleRemoveTask = (index) => {
        const updatedTasks = selectedRepairTasks.filter((_, i) => i !== index);
        setSelectedRepairTasks(updatedTasks);
        setFormData({ ...formData, repairTasks: updatedTasks });
    };

    const filteredTasks = repairTasks.filter((task) =>
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
                            <ListItem key={task.sku} disableGutters>
                                <Box
                                    sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        width: "96%",
                                    }}
                                >
                                    <Typography sx={{ flex: 1 }}>{task.title}</Typography>
                                    <TextField
                                        label="Qty"
                                        type="number"
                                        value={task.quantity || 1} // Default quantity to 1
                                        onChange={(e) =>
                                            handleQuantityChange(index, Number(e.target.value))
                                        }
                                        size="small"
                                        sx={{ width: "80px", mx: 2 }}
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
