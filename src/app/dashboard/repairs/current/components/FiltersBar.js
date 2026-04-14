import React from 'react';
import {
    Grid,
    Card,
    CardContent,
    TextField,
    InputAdornment,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Typography,
    useMediaQuery,
    useTheme
} from '@mui/material';
import { Search as SearchIcon, FilterList as FilterIcon } from '@mui/icons-material';

const FiltersBar = ({
    searchQuery, setSearchQuery,
    statusFilter, setStatusFilter,
    sortOption, setSortOption
}) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    return (
        <Card sx={{ mb: 3 }}>
            <CardContent>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FilterIcon />
                    Search & Filter
                </Typography>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={6} md={4}>
                        <TextField
                            fullWidth
                            placeholder="Search repairs..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon />
                                    </InputAdornment>
                                ),
                            }}
                            size={isMobile ? "small" : "medium"}
                        />
                    </Grid>
                    <Grid item xs={12} sm={3} md={2}>
                        <FormControl fullWidth size={isMobile ? "small" : "medium"}>
                            <InputLabel>Status</InputLabel>
                            <Select
                                value={statusFilter}
                                label="Status"
                                onChange={(e) => setStatusFilter(e.target.value)}
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
                    </Grid>
                    <Grid item xs={12} sm={3} md={2}>
                        <FormControl fullWidth size={isMobile ? "small" : "medium"}>
                            <InputLabel>Sort By</InputLabel>
                            <Select
                                value={sortOption}
                                label="Sort By"
                                onChange={(e) => setSortOption(e.target.value)}
                            >
                                <MenuItem value="newest">Newest First</MenuItem>
                                <MenuItem value="oldest">Oldest First</MenuItem>
                                <MenuItem value="dueDate">Due Date</MenuItem>
                                <MenuItem value="status">Status</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                </Grid>
            </CardContent>
        </Card>
    );
};

export default FiltersBar;