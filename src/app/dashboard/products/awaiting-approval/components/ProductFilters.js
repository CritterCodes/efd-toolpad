import React from 'react';
import {
    Grid,
    Paper,
    TextField,
    InputAdornment,
    FormControl,
    InputLabel,
    Select,
    MenuItem
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { REPAIRS_UI, repairsMenuProps } from '@/app/dashboard/repairs/components/repairsUi';

export default function ProductFilters({
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    artisanFilter,
    setArtisanFilter,
    uniqueStatuses,
    uniqueArtisans
}) {
    return (
        <Paper sx={{ p: 3, mb: 3, backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' }}>
            <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                    <TextField
                        fullWidth
                        placeholder="Search by title or artisan..."
                        size="small"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon sx={{ color: REPAIRS_UI.textSecondary }} />
                                </InputAdornment>
                            )
                        }}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                    <FormControl fullWidth size="small">
                        <InputLabel>Status</InputLabel>
                        <Select
                            value={statusFilter}
                            label="Status"
                            onChange={(e) => setStatusFilter(e.target.value)}
                            MenuProps={repairsMenuProps}
                        >
                            <MenuItem value="all">All Statuses</MenuItem>
                            {uniqueStatuses.map(status => (
                                <MenuItem key={status} value={status}>
                                    {status.replace(/_/g, ' ').toUpperCase()}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                    <FormControl fullWidth size="small">
                        <InputLabel>Artisan</InputLabel>
                        <Select
                            value={artisanFilter}
                            label="Artisan"
                            onChange={(e) => setArtisanFilter(e.target.value)}
                            MenuProps={repairsMenuProps}
                        >
                            <MenuItem value="all">All Artisans</MenuItem>
                            {Object.entries(uniqueArtisans).map(([id, name]) => (
                                <MenuItem key={id} value={id}>
                                    {name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>
            </Grid>
        </Paper>
    );
}
