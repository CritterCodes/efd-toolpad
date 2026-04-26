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
import { TASKS_UI, taskListSelectMenuProps } from './tasksUi';

export default function TasksFilters({
  searchQuery, setSearchQuery,
  categoryFilter, setCategoryFilter,
  metalTypeFilter, setMetalTypeFilter,
  activeFilter, setActiveFilter,
  sortBy, setSortBy,
  sortOrder, setSortOrder,
  filters
}) {
  return (
    <Box
      sx={{
        backgroundColor: { xs: 'transparent', sm: TASKS_UI.bgPanel },
        border: { xs: 'none', sm: `1px solid ${TASKS_UI.border}` },
        borderRadius: { xs: 0, sm: 3 },
        boxShadow: { xs: 'none', sm: TASKS_UI.shadow },
        p: { xs: 0.5, sm: 2.5 },
        mb: 3
      }}
    >
      <Typography variant="overline" sx={{ color: TASKS_UI.textSecondary, fontWeight: 700, display: 'block', mb: 1.5, letterSpacing: '0.08em' }}>
        Filters
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: '1.5fr repeat(5, minmax(0, 1fr))' }, gap: 1.5 }}>
        <TextField
          placeholder="Search tasks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: TASKS_UI.textMuted }} /></InputAdornment> }}
          size="small"
        />

        <FormControl size="small">
          <InputLabel>Category</InputLabel>
          <Select MenuProps={taskListSelectMenuProps} value={categoryFilter} label="Category" onChange={(e) => setCategoryFilter(e.target.value)}>
            <MenuItem value="">All Categories</MenuItem>
            {filters?.categories?.map((category) => (
              <MenuItem key={category} value={category}>{category.charAt(0).toUpperCase() + category.slice(1)}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small">
          <InputLabel>Metal Type</InputLabel>
          <Select MenuProps={taskListSelectMenuProps} value={metalTypeFilter} label="Metal Type" onChange={(e) => setMetalTypeFilter(e.target.value)}>
            <MenuItem value="">All Metals</MenuItem>
            <MenuItem value="gold">Gold</MenuItem>
            <MenuItem value="silver">Silver</MenuItem>
            <MenuItem value="platinum">Platinum</MenuItem>
            <MenuItem value="mixed">Mixed</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small">
          <InputLabel>Status</InputLabel>
          <Select MenuProps={taskListSelectMenuProps} value={activeFilter} label="Status" onChange={(e) => setActiveFilter(e.target.value)}>
            <MenuItem value="">All</MenuItem>
            <MenuItem value="true">Active</MenuItem>
            <MenuItem value="false">Inactive</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small">
          <InputLabel>Sort By</InputLabel>
          <Select MenuProps={taskListSelectMenuProps} value={sortBy} label="Sort By" onChange={(e) => setSortBy(e.target.value)}>
            <MenuItem value="title">Title</MenuItem>
            <MenuItem value="basePrice">Price</MenuItem>
            <MenuItem value="category">Category</MenuItem>
            <MenuItem value="createdAt">Created</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small">
          <InputLabel>Order</InputLabel>
          <Select MenuProps={taskListSelectMenuProps} value={sortOrder} label="Order" onChange={(e) => setSortOrder(e.target.value)}>
            <MenuItem value="asc">A-Z</MenuItem>
            <MenuItem value="desc">Z-A</MenuItem>
          </Select>
        </FormControl>
      </Box>
    </Box>
  );
}
