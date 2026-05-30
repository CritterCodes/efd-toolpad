
"use client";
import * as React from "react";
import PropTypes from "prop-types";
import { Box, Typography, Button, Autocomplete, TextField, FormControlLabel, Checkbox } from "@mui/material";
import FilterListIcon from "@mui/icons-material/FilterList";
import useNewRepairTasks from "@/hooks/repairs/useNewRepairTasks";
import usePromiseDateEstimate from "@/hooks/repairs/usePromiseDateEstimate";
import TaskSelectionList from "./tasks/TaskSelectionList";
import TaskFilters from "./tasks/TaskFilters";
import PromiseDateSuggestion from "../PromiseDateSuggestion";

export default function TasksStep({ formData, setFormData, isWholesale }) {
    const {
        uniqueTasks, selectedRepairTasks, handleAddRepairTask, handleRemoveRepairTask,
        categoryFilter, setCategoryFilter, metalTypeFilter, setMetalTypeFilter,
        showFilters, setShowFilters
    } = useNewRepairTasks(formData);

    React.useEffect(() => {
        setFormData(prev => ({ ...prev, repairTasks: selectedRepairTasks }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedRepairTasks]);

    const { estimate, context, loading, error } = usePromiseDateEstimate({
        tasks: selectedRepairTasks,
        isRush: !!formData.isRush,
        isWholesale: !!isWholesale,
    });

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

            <FormControlLabel
                sx={{ mt: 1 }}
                control={
                    <Checkbox
                        checked={!!formData.isRush}
                        onChange={(e) => setFormData(prev => ({ ...prev, isRush: e.target.checked }))}
                    />
                }
                label="Rush job"
            />

            <PromiseDateSuggestion
                estimate={estimate}
                context={context}
                loading={loading}
                error={error}
                value={formData.promiseDate}
                onChange={(v) => setFormData(prev => ({ ...prev, promiseDate: v }))}
                deliveryDays={isWholesale ? context?.deliveryDays : undefined}
            />
        </React.Fragment>
    );
}
TasksStep.propTypes = { formData: PropTypes.object.isRequired, setFormData: PropTypes.func.isRequired, isWholesale: PropTypes.bool };
