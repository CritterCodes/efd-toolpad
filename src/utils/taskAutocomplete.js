"use client";

import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { Autocomplete, TextField, Chip } from "@mui/material";
import RepairTaskService from "@/services/repairTasks";

const TaskAutocomplete = ({ selectedTasks, setSelectedTasks, label = "Repair Tasks" }) => {
    const [repairTasks, setRepairTasks] = useState([]);
    const [taskSearch, setTaskSearch] = useState("");

    // Fetch repair tasks on mount
    useEffect(() => {
        const fetchRepairTasks = async () => {
            try {
                const tasks = await RepairTaskService.fetchRepairTasks();
                setRepairTasks(tasks);
            } catch (error) {
                console.error("Error fetching repair tasks:", error);
            }
        };
        fetchRepairTasks();
    }, []);

    const handleTaskChange = (event, value) => {
        const updatedTasks = value.map((taskTitle) => {
            const task = repairTasks.find((t) => t.title === taskTitle);
            return task ? { ...task } : null;
        }).filter(Boolean);

        setSelectedTasks(updatedTasks);
    };

    return (
        <Autocomplete
            multiple
            filterSelectedOptions
            options={repairTasks.map((task) => task.title)}
            value={selectedTasks.map((task) => task.title)}
            onInputChange={(event, newValue) => setTaskSearch(newValue)}
            onChange={handleTaskChange}
            renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                    <Chip variant="outlined" label={option} {...getTagProps({ index })} key={option} />
                ))
            }
            renderInput={(params) => (
                <TextField
                    {...params}
                    label={label}
                    placeholder="Start typing to search tasks..."
                    fullWidth
                />
            )}
        />
    );
};

TaskAutocomplete.propTypes = {
    selectedTasks: PropTypes.array.isRequired, // Array of selected tasks
    setSelectedTasks: PropTypes.func.isRequired, // Function to update selected tasks
    label: PropTypes.string, // Label for the autocomplete input
};

export default TaskAutocomplete;
