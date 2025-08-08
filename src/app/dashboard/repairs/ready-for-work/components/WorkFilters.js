import React from 'react';
import {
    Box,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Button,
    Chip,
    InputAdornment,
    Grid
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import SelectAllIcon from '@mui/icons-material/SelectAll';
import ClearIcon from '@mui/icons-material/Clear';
import { WORK_PRIORITIES, SORT_OPTIONS } from '../constants';

const WorkFilters = ({
    searchQuery,
    onSearchChange,
    priorityFilter,
    onPriorityChange,
    sortOption,
    onSortChange,
    bulkSelectMode,
    onToggleBulkSelect,
    selectedCount = 0,
    totalCount = 0,
    onSelectAll,
    onClearSelection
}) => {
    const getPriorityChipColor = (priority) => {
        switch (priority) {
            case 'rush': return 'error';
            case 'due-today': return 'warning';
            case 'overdue': return 'error';
            case 'due-this-week': return 'info';
            default: return 'default';
        }
    };

    const getPriorityLabel = (value) => {
        return WORK_PRIORITIES.find(p => p.value === value)?.label || 'All Items';
    };

    return (
        <Box sx={{ mb: 3 }}>
            <Grid container spacing={2} alignItems="center">
                {/* Search */}
                <Grid item xs={12} md={4}>
                    <TextField
                        fullWidth
                        placeholder="Search repairs..."
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon />
                                </InputAdornment>
                            )
                        }}
                    />
                </Grid>

                {/* Priority Filter */}
                <Grid item xs={12} sm={6} md={2}>
                    <FormControl fullWidth>
                        <InputLabel>Priority</InputLabel>
                        <Select
                            value={priorityFilter}
                            onChange={(e) => onPriorityChange(e.target.value)}
                            label="Priority"
                            renderValue={(value) => (
                                <Chip 
                                    label={getPriorityLabel(value)}
                                    color={getPriorityChipColor(value)}
                                    size="small"
                                />
                            )}
                        >
                            {WORK_PRIORITIES.map((priority) => (
                                <MenuItem key={priority.value} value={priority.value}>
                                    <Chip 
                                        label={priority.label}
                                        color={getPriorityChipColor(priority.value)}
                                        size="small"
                                        sx={{ mr: 1 }}
                                    />
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>

                {/* Sort */}
                <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth>
                        <InputLabel>Sort By</InputLabel>
                        <Select
                            value={sortOption}
                            onChange={(e) => onSortChange(e.target.value)}
                            label="Sort By"
                        >
                            {SORT_OPTIONS.map((option) => (
                                <MenuItem key={option.value} value={option.value}>
                                    {option.label}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>

                {/* Bulk Actions */}
                <Grid item xs={12} md={3}>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Button
                            variant={bulkSelectMode ? "contained" : "outlined"}
                            onClick={onToggleBulkSelect}
                            startIcon={<PersonAddIcon />}
                            size="small"
                        >
                            Bulk Assign
                        </Button>
                        
                        {bulkSelectMode && (
                            <>
                                <Button
                                    variant="outlined"
                                    onClick={onSelectAll}
                                    startIcon={<SelectAllIcon />}
                                    size="small"
                                    disabled={totalCount === 0}
                                >
                                    All
                                </Button>
                                <Button
                                    variant="outlined"
                                    onClick={onClearSelection}
                                    startIcon={<ClearIcon />}
                                    size="small"
                                    disabled={selectedCount === 0}
                                >
                                    Clear
                                </Button>
                            </>
                        )}
                    </Box>
                    
                    {bulkSelectMode && selectedCount > 0 && (
                        <Box sx={{ mt: 1 }}>
                            <Chip 
                                label={`${selectedCount} selected`}
                                color="primary"
                                size="small"
                            />
                        </Box>
                    )}
                </Grid>
            </Grid>
        </Box>
    );
};

export default WorkFilters;
