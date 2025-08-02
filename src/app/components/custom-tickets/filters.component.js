"use client";
import * as React from 'react';
import PropTypes from 'prop-types';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import Button from '@mui/material/Button';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';

const typeOptions = [
    { value: 'repair', label: 'Repair' },
    { value: 'custom-design', label: 'Custom Design' }
];

const statusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'in-progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' }
];

const paymentOptions = [
    { value: 'true', label: 'Yes' },
    { value: 'false', label: 'No' }
];

const cardPaymentStatusOptions = [
    { value: 'unpaid', label: 'Unpaid' },
    { value: 'partial', label: 'Partial' },
    { value: 'paid', label: 'Paid' }
];

export default function CustomTicketFilters({ 
    filters,
    setFilters,
    searchQuery, 
    setSearchQuery, 
    sortOrder, 
    setSortOrder, 
    onOpenNewTicket,
    onClearFilters 
}) {
    const activeFiltersCount = Object.values(filters).filter(value => 
        value !== '' && value !== false
    ).length;

    return (
        <Box 
            sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: 2, 
                mb: 4 
            }}
        >
            {/* Top Row - Search and New Ticket Button */}
            <Box 
                sx={{ 
                    display: 'flex', 
                    flexDirection: 'row', 
                    gap: 2, 
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between'
                }}
            >
                {/* Search Bar */}
                <TextField
                    label="Search tickets..."
                    variant="outlined"
                    size="small"
                    sx={{ flex: '1 1 auto', minWidth: 250 }}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />

                {/* Sort by Date */}
                <FormControl variant="outlined" size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>Sort by Date</InputLabel>
                    <Select
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value)}
                        label="Sort by Date"
                    >
                        <MenuItem value="newest">Newest First</MenuItem>
                        <MenuItem value="oldest">Oldest First</MenuItem>
                    </Select>
                </FormControl>

                {/* Add Ticket Button */}
                <Button 
                    variant="contained" 
                    onClick={onOpenNewTicket} 
                    sx={{
                        whiteSpace: 'nowrap',
                        height: '40px',
                        padding: '8px 16px'
                    }}
                >
                    + New Custom Ticket
                </Button>
            </Box>

            {/* Filter Row */}
            <Box 
                sx={{ 
                    display: 'flex', 
                    flexDirection: 'row', 
                    gap: 2, 
                    alignItems: 'center',
                    flexWrap: 'wrap'
                }}
            >
                {/* Type Filter */}
                <FormControl variant="outlined" size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>Type</InputLabel>
                    <Select
                        value={filters.type}
                        onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                        label="Type"
                    >
                        <MenuItem value="">All Types</MenuItem>
                        {typeOptions.map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                                {option.label}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                {/* Status Filter */}
                <FormControl variant="outlined" size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>Status</InputLabel>
                    <Select
                        value={filters.status}
                        onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                        label="Status"
                    >
                        <MenuItem value="">All Statuses</MenuItem>
                        {statusOptions.map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                                {option.label}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                {/* Payment Received Filter */}
                <FormControl variant="outlined" size="small" sx={{ minWidth: 140 }}>
                    <InputLabel>Payment Received</InputLabel>
                    <Select
                        value={filters.paymentReceived}
                        onChange={(e) => setFilters(prev => ({ ...prev, paymentReceived: e.target.value }))}
                        label="Payment Received"
                    >
                        <MenuItem value="">All</MenuItem>
                        {paymentOptions.map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                                {option.label}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                {/* Card Payment Status Filter */}
                <FormControl variant="outlined" size="small" sx={{ minWidth: 140 }}>
                    <InputLabel>Card Payment</InputLabel>
                    <Select
                        value={filters.cardPaymentStatus}
                        onChange={(e) => setFilters(prev => ({ ...prev, cardPaymentStatus: e.target.value }))}
                        label="Card Payment"
                    >
                        <MenuItem value="">All</MenuItem>
                        {cardPaymentStatusOptions.map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                                {option.label}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                {/* Shopify Orders Checkbox */}
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={filters.hasShopifyOrders}
                            onChange={(e) => setFilters(prev => ({ ...prev, hasShopifyOrders: e.target.checked }))}
                        />
                    }
                    label="Has Shopify Orders"
                />

                {/* Clear Filters Button */}
                <Button 
                    variant="outlined" 
                    onClick={onClearFilters}
                    disabled={activeFiltersCount === 0}
                    sx={{ minWidth: 100 }}
                >
                    Clear Filters
                    {activeFiltersCount > 0 && (
                        <Chip 
                            label={activeFiltersCount} 
                            size="small" 
                            sx={{ ml: 1, height: 20, fontSize: '0.7rem' }}
                        />
                    )}
                </Button>
            </Box>
        </Box>
    );
}

CustomTicketFilters.propTypes = {
    filters: PropTypes.object.isRequired,
    setFilters: PropTypes.func.isRequired,
    searchQuery: PropTypes.string.isRequired,
    setSearchQuery: PropTypes.func.isRequired,
    sortOrder: PropTypes.string.isRequired,
    setSortOrder: PropTypes.func.isRequired,
    onOpenNewTicket: PropTypes.func.isRequired,
    onClearFilters: PropTypes.func.isRequired
};
