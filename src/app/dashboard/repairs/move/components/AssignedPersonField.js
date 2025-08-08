import React from 'react';
import { TextField } from '@mui/material';
import { TRACKABLE_STATUSES, STATUS_FIELD_LABELS, STATUS_HELP_TEXT } from '../constants';

const AssignedPersonField = ({ status, value, onChange, sx = {} }) => {
    if (!TRACKABLE_STATUSES.includes(status)) {
        return null;
    }

    return (
        <TextField
            fullWidth
            label={STATUS_FIELD_LABELS[status] || "Assigned Person"}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            sx={sx}
            helperText={STATUS_HELP_TEXT[status] || "Optional: Track who is responsible for this status"}
            placeholder="Enter name (optional)"
        />
    );
};

export default AssignedPersonField;
