/**
 * Enhanced Materials Header Component
 * Header with statistics, search, and filtering controls
 */

import * as React from 'react';
import {
  Box,
  Typography,
  Button,
  Stack,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Chip,
  Paper
} from '@mui/material';
import {
  Add as AddIcon,
  Update as UpdateIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  Sort as SortIcon,
  Assessment as StatsIcon,
  CloudDownload as StullerIcon
} from '@mui/icons-material';
import { METAL_OPTIONS, KARAT_OPTIONS } from '@/utils/materials.util';

export default function EnhancedMaterialsHeader({
  stats,
  searchQuery,
  setSearchQuery,
  activeStatusFilter,
  setActiveStatusFilter,
  supplierFilter,
  setSupplierFilter,
  metalTypeFilter,
  setMetalTypeFilter,
  karatFilter,
  setKaratFilter,
  uniqueSuppliers = [],
  uniqueMetalTypes = [],
  uniqueKarats = [],
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  hasActiveFilters,
  clearFilters,
  onAddNew,
  onUpdatePrices,
  updatingPrices = false
}) {
  return (
    <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
      {/* Title and Action Buttons */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box display="flex" alignItems="center" gap={2}>
          <Typography variant="h5" component="h1">
            Materials Management
          </Typography>
          <Chip 
            icon={<StatsIcon />}
            label={`${stats.total} Total`}
            color="primary"
            variant="outlined"
            size="small"
          />
          {stats.totalValue > 0 && (
            <Chip 
              label={`$${stats.totalValue.toFixed(2)} Value`}
              color="success"
              variant="outlined"
              size="small"
            />
          )}
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<UpdateIcon />}
            onClick={onUpdatePrices}
            disabled={updatingPrices}
            size="small"
          >
            {updatingPrices ? 'Updating...' : 'Update Prices'}
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={onAddNew}
          >
            Add Material
          </Button>
        </Stack>
      </Box>

      {/* Search and Filters */}
      <Box display="flex" flexWrap="wrap" gap={2} alignItems="center">
        {/* Search Field */}
        <TextField
          size="small"
          placeholder="Search materials..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: searchQuery && (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setSearchQuery('')}>
                  <ClearIcon />
                </IconButton>
              </InputAdornment>
            )
          }}
          sx={{ minWidth: 250 }}
        />

        {/* Status Filter */}
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={activeStatusFilter}
            label="Status"
            onChange={(e) => setActiveStatusFilter(e.target.value)}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="inactive">Inactive</MenuItem>
          </Select>
        </FormControl>

        {/* Supplier Filter */}
        {uniqueSuppliers.length > 0 && (
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Supplier</InputLabel>
            <Select
              value={supplierFilter}
              label="Supplier"
              onChange={(e) => setSupplierFilter(e.target.value)}
            >
              <MenuItem value="all">All Suppliers</MenuItem>
              {uniqueSuppliers.map(supplier => (
                <MenuItem key={supplier} value={supplier}>
                  {supplier}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {/* Metal Type Filter */}
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Metal Type</InputLabel>
          <Select
            value={metalTypeFilter}
            label="Metal Type"
            onChange={(e) => setMetalTypeFilter(e.target.value)}
          >
            <MenuItem value="all">All Metals</MenuItem>
            {METAL_OPTIONS.map(metal => (
              <MenuItem key={metal.value} value={metal.value}>
                {metal.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Karat/Purity Filter */}
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Karat/Purity</InputLabel>
          <Select
            value={karatFilter}
            label="Karat/Purity"
            onChange={(e) => setKaratFilter(e.target.value)}
          >
            <MenuItem value="all">All Karats</MenuItem>
            {KARAT_OPTIONS.filter(k => k.value).map(karat => (
              <MenuItem key={karat.value} value={karat.value}>
                {karat.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Sort Controls */}
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Sort By</InputLabel>
          <Select
            value={sortBy}
            label="Sort By"
            onChange={(e) => setSortBy(e.target.value)}
          >
            <MenuItem value="displayName">Name</MenuItem>
            <MenuItem value="category">Category</MenuItem>
            <MenuItem value="unitCost">Price</MenuItem>
            <MenuItem value="supplier">Supplier</MenuItem>
            <MenuItem value="createdAt">Created</MenuItem>
            <MenuItem value="updatedAt">Updated</MenuItem>
          </Select>
        </FormControl>

        <IconButton
          size="small"
          onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          color={sortOrder === 'desc' ? 'primary' : 'default'}
          title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
        >
          <SortIcon />
        </IconButton>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <Button
            startIcon={<ClearIcon />}
            onClick={clearFilters}
            size="small"
            variant="outlined"
          >
            Clear Filters
          </Button>
        )}
      </Box>
    </Paper>
  );
}
