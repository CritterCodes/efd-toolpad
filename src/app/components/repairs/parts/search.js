// src/app/components/repairs/parts-search.component.js
import React from 'react';
import { TextField } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

const PartsSearch = ({ searchQuery, setSearchQuery }) => {
    return (
        <TextField
            fullWidth
            variant="outlined"
            label="Search Repairs"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1 }} /> }}
            sx={{ mb: 3 }}
        />
    );
};

export default PartsSearch;
