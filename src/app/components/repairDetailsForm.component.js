import React from 'react';
import { Box, TextField, MenuItem, Grid } from '@mui/material';

const statuses = [
    "RECEIVING", "NEEDS PARTS", "PARTS ORDERED", "READY FOR WORK", 
    "IN THE OVEN", "QUALITY CONTROL", "READY FOR PICK-UP", "COMPLETED"
];

const metalTypes = [
    "Silver", "White Gold", "Yellow Gold", "Platinum"
];

const goldKarats = ["10k", "14k", "18k"]; // ✅ Karat options for gold

const RepairDetailsForm = ({ repair, onEdit }) => {
    // ✅ Calculate dynamic cost based on repair tasks
    const totalCost = repair.repairTasks?.reduce((acc, task) => acc + parseFloat(task.price || 0) * (task.quantity || 1), 0).toFixed(2);

    // ✅ Helper function to parse the metalType string
    const parseMetalType = (metalType) => {
        if (typeof metalType === 'string') {
            const [type, karat] = metalType.split(' - ');
            return { type, karat: karat || '' };
        }
        return { type: '', karat: '' };
    };

    const parsedMetalType = parseMetalType(repair.metalType);

    // ✅ Flattening metalType into a string when saving and reset karat properly
    const handleMetalTypeChange = (field, value) => {
        if (field === 'type') {
            const isGoldType = value === "White Gold" || value === "Yellow Gold";
            const updatedMetalType = isGoldType
                ? `${value} - ${parsedMetalType.karat || goldKarats[0]}`
                : value;

            onEdit('metalType', updatedMetalType.trim());
        } else if (field === 'karat') {
            onEdit('metalType', `${parsedMetalType.type} - ${value}`);
        }
    };

    return (
        <Box sx={{ flex: 1 }}>
            {/* ✅ Description */}
            <TextField
                label="Description"
                value={repair.description}
                onChange={(e) => onEdit('description', e.target.value)}
                multiline
                fullWidth
                margin="normal"
            />

            {/* ✅ Inline Metal Type and Karat Dropdown */}
            <Grid container spacing={2} marginTop={1}>
                {/* Metal Type */}
                <Grid item xs={6}>
                    <TextField
                        select
                        label="Metal Type"
                        value={parsedMetalType.type}
                        onChange={(e) => handleMetalTypeChange('type', e.target.value)}
                        fullWidth
                    >
                        {metalTypes.map((type) => (
                            <MenuItem key={type} value={type}>
                                {type}
                            </MenuItem>
                        ))}
                    </TextField>
                </Grid>

                {/* Karat (Only if Gold) */}
                {(parsedMetalType.type === "White Gold" || parsedMetalType.type === "Yellow Gold") && (
                    <Grid item xs={6}>
                        <TextField
                            select
                            label="Karat"
                            value={parsedMetalType.karat}
                            onChange={(e) => handleMetalTypeChange('karat', e.target.value)}
                            fullWidth
                        >
                            {goldKarats.map((karat) => (
                                <MenuItem key={karat} value={karat}>
                                    {karat}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>
                )}
            </Grid>

            {/* ✅ Status Dropdown */}
            <TextField
                select
                label="Status"
                value={repair.status}
                onChange={(e) => onEdit('status', e.target.value)}
                fullWidth
                margin="normal"
            >
                {statuses.map((status) => (
                    <MenuItem key={status} value={status}>
                        {status}
                    </MenuItem>
                ))}
            </TextField>

            {/* ✅ Cost (Read-Only) */}
            <TextField
                label="Total Cost"
                value={`$${totalCost}`}
                fullWidth
                margin="normal"
                InputProps={{ readOnly: true }}
            />
        </Box>
    );
};

export default RepairDetailsForm;
