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

const UserListFilters = ({
  searchQuery,
  handleSearch,
  sortOrder,
  handleSort,
  filteredUsersCount,
  title
}) => {
  return (
    <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
      <TextField
        placeholder={`Search ${title.toLowerCase()}...`}
        value={searchQuery}
        onChange={handleSearch}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
        sx={{ minWidth: 300 }}
      />
      
      <FormControl sx={{ minWidth: 120 }}>
        <InputLabel>Sort</InputLabel>
        <Select
          value={sortOrder}
          label="Sort"
          onChange={(e) => handleSort(e.target.value)}
        >
          <MenuItem value="asc">A-Z</MenuItem>
          <MenuItem value="desc">Z-A</MenuItem>
        </Select>
      </FormControl>

      <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
        {filteredUsersCount} {filteredUsersCount === 1 ? 'user' : 'users'} found
      </Typography>
    </Box>
  );
};

export default UserListFilters;