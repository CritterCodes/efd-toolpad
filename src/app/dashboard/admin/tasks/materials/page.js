'use client';

import * as React from 'react';
import { useMaterialsManager } from '@/hooks/useMaterialsManager';
import { formatCategoryDisplay } from '@/utils/materials.util';
import {
  MaterialsGrid,
  MaterialDialogNew as MaterialDialog,
  DeleteConfirmDialog,
  EnhancedMaterialsHeader,
  MaterialsCategoryTabs
} from '@/app/components/materials';
import { 
  Box, 
  CircularProgress, 
  Alert, 
  Fab, 
  Tooltip
} from '@mui/material';
import { 
  Add as AddIcon
} from '@mui/icons-material';
import { PageContainer } from '@toolpad/core/PageContainer';

export default function MaterialsPage() {
  // Use the custom hook for all state management
  const {
    // Data
    materials,
    loading,
    error,
    stats,
    materialTabs,
    uniqueSuppliers,
    uniqueMetalTypes,
    uniqueKarats,
    
    // UI State
    selectedTab,
    searchQuery,
    sortBy,
    sortOrder,
    activeStatusFilter,
    supplierFilter,
    metalTypeFilter,
    karatFilter,
    
    // Dialog State
    openDialog,
    editingMaterial,
    deleteDialog,
    loadingStuller,
    updatingPrices,
    formData,
    
    // Actions
    setSelectedTab,
    setSearchQuery,
    setSortBy,
    setSortOrder,
    setActiveStatusFilter,
    setSupplierFilter,
    setMetalTypeFilter,
    setKaratFilter,
    setFormData,
    clearFilters,
    
    // Operations
    handleSubmit,
    handleEdit,
    handleDelete,
    handleUpdatePrices,
    fetchStullerData,
    
    // Dialog Management
    openCreateDialog,
    closeDialog,
    openDeleteDialog,
    closeDeleteDialog,
    
    // Computed
    hasActiveFilters,
    isFiltered
  } = useMaterialsManager();

  // Show loading state
  if (loading) {
    return (
      <PageContainer title="Materials Management">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Materials Management">
      <Box sx={{ pb: 8 }}>
        {/* Error Display */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Enhanced Header with Search and Filters */}
        <EnhancedMaterialsHeader
          stats={stats}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          activeStatusFilter={activeStatusFilter}
          setActiveStatusFilter={setActiveStatusFilter}
          supplierFilter={supplierFilter}
          setSupplierFilter={setSupplierFilter}
          metalTypeFilter={metalTypeFilter}
          setMetalTypeFilter={setMetalTypeFilter}
          karatFilter={karatFilter}
          setKaratFilter={setKaratFilter}
          uniqueSuppliers={uniqueSuppliers}
          uniqueMetalTypes={uniqueMetalTypes}
          uniqueKarats={uniqueKarats}
          sortBy={sortBy}
          setSortBy={setSortBy}
          sortOrder={sortOrder}
          setSortOrder={setSortOrder}
          hasActiveFilters={hasActiveFilters}
          clearFilters={clearFilters}
          onAddNew={openCreateDialog}
          onUpdatePrices={handleUpdatePrices}
          updatingPrices={updatingPrices}
        />

        {/* Category Tabs */}
        <MaterialsCategoryTabs
          materialTabs={materialTabs}
          selectedTab={selectedTab}
          onTabChange={setSelectedTab}
        />

        {/* Results Summary */}
        {isFiltered && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Showing {materials.length} of {stats.total} materials
            {selectedTab !== 'all' && ` in ${formatCategoryDisplay(selectedTab)}`}
          </Alert>
        )}

        {/* Materials Grid */}
        <MaterialsGrid
          materials={materials}
          onEdit={handleEdit}
          onDelete={openDeleteDialog}
          onAddNew={openCreateDialog}
        />

        {/* Floating Action Button */}
        <Tooltip title="Add New Material">
          <Fab
            color="primary"
            aria-label="add material"
            sx={{ position: 'fixed', bottom: 16, right: 16 }}
            onClick={openCreateDialog}
          >
            <AddIcon />
          </Fab>
        </Tooltip>

        {/* Material Create/Edit Dialog */}
        <MaterialDialog
          open={openDialog}
          onClose={closeDialog}
          onSubmit={handleSubmit}
          formData={formData}
          setFormData={setFormData}
          onFetchStullerData={fetchStullerData}
          loadingStuller={loadingStuller}
          editingMaterial={editingMaterial}
        />

        {/* Delete Confirmation Dialog */}
        <DeleteConfirmDialog
          open={deleteDialog.open}
          onClose={closeDeleteDialog}
          onConfirm={handleDelete}
          material={deleteDialog.material}
        />
      </Box>
    </PageContainer>
  );
}
