/**
 * Enhanced header component for processes management
 * Provides search, filtering, statistics, and action controls
 */

import * as React from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Button,
  Chip,
  Stack,
  Tooltip
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  Sort as SortIcon,
  Update as UpdateIcon,
  Add as AddIcon,
  Assessment as StatsIcon
} from '@mui/icons-material';
import { SKILL_LEVELS, METAL_TYPES, KARAT_OPTIONS } from '@/utils/processes.util';

export function EnhancedProcessesHeader({
  stats,
  searchQuery,
  setSearchQuery,
  activeStatusFilter,
  setActiveStatusFilter,
  skillLevelFilter,
  setSkillLevelFilter,
  metalTypeFilter,
  setMetalTypeFilter,
  karatFilter,
  setKaratFilter,
  uniqueSkillLevels,
  uniqueMetalTypes,
  uniqueKarats,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  hasActiveFilters,
  clearFilters,
  onAddNew,
  onUpdatePrices,
  updatingPrices
}) {
  return (
    <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box display="flex" alignItems="center" gap={2}>
          <Typography variant="h5" component="h1">
            Processes Management
          </Typography>
          <Chip 
            icon={<StatsIcon />}
            label={`${stats.total} Total`}
            color="primary"
            variant="outlined"
            size="small"
          />
          <Chip 
            label={`${stats.active} Active`}
            color="success"
            variant="outlined"
            size="small"
          />
          {stats.inactive > 0 && (
            <Chip 
              label={`${stats.inactive} Inactive`}
              color="default"
              variant="outlined"
              size="small"
            />
          )}
          {stats.totalValue > 0 && (
            <Chip 
              label={`$${stats.totalValue.toFixed(2)} Total Value`}
              color="info"
              variant="outlined"
              size="small"
            />
          )}
        </Box>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Update all process prices based on current settings">
            <Button
              variant="outlined"
              startIcon={<UpdateIcon />}
              onClick={onUpdatePrices}
              disabled={updatingPrices}
              size="small"
            >
              {updatingPrices ? 'Updating...' : 'Update Prices'}
            </Button>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={onAddNew}
          >
            Add Process
          </Button>
        </Stack>
      </Box>

      {/* Search and Filters */}
      <Box display="flex" flexWrap="wrap" gap={2} alignItems="center">
        {/* Search Field */}
        <TextField
          size="small"
          placeholder="Search processes..."
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

        {/* Skill Level Filter */}
        {uniqueSkillLevels.length > 0 && (
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Skill Level</InputLabel>
            <Select
              value={skillLevelFilter}
              label="Skill Level"
              onChange={(e) => setSkillLevelFilter(e.target.value)}
            >
              <MenuItem value="all">All Levels</MenuItem>
              {SKILL_LEVELS.map(level => (
                <MenuItem key={level.value} value={level.value}>
                  {level.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {/* Metal Type Filter */}
        {uniqueMetalTypes.length > 0 && (
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Metal Type</InputLabel>
            <Select
              value={metalTypeFilter}
              label="Metal Type"
              onChange={(e) => setMetalTypeFilter(e.target.value)}
            >
              <MenuItem value="all">All Metals</MenuItem>
              {METAL_TYPES.map(metal => (
                <MenuItem key={metal.value} value={metal.value}>
                  {metal.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {/* Karat Filter */}
        {uniqueKarats.length > 0 && (
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Karat</InputLabel>
            <Select
              value={karatFilter}
              label="Karat"
              onChange={(e) => setKaratFilter(e.target.value)}
            >
              <MenuItem value="all">All Karats</MenuItem>
              {KARAT_OPTIONS.map(karat => (
                <MenuItem key={karat.value} value={karat.value}>
                  {karat.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {/* Sort By */}
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Sort By</InputLabel>
          <Select
            value={sortBy}
            label="Sort By"
            onChange={(e) => setSortBy(e.target.value)}
          >
            <MenuItem value="name">Name</MenuItem>
            <MenuItem value="category">Category</MenuItem>
            <MenuItem value="skillLevel">Skill Level</MenuItem>
            <MenuItem value="totalCost">Total Cost</MenuItem>
            <MenuItem value="laborCost">Labor Cost</MenuItem>
            <MenuItem value="materialsCost">Materials Cost</MenuItem>
            <MenuItem value="timeRequired">Time Required</MenuItem>
            <MenuItem value="createdAt">Created</MenuItem>
            <MenuItem value="updatedAt">Updated</MenuItem>
          </Select>
        </FormControl>

        {/* Sort Order Toggle */}
        <Tooltip title={`Sort ${sortOrder === 'asc' ? 'Ascending' : 'Descending'}`}>
          <IconButton
            size="small"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            color={sortOrder === 'desc' ? 'primary' : 'default'}
          >
            <SortIcon />
          </IconButton>
        </Tooltip>

        {/* Clear Filters */}
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
