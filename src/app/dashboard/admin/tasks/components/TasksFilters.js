import React from 'react';
import { 
  Card, CardContent, TextField, InputAdornment, 
  FormControl, InputLabel, Select, MenuItem, Box
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';

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
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box sx={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: 2, 
          alignItems: 'center' 
        }}>
          <TextField
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ flexGrow: 1, minWidth: { xs: '100%', sm: '200px' } }}
            size="small"
          />

          <FormControl size="small" sx={{ flexGrow: 1, minWidth: { xs: '100%', sm: '120px' } }}>
            <InputLabel>Category</InputLabel>
            <Select
              value={categoryFilter}
              label="Category"
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <MenuItem value="">All Categories</MenuItem>
              {filters?.categories?.map((category) => (
                <MenuItem key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ flexGrow: 1, minWidth: { xs: '100%', sm: '120px' } }}>
            <InputLabel>Metal Type</InputLabel>
            <Select
              value={metalTypeFilter}
              label="Metal Type"
              onChange={(e) => setMetalTypeFilter(e.target.value)}
            >
              <MenuItem value="">All Metals</MenuItem>
              <MenuItem value="gold">Gold</MenuItem>
              <MenuItem value="silver">Silver</MenuItem>
              <MenuItem value="platinum">Platinum</MenuItem>
              <MenuItem value="mixed">Mixed</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ flexGrow: 1, minWidth: { xs: '100%', sm: '100px' } }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={activeFilter}
              label="Status"
              onChange={(e) => setActiveFilter(e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="true">Active</MenuItem>
              <MenuItem value="false">Inactive</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ flexGrow: 1, minWidth: { xs: '45%', sm: '100px' } }}>
            <InputLabel>Sort By</InputLabel>
            <Select
              value={sortBy}
              label="Sort By"
              onChange={(e) => setSortBy(e.target.value)}
            >
              <MenuItem value="title">Title</MenuItem>
              <MenuItem value="basePrice">Price</MenuItem>
              <MenuItem value="category">Category</MenuItem>
              <MenuItem value="createdAt">Created</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ flexGrow: 1, minWidth: { xs: '45%', sm: '100px' } }}>
            <InputLabel>Order</InputLabel>
            <Select
              value={sortOrder}
              label="Order"
              onChange={(e) => setSortOrder(e.target.value)}
            >
              <MenuItem value="asc">A-Z</MenuItem>
              <MenuItem value="desc">Z-A</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </CardContent>
    </Card>
  );
}
