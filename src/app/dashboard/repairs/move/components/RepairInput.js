import React from 'react';
import { TextField } from '@mui/material';

const RepairInput = ({ value, onChange, onSubmit, sx = {} }) => {
    const handleKeyPress = (event) => {
        if (event.key === "Enter") {
            onSubmit();
        }
    };

    return (
        <TextField
            fullWidth
            label="Scan or Enter Repair ID"
            value={value}
            onChange={(e) => onChange(e.target.value.trim())}
            onKeyPress={handleKeyPress}
            sx={sx}
        />
    );
};

export default RepairInput;
