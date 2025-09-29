/**
 * Search and Filter Controls Component
 * Search bar and filter controls following constitutional component standards
 */

import React from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  IconButton
} from '@mui/material';
import { Search, Clear } from '@mui/icons-material';

const CustomTicketsSearchControls = ({
  searchQuery,
  sortOrder,
  onSearchChange,
  onSortChange,
  onClearSearch
}) => {
  return (
    <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
      {/* Search Field */}
      <TextField
        placeholder="Search tickets, clients, or descriptions..."
        value={searchQuery}
        onChange={onSearchChange}
        sx={{ flexGrow: 1, minWidth: 300 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search color="action" />
            </InputAdornment>
          ),
          endAdornment: searchQuery && (
            <InputAdornment position="end">
              <IconButton
                size="small"
                onClick={onClearSearch}
                edge="end"
              >
                <Clear />
              </IconButton>
            </InputAdornment>
          )
        }}
      />

      {/* Sort Control */}
      <FormControl sx={{ minWidth: 150 }}>
        <InputLabel>Sort by</InputLabel>
        <Select
          value={sortOrder}
          onChange={onSortChange}
          label="Sort by"
        >
          <MenuItem value="newest">Newest First</MenuItem>
          <MenuItem value="oldest">Oldest First</MenuItem>
        </Select>
      </FormControl>
    </Box>
  );
};

export default CustomTicketsSearchControls;