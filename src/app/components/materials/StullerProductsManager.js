/**
 * StullerProductsManager Component
 * Manages multiple Stuller products for a single material
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
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
  Alert,
  useMediaQuery
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

export default function StullerProductsManager({
  stullerProducts = [],
  onProductsChange,
  onFetchStullerData,
  loadingStuller = false,
  formData = {}
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
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
      const fetchedProduct = formData.lastFetchedStullerProduct;

      const newProduct = {
        ...(fetchedProduct || {}),
        id: fetchedProduct?.id || Date.now().toString(),
        stullerItemNumber: fetchedProduct?.stullerItemNumber || pendingItemNumber,
        portionsPerUnit: Number(fetchedProduct?.portionsPerUnit || formData.portionsPerUnit || 1),
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
  }, [formData, pendingItemNumber, stullerProducts, onProductsChange, processingFetch]);

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

  const handleUpdateProductPortions = (productId, nextValue) => {
    const parsedValue = Math.max(1, parseInt(nextValue, 10) || 1);
    const updatedProducts = stullerProducts.map((product) => (
      product.id === productId
        ? { ...product, portionsPerUnit: parsedValue }
        : product
    ));
    onProductsChange(updatedProducts);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getProductPortionsPerUnit = (product) => {
    return Number(product?.portionsPerUnit || formData.portionsPerUnit || 1);
  };

  const calculateRawCostPerPortion = (product) => {
    const portionsPerUnit = getProductPortionsPerUnit(product);
    const unitCost = Number(product?.stullerPrice || product?.unitCost || 0);
    return portionsPerUnit > 0 ? unitCost / portionsPerUnit : 0;
  };

  const calculateDisplayMarkedUpUnitPrice = (product) => {
    const stullerPrice = Number(product?.stullerPrice || 0);
    const materialMarkup = Number(adminSettings?.pricing?.materialMarkup || 1);
    return stullerPrice * materialMarkup;
  };

  const calculateDisplayMarkedUpCostPerPortion = (product) => {
    const portionsPerUnit = getProductPortionsPerUnit(product);
    const markedUpUnitPrice = calculateDisplayMarkedUpUnitPrice(product);
    return portionsPerUnit > 0 ? markedUpUnitPrice / portionsPerUnit : 0;
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

      <Alert severity="info" sx={{ mb: 2 }}>
        Store raw Stuller inputs only. Portion counts are physical conversion inputs per product; per-portion prices are computed at runtime.
      </Alert>

      {stullerProducts.length === 0 ? (
        <Alert severity="info">
          No Stuller products added yet. Click &quot;Add Stuller Product&quot; to fetch products from Stuller and add them to this material.
        </Alert>
      ) : isMobile ? (
        <Box display="flex" flexDirection="column" gap={2}>
          {stullerProducts.map((product) => (
            <Paper key={product.id} variant="outlined" sx={{ p: 2 }}>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={2}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="subtitle2" sx={{ wordBreak: 'break-word' }}>
                    {product.stullerItemNumber}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {product.description || 'Stuller Product'}
                  </Typography>
                </Box>
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => handleDeleteProduct(product.id)}
                  title="Remove Product"
                >
                  <DeleteIcon />
                </IconButton>
              </Box>

              <Box display="flex" flexWrap="wrap" gap={1} mt={1.5}>
                <Chip
                  label={formatMetalTypeDisplay(product.metalType)}
                  size="small"
                  color={product.metalType ? getMetalTypeColor(product.metalType) : 'default'}
                  variant={product.metalType ? 'filled' : 'outlined'}
                />
                {product.karat ? <Chip label={product.karat} size="small" variant="outlined" /> : null}
                {product.unitOfSale ? <Chip label={product.unitOfSale} size="small" variant="outlined" /> : null}
              </Box>

              <Box display="grid" gridTemplateColumns="1fr 1fr" gap={1.5} mt={2}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Stuller Price</Typography>
                  <Typography variant="body2">{formatCurrency(product.stullerPrice || 0)}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Portions / Unit</Typography>
                  <TextField
                    size="small"
                    type="number"
                    value={getProductPortionsPerUnit(product)}
                    onChange={(event) => handleUpdateProductPortions(product.id, event.target.value)}
                    inputProps={{ min: 1, step: 1 }}
                    sx={{ mt: 0.5 }}
                  />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Raw Cost / Portion</Typography>
                  <Typography variant="body2">{formatCurrency(calculateRawCostPerPortion(product))}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Display Markup / Portion</Typography>
                  <Typography variant="body2">{formatCurrency(calculateDisplayMarkedUpCostPerPortion(product))}</Typography>
                </Box>
              </Box>
            </Paper>
          ))}
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Item Number</TableCell>
                <TableCell>Metal Type</TableCell>
                <TableCell>Karat</TableCell>
                <TableCell>Stuller Price</TableCell>
                <TableCell>Portions / Unit</TableCell>
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
                  <TableCell sx={{ minWidth: 132 }}>
                    <TextField
                      size="small"
                      type="number"
                      value={getProductPortionsPerUnit(product)}
                      onChange={(event) => handleUpdateProductPortions(product.id, event.target.value)}
                      inputProps={{ min: 1, step: 1 }}
                    />
                  </TableCell>
                  <TableCell>
                    <strong>{formatCurrency(calculateDisplayMarkedUpUnitPrice(product))}</strong>
                    <br />
                    <Typography variant="caption" color="textSecondary">
                      ({adminSettings?.pricing?.materialMarkup || 1}x display markup)
                    </Typography>
                  </TableCell>
                  <TableCell>{formatCurrency(calculateRawCostPerPortion(product))}</TableCell>
                  <TableCell>
                    <strong>{formatCurrency(calculateDisplayMarkedUpCostPerPortion(product))}</strong>
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
      <Dialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        fullScreen={isMobile}
        fullWidth
        maxWidth="sm"
      >
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
