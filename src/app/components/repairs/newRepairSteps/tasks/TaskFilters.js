
import React from 'react';
import { Box, FormControl, InputLabel, Select, MenuItem } from '@mui/material';

export default function TaskFilters({ categoryFilter, setCategoryFilter, metalTypeFilter, setMetalTypeFilter }) {
    return (
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="repair">Repair</MenuItem>
                    <MenuItem value="custom">Custom</MenuItem>
                </Select>
            </FormControl>
            <FormControl fullWidth>
                <InputLabel>Metal Type</InputLabel>
                <Select value={metalTypeFilter} onChange={(e) => setMetalTypeFilter(e.target.value)}>
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="gold">Gold</MenuItem>
                    <MenuItem value="silver">Silver</MenuItem>
                </Select>
            </FormControl>
        </Box>
    );
}
