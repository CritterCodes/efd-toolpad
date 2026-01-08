'use client';

import * as React from 'react';
import { useProcessesManager } from '@/hooks/useProcessesManager';
import { formatCategoryDisplay } from '@/utils/processes.util';
import {
  ProcessesGrid,
  ProcessDialog,
  DeleteConfirmDialog,
  EnhancedProcessesHeader,
  ProcessesCategoryTabs
} from '@/app/components/processes';
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

export default function ProcessesPage() {
  // Use the custom hook for all state management
  const {
    // Data
    processes,
    loading,
    error,
    stats,
    processTabs,
    availableMaterials,
    uniqueSkillLevels,
    uniqueMetalTypes,
    uniqueKarats,
    
    // UI State
    selectedTab,
    searchQuery,
    sortBy,
    sortOrder,
    activeStatusFilter,
    skillLevelFilter,
    metalTypeFilter,
    karatFilter,
    
    // Dialog State
    openDialog,
    editingProcess,
    deleteDialog,
    updatingPrices,
    formData,
    selectedMaterial,
    materialQuantity,
    
    // Actions
    setSelectedTab,
    setSearchQuery,
    setSortBy,
    setSortOrder,
    setActiveStatusFilter,
    setSkillLevelFilter,
    setMetalTypeFilter,
    setKaratFilter,
    setFormData,
    setSelectedMaterial,
    setMaterialQuantity,
    clearFilters,
    
    // Operations
    handleSubmit,
    handleEdit,
    handleDelete,
    handleUpdatePrices,
    handleAddMaterial,
    handleRemoveMaterial,
    
    // Dialog Management
    openCreateDialog,
    closeDialog,
    openDeleteDialog,
    closeDeleteDialog,
    
    // Computed
    hasActiveFilters,
    isFiltered
  } = useProcessesManager();

  // Show loading state
  if (loading) {
    return (
      <PageContainer title="Processes Management">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Processes Management">
      <Box sx={{ pb: 8 }}>
        {/* Error Display */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Enhanced Header with Search and Filters */}
        <EnhancedProcessesHeader
          stats={stats}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          activeStatusFilter={activeStatusFilter}
          setActiveStatusFilter={setActiveStatusFilter}
          skillLevelFilter={skillLevelFilter}
          setSkillLevelFilter={setSkillLevelFilter}
          metalTypeFilter={metalTypeFilter}
          setMetalTypeFilter={setMetalTypeFilter}
          karatFilter={karatFilter}
          setKaratFilter={setKaratFilter}
          uniqueSkillLevels={uniqueSkillLevels}
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
        <ProcessesCategoryTabs
          processTabs={processTabs}
          selectedTab={selectedTab}
          onTabChange={setSelectedTab}
        />

        {/* Results Summary */}
        {isFiltered && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Showing {processes.length} of {stats.total} processes
            {selectedTab !== 'all' && ` in ${formatCategoryDisplay(selectedTab)}`}
          </Alert>
        )}

        {/* Processes Grid */}
        <ProcessesGrid
          processes={processes}
          onEdit={handleEdit}
          onDelete={openDeleteDialog}
          onAddNew={openCreateDialog}
        />

        {/* Floating Action Button */}
        <Tooltip title="Add New Process">
          <Fab
            color="primary"
            aria-label="add process"
            sx={{ position: 'fixed', bottom: 16, right: 16 }}
            onClick={openCreateDialog}
          >
            <AddIcon />
          </Fab>
        </Tooltip>

        {/* Process Create/Edit Dialog */}
        <ProcessDialog
          open={openDialog}
          onClose={closeDialog}
          onSubmit={handleSubmit}
          formData={formData}
          setFormData={setFormData}
          availableMaterials={availableMaterials}
          editingProcess={editingProcess}
          selectedMaterial={selectedMaterial}
          setSelectedMaterial={setSelectedMaterial}
          materialQuantity={materialQuantity}
          setMaterialQuantity={setMaterialQuantity}
          onAddMaterial={handleAddMaterial}
          onRemoveMaterial={handleRemoveMaterial}
        />

        {/* Delete Confirmation Dialog */}
        <DeleteConfirmDialog
          open={deleteDialog.open}
          onClose={closeDeleteDialog}
          onConfirm={handleDelete}
          process={deleteDialog.process}
        />
      </Box>
    </PageContainer>
  );
}
