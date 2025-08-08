import React from 'react';
import { TextField, InputAdornment } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

const PartsSearchBar = ({ searchQuery, onSearchChange, placeholder = "Search repairs..." }) => {
    return (
        <TextField
            fullWidth
            variant="outlined"
            label="Search Repairs"
            placeholder={placeholder}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            InputProps={{
                startAdornment: (
                    <InputAdornment position="start">
                        <SearchIcon />
                    </InputAdornment>
                ),
            }}
            sx={{ mb: 3 }}
        />
    );
};

export default PartsSearchBar;
