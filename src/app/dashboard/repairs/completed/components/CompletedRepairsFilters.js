import React from 'react';
import {
    Card,
    CardContent,
    Grid,
    TextField,
    InputAdornment,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Typography
} from '@mui/material';
import {
    Search as SearchIcon,
    FilterList as FilterIcon
} from '@mui/icons-material';

export const CompletedRepairsFilters = ({
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    sortOption,
    setSortOption,
    viewMode,
    setViewMode,
    isMobile
}) => {
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
                                <MenuItem value="all">All Completed</MenuItem>
                                <MenuItem value="completed">Completed</MenuItem>
                                <MenuItem value="picked-up">Picked Up</MenuItem>
                                <MenuItem value="delivered">Delivered</MenuItem>
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
                                <MenuItem value="newest">Completed Date (Newest)</MenuItem>
                                <MenuItem value="oldest">Completed Date (Oldest)</MenuItem>
                                <MenuItem value="submittedDate">Submitted Date</MenuItem>
                                <MenuItem value="status">Status</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={12} md={4}>
                        <FormControl fullWidth size={isMobile ? "small" : "medium"}>
                            <InputLabel>View Mode</InputLabel>
                            <Select
                                value={viewMode}
                                label="View Mode"
                                onChange={(e) => setViewMode(e.target.value)}
                            >
                                <MenuItem value="cards">Card View</MenuItem>
                                <MenuItem value="table">Table View</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                </Grid>
            </CardContent>
        </Card>
    );
};
