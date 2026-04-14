import React from 'react';
import { Grid, TextField, FormControl, InputLabel, Select, MenuItem } from '@mui/material';

const ITEM_TYPES = [
    'Ring', 'Necklace', 'Bracelet', 'Earrings', 'Watch',
    'Pendant', 'Chain', 'Brooch', 'Other'
];

const REPAIR_TYPES = [
    'Sizing', 'Stone Setting', 'Prong Repair', 'Chain Repair',
    'Clasp Repair', 'Cleaning & Polish', 'Stone Replacement',
    'Rhodium Plating', 'Engraving', 'General Repair', 'Other'
];

export default function RepairDetailsSection({ formData, errors, handleInputChange }) {
    return (
        <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
                <FormControl fullWidth required error={!!errors.itemType}>
                    <InputLabel>Item Type</InputLabel>
                    <Select
                        value={formData.itemType}
                        onChange={(e) => handleInputChange('itemType', e.target.value)}
                        label="Item Type"
                    >
                        {ITEM_TYPES.map(type => (
                            <MenuItem key={type} value={type}>{type}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
                <FormControl fullWidth required error={!!errors.repairType}>
                    <InputLabel>Repair Type</InputLabel>
                    <Select
                        value={formData.repairType}
                        onChange={(e) => handleInputChange('repairType', e.target.value)}
                        label="Repair Type"
                    >
                        {REPAIR_TYPES.map(type => (
                            <MenuItem key={type} value={type}>{type}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Grid>
            <Grid item xs={12}>
                <TextField
                    fullWidth
                    required
                    multiline
                    rows={3}
                    label="Repair Description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    error={!!errors.description}
                    helperText={errors.description || 'Describe the specific repair needed'}
                    placeholder="Example: Resize ring from size 7 to size 8..."
                />
            </Grid>
            <Grid item xs={12}>
                <TextField
                    fullWidth
                    multiline
                    rows={2}
                    label="Special Instructions"
                    value={formData.specialInstructions}
                    onChange={(e) => handleInputChange('specialInstructions', e.target.value)}
                    placeholder="Any special requests, rush orders, or important notes..."
                />
            </Grid>
            <Grid item xs={12} sm={6}>
                <TextField
                    fullWidth
                    label="Promise Date"
                    type="date"
                    value={formData.promiseDate}
                    onChange={(e) => handleInputChange('promiseDate', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    helperText="When customer expects completion"
                />
            </Grid>
        </Grid>
    );
}
