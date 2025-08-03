'use client';

import * as React from 'react';
import cascadingUpdatesService from '@/services/cascadingUpdates.service';
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
    karat: '',
    compatibleMetals: [],
    supplier: '',
    description: '',
    isActive: true,
    // Stuller integration fields
    stuller_item_number: '',
    auto_update_pricing: false,
    last_price_update: null,
    // Portion tracking fields
    portionsPerUnit: 1,
    portionType: '',
    costPerPortion: 0
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
    'sheet',
    'spool',
    'stick',
    'jar',
    'tube',
    'bottle',
    'gram',
    'piece',
    'inch',
    'foot',
    'yard',
    'hour'
  ];

  const portionTypes = [
    { value: '', label: 'Same as unit (no portions)' },
    { value: 'clip', label: 'Clip' },
    { value: 'size', label: 'Size' },
    { value: 'application', label: 'Application' },
    { value: 'inch', label: 'Inch' },
    { value: 'gram', label: 'Gram' },
    { value: 'drop', label: 'Drop' },
    { value: 'dab', label: 'Dab' },
    { value: 'dip', label: 'Dip' },
    { value: 'piece', label: 'Piece' }
  ];

  const karatOptions = [
    { value: '', label: 'Not applicable' },
    { value: '10K', label: '10K' },
    { value: '14K', label: '14K' },
    { value: '18K', label: '18K' },
    { value: '22K', label: '22K' },
    { value: '24K', label: '24K' },
    { value: '925', label: '925 Sterling Silver' },
    { value: '950', label: '950 Platinum' },
    { value: '999', label: '999 Fine Silver' }
  ];

  const metalOptions = [
    { value: 'yellow_gold', label: 'Yellow Gold' },
    { value: 'white_gold', label: 'White Gold' }, 
    { value: 'rose_gold', label: 'Rose Gold' },
    { value: 'sterling_silver', label: 'Sterling Silver' },
    { value: 'fine_silver', label: 'Fine Silver' },
    { value: 'platinum', label: 'Platinum' },
    { value: 'mixed', label: 'Mixed Metals' }
  ];

  // Auto-calculate cost per portion
  const calculateCostPerPortion = (unitCost, portionsPerUnit) => {
    const cost = parseFloat(unitCost) || 0;
    const portions = parseInt(portionsPerUnit) || 1;
    return portions > 0 ? (cost / portions).toFixed(4) : '0.0000';
  };

  // Update cost per portion when unit cost or portions change
  React.useEffect(() => {
    const costPerPortion = calculateCostPerPortion(formData.unitCost, formData.portionsPerUnit);
    if (parseFloat(costPerPortion) !== parseFloat(formData.costPerPortion)) {
      setFormData(prev => ({ ...prev, costPerPortion: parseFloat(costPerPortion) }));
    }
  }, [formData.unitCost, formData.portionsPerUnit, formData.costPerPortion]);

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
      
      // Log the enhanced Stuller data for debugging
      console.log('📦 Enhanced Stuller Data Received:', {
        itemNumber: data.itemNumber,
        description: data.description,
        category: data.category,
        metal: data.metal,
        price: data.price,
        dimensions: data.dimensions,
        stock: data.stock,
        merchandising: data.merchandising
      });
      
      // Auto-populate form with enhanced Stuller data
      const mappedCategory = mapStullerCategory(data.category);
      const compatibleMetals = mapStullerToCompatibleMetals(data);
      const extractedKarat = extractKaratFromStuller(data);
      
      console.log('🎯 Form Population Debug:', {
        mappedCategory,
        compatibleMetals,
        extractedKarat,
        rawCategory: data.category,
        metalData: data.metal,
        qualityData: data.specifications?.Quality
      });
      
      setFormData(prev => ({
        ...prev,
        displayName: data.description || prev.displayName,
        category: mappedCategory || prev.category,
        karat: extractedKarat || prev.karat,
        unitCost: (() => {
          const rawPrice = typeof data.price === 'number' ? data.price : data.price?.Value || data.price;
          if (rawPrice && !isNaN(rawPrice)) {
            // Round to 2 decimal places for currency
            return parseFloat(rawPrice).toFixed(2);
          }
          return prev.unitCost;
        })(),
        supplier: 'Stuller',
        description: data.longDescription || data.description || prev.description,
        auto_update_pricing: true,
        stuller_item_number: data.itemNumber || prev.stuller_item_number,
        compatibleMetals: compatibleMetals.length > 0 ? compatibleMetals : prev.compatibleMetals
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
      'cleaning': 'consumable',
      'sizing stock': 'sizing_material',
      'wire': 'sizing_material',
      'sheet': 'sizing_material',
      'tube': 'sizing_material',
      'flat': 'sizing_material',
      'chain': 'findings',
      'stone': 'stones',
      'setting': 'findings',
      'mill product': 'sizing_material',
      'fabricated metals': 'sizing_material'
    };
    
    // Handle both old string format and new object format
    let categoryString = '';
    
    if (typeof stullerCategory === 'string') {
      categoryString = stullerCategory.toLowerCase();
    } else if (typeof stullerCategory === 'object' && stullerCategory !== null) {
      // Try different properties from the enhanced category object
      categoryString = (
        stullerCategory.primary || 
        stullerCategory.group || 
        stullerCategory.hierarchy || 
        ''
      ).toLowerCase();
    }
    
    console.log('🔍 Category Mapping Debug:', {
      original: stullerCategory,
      categoryString,
      mapping: categoryMap
    });
    
    // Map the category string to our internal categories
    for (const [key, value] of Object.entries(categoryMap)) {
      if (categoryString.includes(key)) {
        console.log(`✅ Found category match: "${key}" → "${value}"`);
        return value;
      }
    }
    
    console.log(`⚠️ No category match found, defaulting to "other"`);
    return 'other';
  };

  // Map Stuller metal data to compatible metals
  const mapStullerToCompatibleMetals = (stullerData) => {
    const metalMappings = {
      '14k yellow': ['yellow_gold'],
      '14ky': ['yellow_gold'],
      '18k yellow': ['yellow_gold'],
      '18ky': ['yellow_gold'],
      '10k yellow': ['yellow_gold'],
      '10ky': ['yellow_gold'],
      '22k yellow': ['yellow_gold'],
      '24k yellow': ['yellow_gold'],
      'yellow gold': ['yellow_gold'],
      'yellow': ['yellow_gold'],
      '14k white': ['white_gold'],
      '14kw': ['white_gold'],
      '18k white': ['white_gold'],
      '18kw': ['white_gold'],
      '10k white': ['white_gold'],
      '10kw': ['white_gold'],
      'white gold': ['white_gold'],
      'white': ['white_gold'],
      '14k rose': ['rose_gold'],
      '14kr': ['rose_gold'],
      '18k rose': ['rose_gold'],
      '18kr': ['rose_gold'],
      '10k rose': ['rose_gold'],
      '10kr': ['rose_gold'],
      'rose gold': ['rose_gold'],
      'rose': ['rose_gold'],
      'pink gold': ['rose_gold'],
      'red gold': ['rose_gold'],
      'sterling': ['sterling_silver'],
      '925': ['sterling_silver'],
      'sterling silver': ['sterling_silver'],
      'fine silver': ['fine_silver'],
      '999': ['fine_silver'],
      'silver': ['sterling_silver'], // Default silver to sterling
      'platinum': ['platinum'],
      '950': ['platinum']
    };

    const metals = [];
    
    // Check metal object
    if (stullerData.metal && stullerData.metal.type) {
      const metalType = stullerData.metal.type.toLowerCase();
      console.log('🔍 Metal Type from Stuller:', metalType);
      
      for (const [key, values] of Object.entries(metalMappings)) {
        if (metalType.includes(key)) {
          metals.push(...values);
          console.log(`✅ Found metal match: "${key}" → [${values.join(', ')}]`);
        }
      }
    }

    // Fallback: check description for metal keywords
    if (metals.length === 0 && stullerData.description) {
      const description = stullerData.description.toLowerCase();
      for (const [key, values] of Object.entries(metalMappings)) {
        if (description.includes(key)) {
          metals.push(...values);
          console.log(`✅ Found metal in description: "${key}" → [${values.join(', ')}]`);
          break;
        }
      }
    }

    return [...new Set(metals)]; // Remove duplicates
  };

  // Extract karat/purity information from Stuller data
  const extractKaratFromStuller = (stullerData) => {
    // Check specifications.Quality first (most reliable)
    if (stullerData.specifications?.Quality?.displayValue) {
      const qualityValue = stullerData.specifications.Quality.displayValue;
      console.log('🔍 Quality from Stuller specifications:', qualityValue);
      
      // Map Stuller quality values to our karat options
      const karatMappings = {
        '14k yellow': '14K',
        '14k white': '14K', 
        '14k rose': '14K',
        '14k': '14K',
        '18k yellow': '18K',
        '18k white': '18K',
        '18k rose': '18K', 
        '18k': '18K',
        '10k yellow': '10K',
        '10k white': '10K',
        '10k': '10K',
        '22k': '22K',
        '24k': '24K',
        'sterling': '925',
        '925': '925',
        'platinum': '950',
        '950': '950',
        'fine silver': '999',
        '999': '999'
      };
      
      const qualityLower = qualityValue.toLowerCase();
      for (const [key, karat] of Object.entries(karatMappings)) {
        if (qualityLower.includes(key)) {
          console.log(`✅ Found karat match: "${key}" → "${karat}"`);
          return karat;
        }
      }
    }
    
    // Fallback: check metal.quality
    if (stullerData.metal?.quality) {
      const metalQuality = stullerData.metal.quality.toLowerCase();
      console.log('🔍 Metal quality from Stuller:', metalQuality);
      
      if (metalQuality.includes('14k')) return '14K';
      if (metalQuality.includes('18k')) return '18K';
      if (metalQuality.includes('10k')) return '10K';
      if (metalQuality.includes('22k')) return '22K';
      if (metalQuality.includes('24k')) return '24K';
      if (metalQuality.includes('925')) return '925';
      if (metalQuality.includes('950')) return '950';
      if (metalQuality.includes('999')) return '999';
    }
    
    // Final fallback: check description
    if (stullerData.description) {
      const description = stullerData.description.toLowerCase();
      console.log('🔍 Checking description for karat:', description);
      
      if (description.includes('14k')) return '14K';
      if (description.includes('18k')) return '18K'; 
      if (description.includes('10k')) return '10K';
      if (description.includes('22k')) return '22K';
      if (description.includes('24k')) return '24K';
      if (description.includes('sterling') || description.includes('925')) return '925';
      if (description.includes('platinum') || description.includes('950')) return '950';
      if (description.includes('fine silver') || description.includes('999')) return '999';
    }
    
    console.log('❌ No karat information found in Stuller data');
    return '';
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
      const isUpdate = !!editingMaterial;
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          name: generateName(formData.displayName), // Auto-generate name from display name
          unitCost: parseFloat(formData.unitCost),
          karat: formData.karat,
          portionsPerUnit: parseInt(formData.portionsPerUnit) || 1,
          portionType: formData.portionType,
          costPerPortion: parseFloat(formData.costPerPortion) || 0
        })
      });

      if (!response.ok) {
        let errorMessage = 'Failed to save material';
        try {
          const data = await response.json();
          errorMessage = data.error || errorMessage;
        } catch (jsonError) {
          // If JSON parsing fails, use the status text or a generic message
          errorMessage = response.statusText || `HTTP Error ${response.status}`;
        }
        throw new Error(errorMessage);
      }

      const savedMaterial = await response.json();
      
      // If this was an update, trigger cascading updates
      if (isUpdate && savedMaterial.material) {
        console.log('🔄 Material updated, triggering cascading updates...');
        try {
          const cascadingResult = await cascadingUpdatesService.updateFromMaterialsChange([savedMaterial.material._id]);
          console.log('✅ Cascading updates completed:', cascadingResult);
        } catch (cascadingError) {
          console.error('⚠️ Cascading updates failed:', cascadingError);
          // Don't fail the whole operation, just log the error
        }
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
      karat: material.karat || '',
      compatibleMetals: material.compatibleMetals || [],
      supplier: material.supplier || '',
      description: material.description || '',
      isActive: material.isActive !== false,
      stuller_item_number: material.stuller_item_number || '',
      auto_update_pricing: material.auto_update_pricing || false,
      last_price_update: material.last_price_update,
      portionsPerUnit: material.portionsPerUnit || 1,
      portionType: material.portionType || '',
      costPerPortion: material.costPerPortion || 0
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
      karat: '',
      compatibleMetals: [],
      supplier: '',
      description: '',
      isActive: true,
      stuller_item_number: '',
      auto_update_pricing: false,
      last_price_update: null,
      portionsPerUnit: 1,
      portionType: '',
      costPerPortion: 0
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
                  <CardContent sx={{ flexGrow: 1, p: 2 }}>
                    {/* Header with name and status */}
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
                      <Typography variant="h6" component="h2" sx={{ flexGrow: 1, mr: 1, lineHeight: 1.2 }}>
                        {material.displayName}
                      </Typography>
                      <Chip
                        label={material.isActive === false ? 'Inactive' : 'Active'}
                        color={material.isActive === false ? 'default' : 'success'}
                        size="small"
                      />
                    </Box>

                    {/* Primary info chips */}
                    <Box display="flex" gap={0.5} flexWrap="wrap" mb={1.5}>
                      <Chip
                        label={material.category}
                        variant="outlined"
                        size="small"
                        icon={<CategoryIcon />}
                        sx={{ fontSize: '0.75rem' }}
                      />
                      {material.karat && (
                        <Chip
                          label={material.karat}
                          variant="filled"
                          size="small"
                          color="primary"
                          sx={{ fontWeight: 'medium', fontSize: '0.75rem' }}
                        />
                      )}
                    </Box>

                    {/* Price section */}
                    <Box mb={1.5}>
                      <Box display="flex" alignItems="baseline" gap={1} mb={0.5}>
                        <Typography variant="h5" color="success.main" fontWeight="medium">
                          ${material.unitCost?.toFixed(2) || '0.00'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          per {material.unitType}
                        </Typography>
                      </Box>
                      
                      {/* Portion pricing if applicable */}
                      {material.portionsPerUnit && material.portionsPerUnit > 1 && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          ${((material.unitCost || 0) / (material.portionsPerUnit || 1)).toFixed(4)} per {material.portionType || 'portion'}
                          • {material.portionsPerUnit} {material.portionType || 'portions'} per unit
                        </Typography>
                      )}
                    </Box>

                    {/* Compatible metals - condensed */}
                    {material.compatibleMetals && material.compatibleMetals.length > 0 && (
                      <Box mb={1}>
                        <Box display="flex" gap={0.5} flexWrap="wrap">
                          {material.compatibleMetals.slice(0, 3).map((metal) => {
                            const metalOption = metalOptions.find(m => m.value === metal);
                            return (
                              <Chip
                                key={metal}
                                label={metalOption?.label || metal}
                                size="small"
                                variant="outlined"
                                color="info"
                                sx={{ fontSize: '0.7rem' }}
                              />
                            );
                          })}
                          {material.compatibleMetals.length > 3 && (
                            <Chip
                              label={`+${material.compatibleMetals.length - 3} more`}
                              size="small"
                              variant="outlined"
                              sx={{ fontSize: '0.7rem' }}
                            />
                          )}
                        </Box>
                      </Box>
                    )}

                    {/* Supplier info - minimal */}
                    {material.supplier && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        <BusinessIcon fontSize="inherit" sx={{ mr: 0.5, verticalAlign: 'middle' }} />
                        {material.supplier}
                        {material.stuller_item_number && (
                          <> (#{material.stuller_item_number})</>
                        )}
                      </Typography>
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
                  <FormControl fullWidth>
                    <InputLabel>Karat/Purity</InputLabel>
                    <Select
                      value={formData.karat}
                      label="Karat/Purity"
                      onChange={(e) => setFormData({ ...formData, karat: e.target.value })}
                    >
                      {karatOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
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
                
                {/* Portion Management Section */}
                <Grid item xs={12}>
                  <Typography variant="h6" sx={{ mt: 2, mb: 1, color: 'primary.main' }}>
                    Portion Management
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Configure how this material is divided into usable portions (e.g., clips from a sheet, sizes from a stick)
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Portions per Unit"
                    value={formData.portionsPerUnit}
                    onChange={(e) => setFormData({ ...formData, portionsPerUnit: Math.max(1, parseInt(e.target.value) || 1) })}
                    inputProps={{
                      min: 1,
                      step: 1
                    }}
                    helperText="How many portions in one unit?"
                  />
                </Grid>
                
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth>
                    <InputLabel>Portion Type</InputLabel>
                    <Select
                      value={formData.portionType}
                      label="Portion Type"
                      onChange={(e) => setFormData({ ...formData, portionType: e.target.value })}
                    >
                      {portionTypes.map((type) => (
                        <MenuItem key={type.value} value={type.value}>
                          {type.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Cost per Portion"
                    value={`$${formData.costPerPortion.toFixed(4)}`}
                    InputProps={{
                      readOnly: true
                    }}
                    helperText="Auto-calculated"
                    sx={{
                      '& .MuiInputBase-input': {
                        backgroundColor: 'action.hover',
                        color: 'text.secondary'
                      }
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
                          {selected.map((value) => {
                            const metal = metalOptions.find(m => m.value === value);
                            return (
                              <Chip key={value} label={metal?.label || value} size="small" />
                            );
                          })}
                        </Box>
                      )}
                    >
                      {metalOptions.map((metal) => (
                        <MenuItem key={metal.value} value={metal.value}>
                          {metal.label}
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
