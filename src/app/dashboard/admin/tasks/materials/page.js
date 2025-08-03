'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Fab from '@mui/material/Fab';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import LoadingButton from '@mui/lab/LoadingButton';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Inventory as InventoryIcon,
  AttachMoney as MoneyIcon,
  Category as CategoryIcon,
  Business as BusinessIcon
} from '@mui/icons-material';
import { PageContainer } from '@toolpad/core/PageContainer';

export default function MaterialsPage() {
  const [materials, setMaterials] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [openDialog, setOpenDialog] = React.useState(false);
  const [editingMaterial, setEditingMaterial] = React.useState(null);
  const [deleteDialog, setDeleteDialog] = React.useState({ open: false, material: null });
  const [loadingStuller, setLoadingStuller] = React.useState(false);

  // Form state
  const [formData, setFormData] = React.useState({
    displayName: '',
    category: '',
    unitCost: '',
    unitType: 'application',
    compatibleMetals: [],
    supplier: '',
    description: '',
    isActive: true,
    // Stuller integration fields
    stuller_item_number: '',
    auto_update_pricing: false,
    last_price_update: null
  });

  const categories = [
    'solder',
    'consumable',
    'sizing_material',
    'prong_material',
    'finishing',
    'tools',
    'other'
  ];

  const unitTypes = [
    'application',
    'gram',
    'piece',
    'inch',
    'hour'
  ];

  const metalOptions = [
    'silver',
    'gold',
    'platinum',
    'mixed'
  ];

  // Generate preview SKU based on category and display name
  const generatePreviewSku = React.useCallback((displayName, category) => {
    if (!displayName || !category) return 'SKU will be auto-generated';
    
    // Simple preview generation (actual generation happens on server)
    const categoryPrefix = category.substring(0, 2).toUpperCase();
    const materialType = determineMaterialType(displayName, category);
    const typePrefix = getMaterialTypePrefix(materialType);
    return `MT-${categoryPrefix}-${typePrefix}XXX`;
  }, []);

  // Helper functions for SKU preview
  const determineMaterialType = (name, category) => {
    const nameType = name.toLowerCase();
    if (nameType.includes('silver')) return 'silver';
    if (nameType.includes('gold')) return 'gold';
    if (nameType.includes('platinum')) return 'platinum';
    if (nameType.includes('polish')) return 'polishing';
    if (nameType.includes('adhesive')) return 'adhesive';
    if (nameType.includes('solvent')) return 'solvent';
    return 'general';
  };

  const getMaterialTypePrefix = (materialType) => {
    const typeMap = {
      'silver': 'S', 'gold': 'G', 'platinum': 'P',
      'polishing': 'P', 'adhesive': 'A', 'solvent': 'S',
      'general': 'G'
    };
    return typeMap[materialType] || 'G';
  };

  // Generate name from display name
  const generateName = (displayName) => {
    return displayName.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
  };

  // Fetch material data from Stuller
  const fetchStullerData = async (itemNumber) => {
    if (!itemNumber.trim()) return;
    
    setLoadingStuller(true);
    try {
      const response = await fetch('/api/stuller/item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemNumber: itemNumber.trim() })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch Stuller data');
      }

      const result = await response.json();
      const data = result.data;
      
      // Auto-populate form with Stuller data
      setFormData(prev => ({
        ...prev,
        displayName: data.description || prev.displayName,
        category: mapStullerCategory(data.category) || prev.category,
        unitCost: data.price?.toString() || prev.unitCost,
        supplier: 'Stuller',
        description: data.longDescription || data.description || prev.description,
        auto_update_pricing: true
      }));

    } catch (error) {
      console.error('Error fetching Stuller data:', error);
      setError('Failed to fetch Stuller data: ' + error.message);
    } finally {
      setLoadingStuller(false);
    }
  };

  // Map Stuller categories to our categories
  const mapStullerCategory = (stullerCategory) => {
    const categoryMap = {
      'solder': 'solder',
      'findings': 'consumable',
      'tools': 'tools',
      'polishing': 'finishing',
      'cleaning': 'consumable'
    };
    
    const category = stullerCategory?.toLowerCase() || '';
    for (const [key, value] of Object.entries(categoryMap)) {
      if (category.includes(key)) return value;
    }
    return 'other';
  };

  const loadMaterials = React.useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/repair-materials');
      
      if (!response.ok) {
        throw new Error('Failed to load materials');
      }
      
      const { materials } = await response.json();
      setMaterials(materials);
      setError(null);
    } catch (error) {
      console.error('Error loading materials:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadMaterials();
  }, [loadMaterials]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const url = editingMaterial 
        ? `/api/repair-materials?id=${editingMaterial._id}` 
        : '/api/repair-materials';
      
      const method = editingMaterial ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          name: generateName(formData.displayName), // Auto-generate name from display name
          unitCost: parseFloat(formData.unitCost)
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save material');
      }

      setOpenDialog(false);
      setEditingMaterial(null);
      resetForm();
      loadMaterials();
    } catch (error) {
      console.error('Error saving material:', error);
      setError(error.message);
    }
  };

  const handleEdit = (material) => {
    setEditingMaterial(material);
    setFormData({
      displayName: material.displayName,
      category: material.category,
      unitCost: material.unitCost.toString(),
      unitType: material.unitType,
      compatibleMetals: material.compatibleMetals || [],
      supplier: material.supplier || '',
      description: material.description || '',
      isActive: material.isActive !== false,
      stuller_item_number: material.stuller_item_number || '',
      auto_update_pricing: material.auto_update_pricing || false,
      last_price_update: material.last_price_update
    });
    setOpenDialog(true);
  };

  const handleDelete = async (materialId) => {
    try {
      const response = await fetch(`/api/repair-materials?id=${materialId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete material');
      }

      setDeleteDialog({ open: false, material: null });
      loadMaterials();
    } catch (error) {
      console.error('Error deleting material:', error);
      setError(error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      displayName: '',
      category: '',
      unitCost: '',
      unitType: 'application',
      compatibleMetals: [],
      supplier: '',
      description: '',
      isActive: true,
      stuller_item_number: '',
      auto_update_pricing: false,
      last_price_update: null
    });
  };

  const handleOpenDialog = () => {
    resetForm();
    setEditingMaterial(null);
    setOpenDialog(true);
  };

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
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h5" component="h1">
            Repair Materials
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenDialog}
          >
            Add Material
          </Button>
        </Box>

        {/* Materials Grid */}
        {materials.length === 0 ? (
          <Card>
            <CardContent>
              <Box textAlign="center" py={4}>
                <InventoryIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No materials found
                </Typography>
                <Typography color="text.secondary" sx={{ mb: 2 }}>
                  Get started by adding your first material
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleOpenDialog}
                >
                  Add Material
                </Button>
              </Box>
            </CardContent>
          </Card>
        ) : (
          <Grid container spacing={3}>
            {materials.map((material) => (
              <Grid item xs={12} sm={6} md={4} key={material._id}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    opacity: material.isActive === false ? 0.7 : 1,
                    borderLeft: material.isActive === false ? 1 : 3,
                    borderLeftColor: material.isActive === false ? 'grey.300' : 'primary.main'
                  }}
                >
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                      <Typography variant="h6" component="h2" noWrap sx={{ flexGrow: 1, mr: 1 }}>
                        {material.displayName}
                      </Typography>
                      <Chip
                        label={material.isActive === false ? 'Inactive' : 'Active'}
                        color={material.isActive === false ? 'default' : 'success'}
                        size="small"
                      />
                    </Box>

                    <Typography color="text.secondary" variant="body2" sx={{ mb: 2 }}>
                      {material.description || 'No description'}
                    </Typography>

                    <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
                      <Chip
                        label={material.category}
                        variant="outlined"
                        size="small"
                        icon={<CategoryIcon />}
                      />
                      <Chip
                        label={material.unitType}
                        variant="outlined"
                        size="small"
                        color="secondary"
                      />
                    </Box>

                    {material.compatibleMetals && material.compatibleMetals.length > 0 && (
                      <Box mb={2}>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Compatible Metals:
                        </Typography>
                        <Box display="flex" gap={0.5} flexWrap="wrap">
                          {material.compatibleMetals.map((metal) => (
                            <Chip
                              key={metal}
                              label={metal}
                              size="small"
                              variant="outlined"
                              color="info"
                            />
                          ))}
                        </Box>
                      </Box>
                    )}

                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <MoneyIcon fontSize="small" color="success" />
                        <Typography variant="h6" color="success.main">
                          ${material.unitCost?.toFixed(2) || '0.00'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          per {material.unitType}
                        </Typography>
                      </Box>
                    </Box>

                    {material.supplier && (
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <BusinessIcon fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">
                          {material.supplier}
                        </Typography>
                        {material.sku && (
                          <Typography variant="body2" color="text.secondary">
                            (#{material.sku})
                          </Typography>
                        )}
                      </Box>
                    )}
                  </CardContent>

                  <CardActions>
                    <IconButton
                      size="small"
                      onClick={() => handleEdit(material)}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => setDeleteDialog({ open: true, material })}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Floating Action Button */}
        <Fab
          color="primary"
          aria-label="add material"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          onClick={handleOpenDialog}
        >
          <AddIcon />
        </Fab>

        {/* Create/Edit Dialog */}
        <Dialog
          open={openDialog}
          onClose={() => setOpenDialog(false)}
          maxWidth="md"
          fullWidth
        >
          <form onSubmit={handleSubmit}>
            <DialogTitle>
              {editingMaterial ? 'Edit Material' : 'Add New Material'}
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                {/* Stuller Integration Section */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    Stuller Integration
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={8}>
                  <TextField
                    fullWidth
                    label="Stuller Item Number"
                    value={formData.stuller_item_number}
                    onChange={(e) => setFormData({ ...formData, stuller_item_number: e.target.value })}
                    helperText="Enter Stuller item number to auto-populate material data"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <LoadingButton
                    variant="outlined"
                    loading={loadingStuller}
                    onClick={() => fetchStullerData(formData.stuller_item_number)}
                    disabled={!formData.stuller_item_number.trim()}
                    fullWidth
                    sx={{ height: '56px' }}
                  >
                    Fetch Data
                  </LoadingButton>
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.auto_update_pricing}
                        onChange={(e) => setFormData({ ...formData, auto_update_pricing: e.target.checked })}
                      />
                    }
                    label="Auto-update pricing from Stuller"
                  />
                </Grid>

                {/* Material Details Section */}
                <Grid item xs={12} sx={{ mt: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Material Details
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    required
                    fullWidth
                    label="Display Name"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    helperText="User-friendly name for this material"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="SKU Preview"
                    value={generatePreviewSku(formData.displayName, formData.category)}
                    disabled
                    helperText="Auto-generated when saved"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Category</InputLabel>
                    <Select
                      value={formData.category}
                      label="Category"
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    >
                      {categories.map((category) => (
                        <MenuItem key={category} value={category}>
                          {category.replace('_', ' ').toUpperCase()}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Unit Type</InputLabel>
                    <Select
                      value={formData.unitType}
                      label="Unit Type"
                      onChange={(e) => setFormData({ ...formData, unitType: e.target.value })}
                    >
                      {unitTypes.map((type) => (
                        <MenuItem key={type} value={type}>
                          {type.toUpperCase()}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    required
                    fullWidth
                    type="number"
                    label="Unit Cost"
                    value={formData.unitCost}
                    onChange={(e) => setFormData({ ...formData, unitCost: e.target.value })}
                    InputProps={{
                      startAdornment: '$'
                    }}
                    inputProps={{
                      min: 0,
                      step: 0.01
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Compatible Metals</InputLabel>
                    <Select
                      multiple
                      value={formData.compatibleMetals}
                      label="Compatible Metals"
                      onChange={(e) => setFormData({ ...formData, compatibleMetals: e.target.value })}
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {selected.map((value) => (
                            <Chip key={value} label={value} size="small" />
                          ))}
                        </Box>
                      )}
                    >
                      {metalOptions.map((metal) => (
                        <MenuItem key={metal} value={metal}>
                          {metal.toUpperCase()}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Supplier"
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="Description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
              <Button type="submit" variant="contained">
                {editingMaterial ? 'Update' : 'Create'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialog.open}
          onClose={() => setDeleteDialog({ open: false, material: null })}
        >
          <DialogTitle>Delete Material</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete &quot;{deleteDialog.material?.displayName}&quot;?
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialog({ open: false, material: null })}>
              Cancel
            </Button>
            <Button
              color="error"
              variant="contained"
              onClick={() => handleDelete(deleteDialog.material._id)}
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </PageContainer>
  );
}
