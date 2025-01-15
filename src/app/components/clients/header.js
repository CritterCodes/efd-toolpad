"use client";
import React from 'react';
import { Box, TextField, Button, IconButton, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import SortIcon from '@mui/icons-material/Sort';

/**
 * ✅ Client Header Component
 * - Includes Search, Sort, and Add Client button
 */
const ClientHeader = ({ searchQuery, handleSearch, handleSort, onAddClient }) => {
    return (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
            {/* ✅ Title Section */}
            <Typography variant="h4" fontWeight="bold">
                Client Management
            </Typography>

            {/* ✅ Controls Section */}
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <Button
                    startIcon={<AddIcon />}
                    variant="contained"
                    onClick={onAddClient}
                >
                    Add Client
                </Button>
                <TextField
                    placeholder="Search clients..."
                    variant="outlined"
                    size="small"
                    value={searchQuery}
                    onChange={handleSearch}
                    InputProps={{
                        startAdornment: <SearchIcon />,
                    }}
                />
                <IconButton onClick={handleSort}>
                    <SortIcon />
                </IconButton>
            </Box>
        </Box>
    );
};

export default ClientHeader;
