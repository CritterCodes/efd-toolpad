/**
 * StullerProductsManager Component
 * Manages multiple Stuller products for a single material
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Alert
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Search as SearchIcon
} from '@mui/icons-material';

export default function StullerProductsManager({
  stullerProducts = [],
  onProductsChange,
  onFetchStullerData,
  loadingStuller = false,
  formData = {}, // This contains portionsPerUnit for cost calculation
  setFormData // Function to update formData
}) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [stullerItemNumber, setStullerItemNumber] = useState('');
  const [processingFetch, setProcessingFetch] = useState(false);
  const [pendingItemNumber, setPendingItemNumber] = useState('');
  const [adminSettings, setAdminSettings] = useState(null);

  // Load admin settings for markup calculations
  React.useEffect(() => {
    const fetchAdminSettings = async () => {
      try {
        const response = await fetch('/api/admin/settings');
        if (response.ok) {
          const settings = await response.json();
          setAdminSettings(settings);
        }
      } catch (error) {
        console.error('Error fetching admin settings:', error);
      }
    };
    
    fetchAdminSettings();
  }, []);

  // Watch for formData changes and create product entry
  React.useEffect(() => {
    if (pendingItemNumber && formData.stuller_item_number === pendingItemNumber && !processingFetch) {
      // Create product entry using the fresh formData
      const stullerPrice = formData.unitCost || 0;
      const markupRate = adminSettings?.pricing?.materialMarkup || 1.5;
      const markedUpPrice = stullerPrice * markupRate;
      
      const newProduct = {
        id: Date.now().toString(),
        stullerItemNumber: pendingItemNumber,
        // Use the exact metal type from compatibleMetals array, or null if not metal-based
        metalType: formData.compatibleMetals?.[0] || null, 
        karat: formData.karat || null,
        // Store all pricing information
        stullerPrice: stullerPrice,
        markupRate: markupRate,
        markedUpPrice: markedUpPrice,
        unitCost: markedUpPrice, // For backward compatibility, use marked up price as unitCost
        sku: formData.sku || '',
        description: formData.description || formData.displayName || 'Stuller Product',
        weight: 0,
        dimensions: '',
        addedAt: new Date().toISOString(),
        autoUpdatePricing: formData.auto_update_pricing !== false
      };

      // Add to products list
      const updatedProducts = [...stullerProducts, newProduct];
      onProductsChange(updatedProducts);
      
      // Clear pending state and close dialog
      setPendingItemNumber('');
      setStullerItemNumber('');
      setAddDialogOpen(false);
    }
  }, [formData, pendingItemNumber, stullerProducts, onProductsChange, processingFetch, adminSettings?.pricing?.materialMarkup]);

  const handleFetchStuller = async () => {
    if (!stullerItemNumber.trim() || processingFetch) return;

    setProcessingFetch(true);
    setPendingItemNumber(stullerItemNumber); // Store the item number we're fetching
    
    try {
      // Call the existing fetch function
      await onFetchStullerData(stullerItemNumber);
      // The useEffect above will handle creating the product entry when formData updates
      
    } catch (error) {
      console.error('Error fetching Stuller data:', error);
      setPendingItemNumber(''); // Clear pending on error
      setAddDialogOpen(false);
    } finally {
      setProcessingFetch(false);
    }
  };

  const handleDeleteProduct = (productId) => {
    const updatedProducts = stullerProducts.filter(p => p.id !== productId);
    onProductsChange(updatedProducts);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const calculateCostPerPortion = (unitCost) => {
    const portionsPerUnit = formData.portionsPerUnit || 1;
    return unitCost / portionsPerUnit;
  };

  const calculateStullerCostPerPortion = (stullerPrice) => {
    const portionsPerUnit = formData.portionsPerUnit || 1;
    return stullerPrice / portionsPerUnit;
  };

  const calculateMarkedUpCostPerPortion = (markedUpPrice) => {
    const portionsPerUnit = formData.portionsPerUnit || 1;
    return markedUpPrice / portionsPerUnit;
  };

  const getMetalTypeColor = (metalType) => {
    const colors = {
      yellow_gold: 'warning',
      white_gold: 'default', 
      rose_gold: 'error',
      gold: 'warning',
      silver: 'info',
      sterling: 'info',
      platinum: 'secondary',
      palladium: 'secondary',
      other: 'default'
    };
    return colors[metalType] || 'default';
  };

  const formatMetalTypeDisplay = (metalType) => {
    if (!metalType) return 'N/A';
    
    const displayNames = {
      yellow_gold: 'Yellow Gold',
      white_gold: 'White Gold',
      rose_gold: 'Rose Gold', 
      gold: 'Gold',
      silver: 'Silver',
      sterling: 'Sterling Silver',
      platinum: 'Platinum',
      palladium: 'Palladium',
      other: 'Other'
    };
    return displayNames[metalType] || metalType;
  };

  return (
    <Box>
      <Box display="flex" justifyContent="between" alignItems="center" mb={2}>
        <Typography variant="h6">Stuller Products</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setAddDialogOpen(true)}
        >
          Add Stuller Product
        </Button>
      </Box>

      {/* Show metal dependency info but don't restrict functionality */}
      {formData.isMetalDependent === false && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Universal Material (Non-Metal Dependent)
          </Typography>
          <Typography variant="body2">
            This material works with any metal type. You can still add Stuller products for ordering purposes, 
            or set a standard price in the General Information tab.
          </Typography>
        </Alert>
      )}

      {adminSettings && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Using material markup rate: <strong>{adminSettings.pricing?.materialMarkup || 1.5}x</strong>
        </Alert>
      )}

      {stullerProducts.length === 0 ? (
        <Alert severity="info">
          No Stuller products added yet. Click &quot;Add Stuller Product&quot; to fetch products from Stuller and add them to this material.
        </Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Item Number</TableCell>
                <TableCell>Metal Type</TableCell>
                <TableCell>Karat</TableCell>
                <TableCell>Stuller Price</TableCell>
                <TableCell>Marked-up Price</TableCell>
                <TableCell>Raw Cost/Portion</TableCell>
                <TableCell>Final Cost/Portion</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {stullerProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>{product.stullerItemNumber}</TableCell>
                  <TableCell>
                    {product.metalType ? (
                      <Chip
                        label={formatMetalTypeDisplay(product.metalType)}
                        size="small"
                        color={getMetalTypeColor(product.metalType)}
                      />
                    ) : (
                      <Chip
                        label="N/A"
                        size="small"
                        color="default"
                        variant="outlined"
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    {product.karat ? (
                      product.karat
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        N/A
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>{formatCurrency(product.stullerPrice || 0)}</TableCell>
                  <TableCell>
                    <strong>{formatCurrency(product.markedUpPrice || 0)}</strong>
                    <br />
                    <Typography variant="caption" color="textSecondary">
                      ({product.markupRate || 1.5}x markup)
                    </Typography>
                  </TableCell>
                  <TableCell>{formatCurrency(calculateStullerCostPerPortion(product.stullerPrice || 0))}</TableCell>
                  <TableCell>
                    <strong>{formatCurrency(calculateMarkedUpCostPerPortion(product.markedUpPrice || 0))}</strong>
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeleteProduct(product.id)}
                      title="Remove Product"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Add Product Dialog */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)}>
        <DialogTitle>Add Stuller Product</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Enter a Stuller item number to fetch product data and add it to this material.
          </Typography>
          <TextField
            fullWidth
            label="Stuller Item Number"
            value={stullerItemNumber}
            onChange={(e) => setStullerItemNumber(e.target.value)}
            placeholder="e.g., SOLDER:77433:P"
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleFetchStuller}
            variant="contained"
            disabled={!stullerItemNumber.trim() || loadingStuller || processingFetch}
            startIcon={<SearchIcon />}
          >
            {loadingStuller || processingFetch ? 'Fetching...' : 'Fetch & Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
