/**
 * Search and Filter Management Hook
 * Handles search and filtering state for custom tickets
 */

import { useState, useEffect } from 'react';

export const useSearchAndFilter = (onApply) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Apply search and sorting when debounced query or sort order changes
  useEffect(() => {
    if (onApply) {
      onApply(debouncedSearchQuery, sortOrder);
    }
  }, [debouncedSearchQuery, sortOrder, onApply]);

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };

  const handleSortChange = (event) => {
    setSortOrder(event.target.value);
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  return {
    searchQuery,
    sortOrder,
    handleSearchChange,
    handleSortChange,
    clearSearch
  };
};