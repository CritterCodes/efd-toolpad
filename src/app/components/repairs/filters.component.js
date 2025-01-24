"use client";
import * as React from 'react';
import PropTypes from 'prop-types';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import Button from '@mui/material/Button';

const statusOptions = [
    "NEEDS PICKUP",
    "RECEIVING",
    "NEEDS PARTS",
    "PARTS ORDERED",
    "READY FOR WORK",
    "IN PROGRESS",
    "QUALITY CONTROL",
    "READY FOR PICK-UP",
    "COMPLETED"
];

export default function RepairFilters({ 
    statusFilter, 
    setStatusFilter, 
    searchQuery, 
    setSearchQuery, 
    sortOrder, 
    setSortOrder, 
    onOpenNewRepair 
}) {
    return (
        <Box 
            sx={{ 
                display: 'flex', 
                flexDirection: 'row', 
                gap: 2, 
                mb: 4, 
                alignItems: 'center',
                flexWrap: 'wrap',
                justifyContent: 'space-between'
            }}
        >
            {/* Search Bar */}
            <TextField
                label="Search"
                variant="outlined"
                size="small"
                sx={{ flex: '1 1 auto', minWidth: 200 }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />

            {/* Status Filter */}
            <FormControl variant="outlined" size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Status</InputLabel>
                <Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    label="Status"
                >
                    <MenuItem value="">All</MenuItem>
                    {statusOptions.map((status) => (
                        <MenuItem key={status} value={status}>
                            {status}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>

            {/* Sort by Date */}
            <FormControl variant="outlined" size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Sort by Date</InputLabel>
                <Select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    label="Sort by Date"
                >
                    <MenuItem value="newest">Newest First</MenuItem>
                    <MenuItem value="oldest">Oldest First</MenuItem>
                </Select>
            </FormControl>

            {/* Add Repair Button */}
            <Button 
                variant="contained" 
                onClick={onOpenNewRepair} 
                sx={{
                    whiteSpace: 'nowrap',
                    height: '40px',
                    padding: '8px 16px'
                }}
            >
                + New Repair
            </Button>
        </Box>
    );
}

RepairFilters.propTypes = {
    statusFilter: PropTypes.string.isRequired,
    setStatusFilter: PropTypes.func.isRequired,
    searchQuery: PropTypes.string.isRequired,
    setSearchQuery: PropTypes.func.isRequired,
    sortOrder: PropTypes.string.isRequired,
    setSortOrder: PropTypes.func.isRequired,
    onOpenNewRepair: PropTypes.func.isRequired
};
