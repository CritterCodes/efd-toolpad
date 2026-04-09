import { useState, useMemo } from 'react';
import { PricingService } from '../../services/PricingService';

export const useTaskList = ({
  tasks = [],
  itemsPerPage = 10,
  currentMetalContext
}) => {
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
          currentMetalContext?.metalType,
          currentMetalContext?.karat
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
          const priceA = a.pricing && currentMetalContext ? PricingService.getPriceForMetal(
            a.pricing, currentMetalContext.metalType, currentMetalContext.karat
          ) : null;
          const priceB = b.pricing && currentMetalContext ? PricingService.getPriceForMetal(
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
      if (!task.pricing || !currentMetalContext) return false;
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

  return {
    searchTerm, setSearchTerm,
    sortBy, setSortBy,
    sortOrder, setSortOrder,
    filterBy, setFilterBy,
    viewMode, setViewMode,
    currentPage, setCurrentPage,
    processedTasks,
    paginatedTasks,
    totalPages,
    stats,
    clearFilters
  };
};
