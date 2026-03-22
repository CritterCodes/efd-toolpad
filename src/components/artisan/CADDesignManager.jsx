'use client';

import React from 'react';
import {
  Container,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Menu,
  MenuItem
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';

import { useCADDesignManager } from '@/hooks/artisan/useCADDesignManager';
import CADDesignTabs from '@/components/business/artisan/CADDesignTabs';
import CADUploadModal from '@/components/business/artisan/CADUploadModal';
import CADViewerModal from '@/components/business/artisan/CADViewerModal';
import CADDetailModal from '@/components/business/artisan/CADDetailModal';

export default function CADDesignManager() {
  const hookData = useCADDesignManager();
  const {
    isCadDesigner,
    activeTab,
    loading,
    error,
    setError,
    designs,
    anchorEl,
    menuDesignId,
    stlDesigns,
    glbDesigns,
    approvedDesigns,
    declinedDesigns,
    uploadDialog,
    detailDialog,
    previewDialog,
    selectedDesign,
    previewFile,
    previewType,
    formData,
    calculating,
    calculatedVolume,
    
    handleTabChange,
    handleOpenUploadDialog,
    handleCloseUploadDialog,
    handleFileChange,
    handleFormChange,
    handleSubmitDesign,
    handleOpenMenu,
    handleCloseMenu,
    handleViewDetails,
    handlePreview,
    handleDeleteDesign,
    setDetailDialog,
    setPreviewDialog
  } = hookData;

  if (!isCadDesigner) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="warning">
          Access denied. This section is only available to CAD designers.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          CAD Design Management
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Upload and manage your STL and GLB design files
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading && !designs.length ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs value={activeTab} onChange={handleTabChange}>
              <Tab label="STL Files (3D Print)" />
              <Tab label="GLB Files (Web Preview)" />
              <Tab label={`✓ Approved (${approvedDesigns.length})`} />
              <Tab label={`✗ Declined (${declinedDesigns.length})`} />
            </Tabs>
          </Box>

          <CADDesignTabs
            activeTab={activeTab}
            stlDesigns={stlDesigns}
            glbDesigns={glbDesigns}
            approvedDesigns={approvedDesigns}
            declinedDesigns={declinedDesigns}
            handleOpenUploadDialog={handleOpenUploadDialog}
            handleOpenMenu={handleOpenMenu}
            handleViewDetails={handleViewDetails}
          />
        </>
      )}

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
      >
        <MenuItem onClick={() => {
          const design = designs.find(d => d._id === menuDesignId);
          if (design) handleViewDetails(design);
        }}>
          <ViewIcon sx={{ mr: 1 }} /> View Details
        </MenuItem>
        <MenuItem onClick={() => {
          const design = designs.find(d => d._id === menuDesignId);
          if (design?.glbUrl) handlePreview(design, 'glb');
          else if (design?.stlUrl) handlePreview(design, 'stl');
        }}>
          <DownloadIcon sx={{ mr: 1 }} /> Preview
        </MenuItem>
        <MenuItem onClick={() => handleDeleteDesign(menuDesignId)} sx={{ color: 'error.main' }}>
          <DeleteIcon sx={{ mr: 1 }} /> Delete
        </MenuItem>
      </Menu>

      <CADUploadModal
        open={uploadDialog}
        onClose={handleCloseUploadDialog}
        formData={formData}
        calculating={calculating}
        calculatedVolume={calculatedVolume}
        loading={loading}
        handleFormChange={handleFormChange}
        handleFileChange={handleFileChange}
        handleSubmitDesign={handleSubmitDesign}
      />

      <CADViewerModal
        open={previewDialog}
        onClose={() => setPreviewDialog(false)}
        previewType={previewType}
        previewFile={previewFile}
      />

      <CADDetailModal
        open={detailDialog}
        onClose={() => setDetailDialog(false)}
        selectedDesign={selectedDesign}
      />
    </Container>
  );
}