import React from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  Grid
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import CADDesignCard from './CADDesignCard';

export default function CADDesignTabs({
  activeTab,
  stlDesigns,
  glbDesigns,
  approvedDesigns,
  declinedDesigns,
  handleOpenUploadDialog,
  handleOpenMenu,
  handleViewDetails
}) {
  switch (activeTab) {
    case 0:
      return (
        <Box>
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">STL Files & Volume</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenUploadDialog}
            >
              Upload STL
            </Button>
          </Box>
          {stlDesigns.length === 0 ? (
            <Alert severity="info">No STL files uploaded yet. Click "Upload STL" to get started.</Alert>
          ) : (
            <Grid container spacing={2}>
              {stlDesigns.map(design => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={design._id}>
                  <CADDesignCard design={design} onOpenMenu={handleOpenMenu} />
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      );
    case 1:
      return (
        <Box>
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">GLB Files (3D Preview)</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenUploadDialog}
            >
              Upload GLB
            </Button>
          </Box>
          {glbDesigns.length === 0 ? (
            <Alert severity="info">No GLB files uploaded yet. Click "Upload GLB" to get started.</Alert>
          ) : (
            <Grid container spacing={2}>
              {glbDesigns.map(design => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={design._id}>
                  <CADDesignCard design={design} onOpenMenu={handleOpenMenu} />
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      );
    case 2:
      return (
        <Box>
          <Typography variant="h6" sx={{ mb: 3 }}>
            ✓ Approved Designs ({approvedDesigns.length})
          </Typography>
          {approvedDesigns.length === 0 ? (
            <Alert severity="info">No approved designs yet.</Alert>
          ) : (
            <Grid container spacing={2}>
              {approvedDesigns.map(design => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={design._id}>
                  <CADDesignCard design={design} onOpenMenu={handleOpenMenu} />
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      );
    case 3:
      return (
        <Box>
          <Typography variant="h6" sx={{ mb: 3 }}>
            ✗ Declined Designs ({declinedDesigns.length})
          </Typography>
          {declinedDesigns.length === 0 ? (
            <Alert severity="success">No declined designs!</Alert>
          ) : (
            <Grid container spacing={2}>
              {declinedDesigns.map(design => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={design._id}>
                  <CADDesignCard 
                    design={design} 
                    isDeclinedView={true} 
                    onViewDetails={handleViewDetails} 
                  />
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      );
    default:
      return null;
  }
}