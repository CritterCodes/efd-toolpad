import React from 'react';
import {
    Box,
    TextField,
    InputAdornment,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Typography
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { REPAIRS_UI, repairsMenuProps } from '@/app/dashboard/repairs/components/repairsUi';

const FiltersBar = ({
    searchQuery, setSearchQuery,
    statusFilter, setStatusFilter,
    sortOption, setSortOption
}) => {
    return (
        <Box
            sx={{
                backgroundColor: { xs: 'transparent', sm: REPAIRS_UI.bgPanel },
                border: { xs: 'none', sm: `1px solid ${REPAIRS_UI.border}` },
                borderRadius: { xs: 0, sm: 3 },
                boxShadow: { xs: 'none', sm: REPAIRS_UI.shadow },
                p: { xs: 0.5, sm: 2.5 },
                mb: 3
            }}
        >
            <Typography variant="overline" sx={{ color: REPAIRS_UI.textSecondary, fontWeight: 700, display: 'block', mb: 1.5, letterSpacing: '0.08em' }}>
                Filters
            </Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1.5fr) repeat(2, minmax(0, 1fr))' }, gap: 1.5 }}>
                <TextField
                    fullWidth
                    placeholder="Search repairs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    size="small"
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon sx={{ color: REPAIRS_UI.textMuted }} />
                            </InputAdornment>
                        ),
                    }}
                />

                <FormControl fullWidth size="small">
                    <InputLabel>Status</InputLabel>
                    <Select
                        value={statusFilter}
                        label="Status"
                        onChange={(e) => setStatusFilter(e.target.value)}
                        MenuProps={repairsMenuProps}
                    >
                        <MenuItem value="all">All Current</MenuItem>
                        <MenuItem value="RECEIVING">Receiving</MenuItem>
                        <MenuItem value="NEEDS PARTS">Needs Parts</MenuItem>
                        <MenuItem value="PARTS ORDERED">Parts Ordered</MenuItem>
                        <MenuItem value="READY FOR WORK">Ready for Work</MenuItem>
                        <MenuItem value="IN PROGRESS">In Progress</MenuItem>
                        <MenuItem value="QUALITY CONTROL">Quality Control</MenuItem>
                        <MenuItem value="READY FOR PICK-UP">Ready for Pickup</MenuItem>
                    </Select>
                </FormControl>

                <FormControl fullWidth size="small">
                    <InputLabel>Sort By</InputLabel>
                    <Select
                        value={sortOption}
                        label="Sort By"
                        onChange={(e) => setSortOption(e.target.value)}
                        MenuProps={repairsMenuProps}
                    >
                        <MenuItem value="newest">Newest First</MenuItem>
                        <MenuItem value="oldest">Oldest First</MenuItem>
                        <MenuItem value="dueDate">Due Date</MenuItem>
                        <MenuItem value="status">Status</MenuItem>
                    </Select>
                </FormControl>
            </Box>
        </Box>
    );
};

export default FiltersBar;
