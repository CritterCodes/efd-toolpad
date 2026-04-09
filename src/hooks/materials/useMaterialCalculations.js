import { useState, useMemo, useCallback } from 'react';
import {
  MATERIAL_CATEGORIES,
  filterMaterials,
  sortMaterials,
  getUniqueValues,
  generateMaterialStats
} from '@/utils/materials.util';

export const useMaterialCalculations = (materials) => {
  const [selectedTab, setSelectedTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('displayName');
  const [sortOrder, setSortOrder] = useState('asc');
  const [activeStatusFilter, setActiveStatusFilter] = useState('all');
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [metalTypeFilter, setMetalTypeFilter] = useState('all');
  const [karatFilter, setKaratFilter] = useState('all');

  const categorizedMaterials = useMemo(() => {
    const categorized = {
      all: materials,
      ...Object.fromEntries(
        MATERIAL_CATEGORIES.map(category => [
          category,
          materials.filter(material => material.category === category)
        ])
      )
    };
    return categorized;
  }, [materials]);

  const uniqueSuppliers = useMemo(() =>
    getUniqueValues(materials, 'supplier').filter(supplier => supplier && supplier.trim() !== ''),
    [materials]
  );

  const uniqueMetalTypes = useMemo(() =>
    getUniqueValues(materials, 'compatibleMetals').flat().filter(metal => metal && metal.trim() !== ''),
    [materials]
  );

  const uniqueKarats = useMemo(() =>
    getUniqueValues(materials, 'karat').filter(karat => karat && karat.trim() !== ''),
    [materials]
  );

  const filteredMaterials = useMemo(() => {
    const tabMaterials = categorizedMaterials[selectedTab] || [];

    const filters = {
      search: searchQuery,
      isActive: activeStatusFilter === 'all' ? undefined : activeStatusFilter === 'active',
      supplier: supplierFilter === 'all' ? null : supplierFilter,
      metalType: metalTypeFilter === 'all' ? null : metalTypeFilter,
      karat: karatFilter === 'all' ? null : karatFilter
    };

    const filtered = filterMaterials(tabMaterials, filters);
    return sortMaterials(filtered, sortBy, sortOrder);
  }, [categorizedMaterials, selectedTab, searchQuery, activeStatusFilter, supplierFilter, metalTypeFilter, karatFilter, sortBy, sortOrder]);

  const stats = useMemo(() => {
    const currentMaterials = categorizedMaterials[selectedTab] || [];
    return generateMaterialStats(currentMaterials);
  }, [categorizedMaterials, selectedTab]);

  const materialTabs = useMemo(() => [
    {
      value: 'all',
      label: 'All Materials',
      count: categorizedMaterials.all?.length || 0
    },
    ...MATERIAL_CATEGORIES.map(category => ({
      value: category,
      label: category.replace('_', ' ').toUpperCase(),
      count: categorizedMaterials[category]?.length || 0
    }))
  ], [categorizedMaterials]);

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setActiveStatusFilter('all');
    setSupplierFilter('all');
    setMetalTypeFilter('all');
    setKaratFilter('all');
    setSortBy('displayName');
    setSortOrder('asc');
  }, []);

  const hasActiveFilters = searchQuery || activeStatusFilter !== 'all' || supplierFilter !== 'all' ||
                           metalTypeFilter !== 'all' || karatFilter !== 'all' ||
                           sortBy !== 'displayName' || sortOrder !== 'asc';

  const isFiltered = hasActiveFilters || selectedTab !== 'all';

  return {
    selectedTab, setSelectedTab,
    searchQuery, setSearchQuery,
    sortBy, setSortBy,
    sortOrder, setSortOrder,
    activeStatusFilter, setActiveStatusFilter,
    supplierFilter, setSupplierFilter,
    metalTypeFilter, setMetalTypeFilter,
    karatFilter, setKaratFilter,
    filteredMaterials,
    stats,
    materialTabs,
    uniqueSuppliers,
    uniqueMetalTypes,
    uniqueKarats,
    clearFilters,
    hasActiveFilters,
    isFiltered
  };
};