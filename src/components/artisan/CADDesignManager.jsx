'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Tab,
  Tabs,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  MoreVert as MoreVertIcon,
  Check as ApproveIcon,
  Close as RejectIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { getSTLVolume } from '@/lib/stlParser';
import GLBViewer from '@/components/viewers/GLBViewer';
import STLViewer from '@/components/viewers/STLViewer';

/**
 * CAD Design Manager
 * Allows artisans (CAD designers) to:
 * - View their CAD designs split by STL and GLB files
 * - Upload STL files with automatic volume calculation
 * - Upload GLB files for web preview
 * - Track design status (pending, approved, declined)
 * - Delete designs
 * - View design details and previews
 */
export default function CADDesignManager() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState(0);
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploadDialog, setUploadDialog] = useState(false);
  const [detailDialog, setDetailDialog] = useState(false);
  const [selectedDesign, setSelectedDesign] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [menuDesignId, setMenuDesignId] = useState(null);
  const [previewDialog, setPreviewDialog] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [previewType, setPreviewType] = useState('glb');

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    notes: '',
    stlFile: null,
    glbFile: null,
    cadRequestId: '',
  });

  const [calculating, setCalculating] = useState(false);
  const [calculatedVolume, setCalculatedVolume] = useState(null);

  // Fetch designs
  useEffect(() => {
    if (session?.user?.id) {
      fetchDesigns();
    }
  }, [session]);

  const fetchDesigns = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/cad/designs?userId=${session.user.id}`);

      if (!res.ok) throw new Error('Failed to fetch designs');

      const data = await res.json();
      setDesigns(data.designs || []);
    } catch (err) {
      console.error('Error fetching designs:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleOpenUploadDialog = () => {
    setFormData({
      title: '',
      description: '',
      notes: '',
      stlFile: null,
      glbFile: null,
      cadRequestId: '',
    });
    setCalculatedVolume(null);
    setUploadDialog(true);
  };

  const handleCloseUploadDialog = () => {
    setUploadDialog(false);
  };

  const handleFileChange = async (event, fileType) => {
    const file = event.target.files[0];
    if (!file) return;

    if (fileType === 'stlFile') {
      // Calculate volume for STL
      try {
        setCalculating(true);
        const volume = await getSTLVolume(file);
        setCalculatedVolume(Math.round(volume));
      } catch (err) {
        setError(`Volume calculation failed: ${err.message}`);
      } finally {
        setCalculating(false);
      }
    }

    setFormData(prev => ({
      ...prev,
      [fileType]: file
    }));
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmitDesign = async () => {
    try {
      if (!formData.title || (!formData.stlFile && !formData.glbFile)) {
        setError('Title and at least one file (STL or GLB) required');
        return;
      }

      setLoading(true);
      setError(null);

      const uploadFormData = new FormData();
      uploadFormData.append('title', formData.title);
      uploadFormData.append('description', formData.description);
      uploadFormData.append('notes', formData.notes);
      uploadFormData.append('cadRequestId', formData.cadRequestId);
      uploadFormData.append('printVolume', calculatedVolume || 0);

      if (formData.stlFile) {
        uploadFormData.append('stlFile', formData.stlFile);
      }
      if (formData.glbFile) {
        uploadFormData.append('glbFile', formData.glbFile);
      }

      const res = await fetch('/api/cad/designs/upload', {
        method: 'POST',
        body: uploadFormData,
      });

      if (!res.ok) throw new Error('Upload failed');

      const data = await res.json();
      await fetchDesigns();
      setUploadDialog(false);
    } catch (err) {
      console.error('Error uploading design:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenMenu = (event, designId) => {
    setAnchorEl(event.currentTarget);
    setMenuDesignId(designId);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setMenuDesignId(null);
  };

  const handleViewDetails = (design) => {
    setSelectedDesign(design);
    setDetailDialog(true);
    handleCloseMenu();
  };

  const handlePreview = (design, fileType) => {
    if (fileType === 'stl' && design.stlUrl) {
      setPreviewFile(design.stlUrl);
      setPreviewType('stl');
      setPreviewDialog(true);
    } else if (fileType === 'glb' && design.glbUrl) {
      setPreviewFile(design.glbUrl);
      setPreviewType('glb');
      setPreviewDialog(true);
    }
    handleCloseMenu();
  };

  const handleDeleteDesign = async (designId) => {
    if (window.confirm('Are you sure you want to delete this design?')) {
      try {
        setLoading(true);
        const res = await fetch(`/api/cad/designs/${designId}`, {
          method: 'DELETE'
        });

        if (!res.ok) throw new Error('Delete failed');

        await fetchDesigns();
        handleCloseMenu();
      } catch (err) {
        console.error('Error deleting design:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'approved':
        return 'success';
      case 'declined':
        return 'error';
      case 'in_review':
        return 'info';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <ApproveIcon sx={{ fontSize: 16, mr: 0.5 }} />;
      case 'declined':
        return <RejectIcon sx={{ fontSize: 16, mr: 0.5 }} />;
      default:
        return null;
    }
  };

  // Filter designs by type
  const stlDesigns = designs.filter(d => d.stlUrl && (!d.status || d.status === 'pending'));
  const glbDesigns = designs.filter(d => d.glbUrl);
  const approvedDesigns = designs.filter(d => d.status === 'approved');
  const declinedDesigns = designs.filter(d => d.status === 'declined');

  const renderDesignCard = (design) => (
    <Card
      key={design._id}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
    >
      <CardContent sx={{ flexGrow: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
          <Typography variant="h6" component="div" noWrap>
            {design.title}
          </Typography>
          <IconButton
            size="small"
            onClick={(e) => handleOpenMenu(e, design._id)}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </Box>

        {design.description && (
          <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
            {design.description}
          </Typography>
        )}

        {/* Status Chip */}
        {design.status && (
          <Box sx={{ mb: 2 }}>
            <Chip
              icon={getStatusIcon(design.status)}
              label={design.status.charAt(0).toUpperCase() + design.status.slice(1)}
              color={getStatusColor(design.status)}
              size="small"
            />
          </Box>
        )}

        {/* Volume for STL */}
        {design.printVolume && (
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>Volume:</strong> {design.printVolume.toLocaleString()} mm³
          </Typography>
        )}

        {/* File indicators */}
        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
          {design.stlUrl && (
            <Chip
              label="STL"
              size="small"
              variant="outlined"
              color="primary"
            />
          )}
          {design.glbUrl && (
            <Chip
              label="GLB"
              size="small"
              variant="outlined"
              color="secondary"
            />
          )}
        </Box>

        {/* Created date */}
        <Typography variant="caption" color="textSecondary">
          Created: {new Date(design.createdAt).toLocaleDateString()}
        </Typography>
      </CardContent>
    </Card>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 0: // STL Files
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
                    {renderDesignCard(design)}
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        );

      case 1: // GLB Files
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
                    {renderDesignCard(design)}
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        );

      case 2: // Approved
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
                    {renderDesignCard(design)}
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        );

      case 3: // Declined
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
                    <Card>
                      <CardContent>
                        <Box sx={{ mb: 1 }}>
                          <Typography variant="h6">{design.title}</Typography>
                          <Chip
                            icon={<RejectIcon />}
                            label="Declined"
                            color="error"
                            size="small"
                          />
                        </Box>
                        {design.feedbackNotes && (
                          <Alert severity="warning" sx={{ mt: 2 }}>
                            <Typography variant="subtitle2">Feedback:</Typography>
                            <Typography variant="body2">{design.feedbackNotes}</Typography>
                          </Alert>
                        )}
                        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => handleViewDetails(design)}
                          >
                            View Details
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        );

      default:
        return null;
    }
  };

  if (!session?.user?.artisanTypes?.includes('CAD Designer')) {
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
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {loading && !designs.length ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs value={activeTab} onChange={handleTabChange}>
              <Tab label="STL Files (3D Print)" />
              <Tab label="GLB Files (Web Preview)" />
              <Tab label={`✓ Approved (${approvedDesigns.length})`} />
              <Tab label={`✗ Declined (${declinedDesigns.length})`} />
            </Tabs>
          </Box>

          {/* Tab Content */}
          {renderTabContent()}
        </>
      )}

      {/* Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
      >
        <MenuItem onClick={() => {
          const design = designs.find(d => d._id === menuDesignId);
          handleViewDetails(design);
        }}>
          <ViewIcon sx={{ mr: 1 }} /> View Details
        </MenuItem>
        <MenuItem onClick={() => {
          const design = designs.find(d => d._id === menuDesignId);
          if (design.glbUrl) handlePreview(design, 'glb');
          else if (design.stlUrl) handlePreview(design, 'stl');
        }}>
          <DownloadIcon sx={{ mr: 1 }} /> Preview
        </MenuItem>
        <MenuItem onClick={() => handleDeleteDesign(menuDesignId)} sx={{ color: 'error.main' }}>
          <DeleteIcon sx={{ mr: 1 }} /> Delete
        </MenuItem>
      </Menu>

      {/* Upload Dialog */}
      <Dialog
        open={uploadDialog}
        onClose={handleCloseUploadDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Upload New Design</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="Design Title"
              name="title"
              value={formData.title}
              onChange={handleFormChange}
              required
            />

            <TextField
              fullWidth
              multiline
              rows={2}
              label="Description"
              name="description"
              value={formData.description}
              onChange={handleFormChange}
            />

            <TextField
              fullWidth
              label="CAD Request ID (Optional)"
              name="cadRequestId"
              value={formData.cadRequestId}
              onChange={handleFormChange}
              placeholder="Link to CAD request if applicable"
            />

            {/* STL Upload */}
            <Box sx={{ p: 2, border: '1px dashed #ccc', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                STL File (3D Print Format)
              </Typography>
              <input
                type="file"
                accept=".stl"
                onChange={(e) => handleFileChange(e, 'stlFile')}
                style={{ width: '100%' }}
              />
              {calculating && <CircularProgress size={20} sx={{ mt: 1 }} />}
              {formData.stlFile && (
                <Typography variant="caption" color="success.main" sx={{ display: 'block', mt: 1 }}>
                  ✓ {formData.stlFile.name}
                  {calculatedVolume && ` - Volume: ${calculatedVolume.toLocaleString()} mm³`}
                </Typography>
              )}
            </Box>

            {/* GLB Upload */}
            <Box sx={{ p: 2, border: '1px dashed #ccc', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                GLB File (Web Preview)
              </Typography>
              <input
                type="file"
                accept=".glb"
                onChange={(e) => handleFileChange(e, 'glbFile')}
                style={{ width: '100%' }}
              />
              {formData.glbFile && (
                <Typography variant="caption" color="success.main" sx={{ display: 'block', mt: 1 }}>
                  ✓ {formData.glbFile.name}
                </Typography>
              )}
            </Box>

            <TextField
              fullWidth
              multiline
              rows={2}
              label="Design Notes"
              name="notes"
              value={formData.notes}
              onChange={handleFormChange}
              placeholder="Any notes for the design team..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseUploadDialog}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSubmitDesign}
            disabled={loading || !formData.title || (!formData.stlFile && !formData.glbFile)}
          >
            {loading ? <CircularProgress size={20} sx={{ mr: 1 }} /> : null}
            Upload Design
          </Button>
        </DialogActions>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog
        open={previewDialog}
        onClose={() => setPreviewDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Design Preview</DialogTitle>
        <DialogContent sx={{ height: 600 }}>
          {previewType === 'stl' && previewFile && (
            <STLViewer fileUrl={previewFile} />
          )}
          {previewType === 'glb' && previewFile && (
            <GLBViewer fileUrl={previewFile} />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog
        open={detailDialog}
        onClose={() => setDetailDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{selectedDesign?.title}</DialogTitle>
        <DialogContent>
          {selectedDesign && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Description</Typography>
                  <Typography variant="body2">{selectedDesign.description}</Typography>
                </Grid>

                {selectedDesign.printVolume && (
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2">Volume</Typography>
                    <Typography variant="body2">
                      {selectedDesign.printVolume.toLocaleString()} mm³
                    </Typography>
                  </Grid>
                )}

                {selectedDesign.status && (
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2">Status</Typography>
                    <Chip
                      icon={getStatusIcon(selectedDesign.status)}
                      label={selectedDesign.status}
                      color={getStatusColor(selectedDesign.status)}
                    />
                  </Grid>
                )}

                {selectedDesign.notes && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2">Designer Notes</Typography>
                    <Typography variant="body2">{selectedDesign.notes}</Typography>
                  </Grid>
                )}

                {selectedDesign.feedbackNotes && (
                  <Grid item xs={12}>
                    <Alert severity="warning">
                      <Typography variant="subtitle2">Feedback</Typography>
                      <Typography variant="body2">{selectedDesign.feedbackNotes}</Typography>
                    </Alert>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
