
"use client";
import * as React from "react";
import PropTypes from "prop-types";
import { Box, Typography, Button, Autocomplete, TextField } from "@mui/material";
import FilterListIcon from "@mui/icons-material/FilterList";
import useNewRepairTasks from "@/hooks/repairs/useNewRepairTasks";
import TaskSelectionList from "./tasks/TaskSelectionList";
import TaskFilters from "./tasks/TaskFilters";

export default function TasksStep({ formData, setFormData, isWholesale }) {
    const {
        uniqueTasks, selectedRepairTasks, handleAddRepairTask, handleRemoveRepairTask,
        categoryFilter, setCategoryFilter, metalTypeFilter, setMetalTypeFilter,
        showFilters, setShowFilters
    } = useNewRepairTasks(formData);

    React.useEffect(() => {
        setFormData({ ...formData, repairTasks: selectedRepairTasks });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedRepairTasks]);

    return (
        <React.Fragment>
            <Typography variant="h6" gutterBottom>Repair Tasks</Typography>
            <Button startIcon={<FilterListIcon />} onClick={() => setShowFilters(!showFilters)}>
                Filters
            </Button>
            {showFilters && (
                <TaskFilters 
                    categoryFilter={categoryFilter} setCategoryFilter={setCategoryFilter}
                    metalTypeFilter={metalTypeFilter} setMetalTypeFilter={setMetalTypeFilter}
                />
            )}
            <Autocomplete
                options={uniqueTasks}
                getOptionLabel={(option) => option.title}
                onChange={(event, newValue) => { if (newValue) handleAddRepairTask(newValue); }}
                renderInput={(params) => <TextField {...params} label="Search Tasks" variant="outlined" />}
            />
            <TaskSelectionList 
                selectedRepairTasks={selectedRepairTasks}
                handleRemoveRepairTask={handleRemoveRepairTask}
            />
        </React.Fragment>
    );
}
TasksStep.propTypes = { formData: PropTypes.object.isRequired, setFormData: PropTypes.func.isRequired, isWholesale: PropTypes.bool };
