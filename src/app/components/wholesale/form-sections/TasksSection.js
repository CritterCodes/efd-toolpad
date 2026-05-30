"use client";

import * as React from "react";
import PropTypes from "prop-types";
import { Box, Typography, Autocomplete, TextField, FormControlLabel, Checkbox, FormHelperText } from "@mui/material";
import useNewRepairTasks from "@/hooks/repairs/useNewRepairTasks";
import usePromiseDateEstimate from "@/hooks/repairs/usePromiseDateEstimate";
import TaskSelectionList from "../../repairs/newRepairSteps/tasks/TaskSelectionList";
import PromiseDateSuggestion from "../../repairs/PromiseDateSuggestion";

export default function TasksSection({ formData, errors, handleInputChange }) {
  const { uniqueTasks, selectedRepairTasks, handleAddRepairTask, handleRemoveRepairTask } = useNewRepairTasks(formData);

  React.useEffect(() => {
    handleInputChange("repairTasks", selectedRepairTasks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRepairTasks]);

  const { estimate, context, loading, error } = usePromiseDateEstimate({
    tasks: selectedRepairTasks,
    isRush: !!formData.isRush,
    isWholesale: true,
  });

  return (
    <Box>
      <Typography variant="h6" gutterBottom>Repair Tasks</Typography>
      <Autocomplete
        options={uniqueTasks}
        getOptionLabel={(option) => option.title}
        onChange={(event, newValue) => { if (newValue) handleAddRepairTask(newValue); }}
        renderInput={(params) => (
          <TextField {...params} label="Search Tasks" variant="outlined" error={!!errors?.repairTasks} />
        )}
      />
      {errors?.repairTasks && <FormHelperText error>{errors.repairTasks}</FormHelperText>}

      <TaskSelectionList
        selectedRepairTasks={selectedRepairTasks}
        handleRemoveRepairTask={handleRemoveRepairTask}
      />

      <FormControlLabel
        sx={{ mt: 1 }}
        control={
          <Checkbox
            checked={!!formData.isRush}
            onChange={(e) => handleInputChange("isRush", e.target.checked)}
          />
        }
        label="Rush job (returned next day, outside delivery schedule)"
      />

      <PromiseDateSuggestion
        estimate={estimate}
        context={context}
        loading={loading}
        error={error}
        value={formData.promiseDate}
        onChange={(v) => handleInputChange("promiseDate", v)}
        deliveryDays={context?.deliveryDays}
        readOnly
      />
    </Box>
  );
}

TasksSection.propTypes = {
  formData: PropTypes.object.isRequired,
  errors: PropTypes.object,
  handleInputChange: PropTypes.func.isRequired,
};
