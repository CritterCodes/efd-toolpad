/**
 * Constitutional Custom Tickets Page
 * Main page component following constitutional architecture (<300 lines)
 * Uses hooks and components for separation of concerns
 */

'use client';

import React, { useState } from 'react';
import { Box, Typography, Button, Pagination } from '@mui/material';
import { Add } from '@mui/icons-material';
import { useSession } from 'next-auth/react';

// Constitutional imports - hooks and components
import { useCustomTicketsData } from '@/hooks/custom-tickets/useCustomTicketsData';
import { usePagination } from '@/hooks/custom-tickets/usePagination';
import { useSearchAndFilter } from '@/hooks/custom-tickets/useSearchAndFilter';
import CustomTicketsGrid from '@/app/components/custom-tickets/CustomTicketsGrid';
import CustomTicketsSearchControls from '@/app/components/custom-tickets/CustomTicketsSearchControls';
import CustomTicketSummary from '@/app/components/custom-tickets/summary.component';
import CustomTicketFilters from '@/app/components/custom-tickets/filters.component';
import NewCustomTicketStepper from '@/app/components/custom-tickets/newCustomTicketStepper.component';

export default function CustomTicketsPage() {
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'admin' || session?.user?.role === 'staff';

  // Use constitutional hooks for data management
  const {
    tickets,
    loading,
    error,
    summary,
    filters,
    setFilters,
    refreshData,
    applySearchAndSort
  } = useCustomTicketsData();

  // Search and filter hook
  const {
    searchQuery,
    sortOrder,
    handleSearchChange,
    handleSortChange,
    clearSearch
  } = useSearchAndFilter(applySearchAndSort);

  // Pagination hook
  const {
    currentPage,
    totalPages,
    paginatedItems,
    handlePageChange,
    resetPagination
  } = usePagination(tickets, 6);

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
    resetPagination();
  };

  const handleNewTicket = () => {
    setIsNewTicketOpen(true);
  };

  const handleCloseNewTicket = () => {
    setIsNewTicketOpen(false);
  };

  const handleTicketCreated = () => {
    setIsNewTicketOpen(false);
    refreshData();
    resetPagination();
  };

  return (
    <Box sx={{ pb: 10 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={600} sx={{ color: '#D1D5DB' }}>
            {isAdmin ? 'Custom Tickets' : 'My Custom Tickets'}
          </Typography>
          <Typography variant="body2" sx={{ color: '#9CA3AF', mt: 0.5 }}>
            {isAdmin ? 'View and manage all custom jewelry requests from all customers.' : 'Manage custom jewelry requests assigned to you.'}
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<Add />}
          onClick={handleNewTicket}
          sx={{ color: '#D4AF37', borderColor: '#D4AF37', flexShrink: 0 }}
        >
          New Ticket
        </Button>
      </Box>
      <Box sx={{ maxWidth: 1200 }}>

        {/* Summary Section */}
        {summary && (
          <Box sx={{ mb: 4 }}>
            <CustomTicketSummary summary={summary} />
          </Box>
        )}

        {/* Filters */}
        <Box sx={{ mb: 3 }}>
          <CustomTicketFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
          />
        </Box>

        {/* Search Controls */}
        <CustomTicketsSearchControls
          searchQuery={searchQuery}
          sortOrder={sortOrder}
          onSearchChange={handleSearchChange}
          onSortChange={handleSortChange}
          onClearSearch={clearSearch}
        />

        {/* Results Info */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary">
            Showing {paginatedItems.length} of {tickets.length} tickets
            {searchQuery && ` for "${searchQuery}"`}
          </Typography>
        </Box>

        {/* Tickets Grid */}
        <CustomTicketsGrid
          tickets={paginatedItems}
          loading={loading}
          error={error}
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <Pagination
              count={totalPages}
              page={currentPage}
              onChange={handlePageChange}
              color="primary"
              size="large"
              showFirstButton
              showLastButton
            />
          </Box>
        )}

        {/* New Ticket Dialog */}
        <NewCustomTicketStepper
          open={isNewTicketOpen}
          onClose={handleCloseNewTicket}
          onSuccess={handleTicketCreated}
        />
      </Box>
    </Box>
  );
}
