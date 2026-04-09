import React from 'react';
import {
  Grid,
  TextField,
  InputAdornment,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  ToggleButtonGroup,
  ToggleButton,
  Tooltip
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  ViewList as ListIcon,
  ViewModule as GridIcon
} from '@mui/icons-material';

export function TaskListFilters({
  searchTerm,
  setSearchTerm,
  filterBy,
  setFilterBy,
  setCurrentPage,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  viewMode,
  setViewMode,
  clearFilters
}) {
  return (
    <Grid container spacing={2} alignItems="center">
      {/* Search */}
      <Grid item xs={12} sm={4}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search tasks..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: searchTerm && (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setSearchTerm('')}>
                  <ClearIcon />
                </IconButton>
              </InputAdornment>
            )
          }}
        />
      </Grid>

      {/* Filter */}
      <Grid item xs={12} sm={2}>
        <FormControl fullWidth size="small">
          <InputLabel>Filter</InputLabel>
          <Select
            value={filterBy}
            label="Filter"
            onChange={(e) => {
              setFilterBy(e.target.value);
              setCurrentPage(1);
            }}
          >
            <MenuItem value="all">All Tasks</MenuItem>
            <MenuItem value="compatible">Compatible</MenuItem>
            <MenuItem value="incompatible">Incompatible</MenuItem>
          </Select>
        </FormControl>
      </Grid>

      {/* Sort */}
      <Grid item xs={12} sm={2}>
        <FormControl fullWidth size="small">
          <InputLabel>Sort By</InputLabel>
          <Select
            value={sortBy}
            label="Sort By"
            onChange={(e) => setSortBy(e.target.value)}
          >
            <MenuItem value="name">Name</MenuItem>
            <MenuItem value="price">Current Price</MenuItem>
            <MenuItem value="priceRange">Price Range</MenuItem>
            <MenuItem value="compatibility">Compatibility</MenuItem>
          </Select>
        </FormControl>
      </Grid>

      <Grid item xs={12} sm={2}>
        <FormControl fullWidth size="small">
          <InputLabel>Order</InputLabel>
          <Select
            value={sortOrder}
            label="Order"
            onChange={(e) => setSortOrder(e.target.value)}
          >
            <MenuItem value="asc">Ascending</MenuItem>
            <MenuItem value="desc">Descending</MenuItem>
          </Select>
        </FormControl>
      </Grid>

      {/* View Mode */}
      <Grid item xs={12} sm={2}>
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(e, newMode) => newMode && setViewMode(newMode)}
            size="small"
          >
            <ToggleButton value="card">
              <GridIcon />
            </ToggleButton>
            <ToggleButton value="compact">
              <ListIcon />
            </ToggleButton>
          </ToggleButtonGroup>

          <Tooltip title="Clear all filters">
            <IconButton size="small" onClick={clearFilters}>
              <ClearIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Grid>
    </Grid>
  );
}
