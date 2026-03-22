import React from 'react';
import { Box, Grid, TextField, FormControl, InputLabel, Select, MenuItem, Button, CircularProgress, Typography } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

export default function StullerSearchFilters({ searchParams, setSearchParams, handleSearch, handleClear, loading }) {
    return () => (
    <Box sx={{ p: 2 }}>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Search Keywords"
            placeholder="e.g., solder, wire, jump rings..."
            value={searchParams.keywords}
            onChange={(e) => setSearchParams(prev => ({ ...prev, keywords: e.target.value }))}
            InputProps={{
              endAdornment: searchParams.keywords && (
                <IconButton
                  size="small"
                  onClick={() => setSearchParams(prev => ({ ...prev, keywords: '' }))}
                >
                  <ClearIcon />
                </IconButton>
              )
            }}
          />
        </Grid>
        
        <Grid item xs={6}>
          <FormControl fullWidth>
            <InputLabel>Category</InputLabel>
            <Select
              value={searchParams.category}
              label="Category"
              onChange={(e) => setSearchParams(prev => ({ ...prev, category: e.target.value }))}
            >
              <MenuItem value="">All Categories</MenuItem>
              {suggestions.categories.map(cat => (
                <MenuItem key={cat.value} value={cat.value}>
                  {cat.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={6}>
          <FormControl fullWidth>
            <InputLabel>Metal Types</InputLabel>
            <Select
              multiple
              value={searchParams.metalTypes}
              label="Metal Types"
              onChange={(e) => setSearchParams(prev => ({ ...prev, metalTypes: e.target.value }))}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => {
                    const metal = suggestions.metalTypes.find(m => m.value === value);
                    return <Chip key={value} label={metal?.label || value} size="small" />;
                  })}
                </Box>
              )}
            >
              {suggestions.metalTypes.map(metal => (
                <MenuItem key={metal.value} value={metal.value}>
                  {metal.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12}>
          <Box display="flex" justifyContent="space-between" gap={2}>
            <Button
              variant="outlined"
              startIcon={<ClearIcon />}
              onClick={handleClear}
            >
              Clear
            </Button>
            <Button
              variant="contained"
              startIcon={<SearchIcon />}
              onClick={handleSearch}
              disabled={loading}
            >
              {loading ? <CircularProgress size={20} /> : 'Search Stuller'}
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}