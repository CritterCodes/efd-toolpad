/**
 * TaskList.js - Universal task list with filtering and sorting
 * 
 * Comprehensive task list component with metal context filtering,
 * pricing range sorting, and compatibility filtering.
 */

import React, { useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  Pagination,
  IconButton,
  Tooltip,
  InputAdornment,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Sort as SortIcon,
  ViewList as ListIcon,
  ViewModule as GridIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import { UniversalTaskCard, CompactTaskCard } from './TaskCard';
import { PricingService } from '../../services/PricingService';
import { MetalContextService } from '../../services/MetalContextService';
import { useMetalContext } from '../../contexts/MetalContextProvider';

export function UniversalTaskList({ 
  tasks = [], 
  loading = false,
  onTaskEdit,
  onTaskDelete,
  onTaskSelect,
  itemsPerPage = 10,
  allowBulkOperations = false 
}) {
  const { currentMetalContext, getCurrentDisplayName } = useMetalContext();
  
  // UI State
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name'); // name, price, priceRange, compatibility
  const [sortOrder, setSortOrder] = useState('asc');
  const [filterBy, setFilterBy] = useState('all'); // all, compatible, incompatible
  const [viewMode, setViewMode] = useState('card'); // card, compact
  const [currentPage, setCurrentPage] = useState(1);

  // Filter and sort tasks
  const processedTasks = useMemo(() => {
    let filtered = [...tasks];

    // Search filter
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(task => 
        (task.name || '').toLowerCase().includes(lowerSearch) ||
        (task.title || '').toLowerCase().includes(lowerSearch) ||
        (task.description || '').toLowerCase().includes(lowerSearch) ||
        (task.category || '').toLowerCase().includes(lowerSearch)
      );
    }

    // Compatibility filter
    if (filterBy !== 'all') {
      filtered = filtered.filter(task => {
        if (!task.pricing) return filterBy === 'incompatible';
        
        const hasCurrentPrice = PricingService.getPriceForMetal(
          task.pricing,
          currentMetalContext.metalType,
          currentMetalContext.karat
        ) !== null;

        return filterBy === 'compatible' ? hasCurrentPrice : !hasCurrentPrice;
      });
    }

    // Sort tasks
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = (a.name || a.title || '').localeCompare(b.name || b.title || '');
          break;

        case 'price':
          const priceA = a.pricing ? PricingService.getPriceForMetal(
            a.pricing, currentMetalContext.metalType, currentMetalContext.karat
          ) : null;
          const priceB = b.pricing ? PricingService.getPriceForMetal(
            b.pricing, currentMetalContext.metalType, currentMetalContext.karat
          ) : null;
          
          // Handle nulls (incompatible tasks)
          if (priceA === null && priceB === null) comparison = 0;
          else if (priceA === null) comparison = 1; // null goes to end
          else if (priceB === null) comparison = -1;
          else comparison = priceA - priceB;
          break;

        case 'priceRange':
          const statsA = a.pricing ? PricingService.calculatePricingStats(a.pricing) : null;
          const statsB = b.pricing ? PricingService.calculatePricingStats(b.pricing) : null;
          
          const rangeA = statsA ? (statsA.max - statsA.min) : 0;
          const rangeB = statsB ? (statsB.max - statsB.min) : 0;
          
          comparison = rangeA - rangeB;
          break;

        case 'compatibility':
          const supportA = a.pricing ? Object.keys(a.pricing).length : 0;
          const supportB = b.pricing ? Object.keys(b.pricing).length : 0;
          comparison = supportB - supportA; // More supported metals first
          break;

        default:
          comparison = 0;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [tasks, searchTerm, sortBy, sortOrder, filterBy, currentMetalContext]);

  // Pagination
  const totalPages = Math.ceil(processedTasks.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTasks = processedTasks.slice(startIndex, startIndex + itemsPerPage);

  // Statistics
  const stats = useMemo(() => {
    const total = tasks.length;
    const compatible = tasks.filter(task => {
      if (!task.pricing) return false;
      return PricingService.getPriceForMetal(
        task.pricing,
        currentMetalContext.metalType,
        currentMetalContext.karat
      ) !== null;
    }).length;

    return { total, compatible, incompatible: total - compatible };
  }, [tasks, currentMetalContext]);

  const clearFilters = () => {
    setSearchTerm('');
    setFilterBy('all');
    setSortBy('name');
    setSortOrder('asc');
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Loading tasks...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header & Stats */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5">
            Tasks ({processedTasks.length} of {tasks.length})
          </Typography>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip 
              label={`Compatible: ${stats.compatible}`} 
              color="success" 
              variant="outlined" 
            />
            <Chip 
              label={`Incompatible: ${stats.incompatible}`} 
              color="warning" 
              variant="outlined" 
            />
          </Box>
        </Box>

        {/* Current Metal Context */}
        <Alert severity="info" sx={{ mb: 2 }}>
          Viewing tasks for <strong>{getCurrentDisplayName()}</strong>
        </Alert>

        {/* Filters and Controls */}
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
      </Paper>

      {/* Task List */}
      {paginatedTasks.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No tasks found
          </Typography>
          {searchTerm || filterBy !== 'all' ? (
            <Typography variant="body2" color="text.secondary">
              Try adjusting your search or filter criteria
            </Typography>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Create your first universal task to get started
            </Typography>
          )}
        </Paper>
      ) : (
        <Box>
          {viewMode === 'card' ? (
            <Box sx={{ display: 'grid', gap: 2 }}>
              {paginatedTasks.map(task => (
                <UniversalTaskCard
                  key={task._id}
                  task={task}
                  onEdit={onTaskEdit}
                  onDelete={onTaskDelete}
                  onSelect={onTaskSelect}
                />
              ))}
            </Box>
          ) : (
            <Box sx={{ display: 'grid', gap: 1 }}>
              {paginatedTasks.map(task => (
                <CompactTaskCard
                  key={task._id}
                  task={task}
                  onSelect={onTaskSelect}
                />
              ))}
            </Box>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Pagination
                count={totalPages}
                page={currentPage}
                onChange={(e, page) => setCurrentPage(page)}
                color="primary"
                showFirstButton
                showLastButton
              />
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}
