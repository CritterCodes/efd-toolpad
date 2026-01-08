/**
 * Stuller Material Search and Import Component
 * Allows searching Stuller catalog and importing materials with variants
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Button,
  Typography,
  Card,
  CardContent,
  CardActions,
  Grid,
  Checkbox,
  FormControlLabel,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  Download as ImportIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import stullerIntegrationService from '@/services/stuller-integration.service';

export function StullerSearchDialog({ open, onClose, onImport }) {
  // Search state
  const [searchParams, setSearchParams] = useState({
    category: '',
    keywords: '',
    metalTypes: [],
    karats: []
  });
  
  // Results state
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedProducts, setSelectedProducts] = useState(new Set());
  
  // Import state
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState(null);
  
  // UI state
  const [tabValue, setTabValue] = useState(0);
  
  // Get search suggestions
  const suggestions = stullerIntegrationService.getSearchSuggestions();

  /**
   * Handle search execution
   */
  const handleSearch = async () => {
    if (!searchParams.keywords && !searchParams.category) {
      setError('Please enter keywords or select a category');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const response = await stullerIntegrationService.searchProducts(searchParams);
      
      if (response.success) {
        setSearchResults(response.data);
        setTabValue(1); // Switch to results tab
      } else {
        setError(response.error || 'Search failed');
      }
    } catch (err) {
      setError(err.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle product selection
   */
  const handleProductSelect = (productId, selected) => {
    const newSelected = new Set(selectedProducts);
    if (selected) {
      newSelected.add(productId);
    } else {
      newSelected.delete(productId);
    }
    setSelectedProducts(newSelected);
  };

  /**
   * Handle bulk import
   */
  const handleImport = async () => {
    const productsToImport = searchResults.filter(p => selectedProducts.has(p.id));
    
    if (productsToImport.length === 0) {
      setError('Please select at least one product to import');
      return;
    }

    setImporting(true);
    setError('');
    
    try {
      const results = await stullerIntegrationService.bulkImport(productsToImport);
      setImportResults(results);
      setTabValue(2); // Switch to results tab
      
      // Notify parent component
      if (onImport) {
        onImport(results.imported);
      }
    } catch (err) {
      setError(err.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  /**
   * Clear search and results
   */
  const handleClear = () => {
    setSearchParams({
      category: '',
      keywords: '',
      metalTypes: [],
      karats: []
    });
    setSearchResults([]);
    setSelectedProducts(new Set());
    setError('');
    setImportResults(null);
    setTabValue(0);
  };

  /**
   * Render search form
   */
  const renderSearchForm = () => (
    <Box sx={{ p: 2 }}>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Search Keywords"
            placeholder="e.g., solder, wire, jump rings..."
            value={searchParams.keywords}
            onChange={(e) => setSearchParams(prev => ({ ...prev, keywords: e.target.value }))}
            InputProps={{
              endAdornment: searchParams.keywords && (
                <IconButton
                  size="small"
                  onClick={() => setSearchParams(prev => ({ ...prev, keywords: '' }))}
                >
                  <ClearIcon />
                </IconButton>
              )
            }}
          />
        </Grid>
        
        <Grid item xs={6}>
          <FormControl fullWidth>
            <InputLabel>Category</InputLabel>
            <Select
              value={searchParams.category}
              label="Category"
              onChange={(e) => setSearchParams(prev => ({ ...prev, category: e.target.value }))}
            >
              <MenuItem value="">All Categories</MenuItem>
              {suggestions.categories.map(cat => (
                <MenuItem key={cat.value} value={cat.value}>
                  {cat.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={6}>
          <FormControl fullWidth>
            <InputLabel>Metal Types</InputLabel>
            <Select
              multiple
              value={searchParams.metalTypes}
              label="Metal Types"
              onChange={(e) => setSearchParams(prev => ({ ...prev, metalTypes: e.target.value }))}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => {
                    const metal = suggestions.metalTypes.find(m => m.value === value);
                    return <Chip key={value} label={metal?.label || value} size="small" />;
                  })}
                </Box>
              )}
            >
              {suggestions.metalTypes.map(metal => (
                <MenuItem key={metal.value} value={metal.value}>
                  {metal.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12}>
          <Box display="flex" justifyContent="space-between" gap={2}>
            <Button
              variant="outlined"
              startIcon={<ClearIcon />}
              onClick={handleClear}
            >
              Clear
            </Button>
            <Button
              variant="contained"
              startIcon={<SearchIcon />}
              onClick={handleSearch}
              disabled={loading}
            >
              {loading ? <CircularProgress size={20} /> : 'Search Stuller'}
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );

  /**
   * Render search results
   */
  const renderSearchResults = () => (
    <Box sx={{ p: 2 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">
          Found {searchResults.length} products
        </Typography>
        <Button
          variant="contained"
          startIcon={<ImportIcon />}
          onClick={handleImport}
          disabled={selectedProducts.size === 0 || importing}
        >
          {importing ? <CircularProgress size={20} /> : `Import Selected (${selectedProducts.size})`}
        </Button>
      </Box>
      
      <Grid container spacing={2}>
        {searchResults.map((product) => (
          <Grid item xs={12} key={product.id}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography variant="h6">{product.name}</Typography>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      {product.description}
                    </Typography>
                    <Chip 
                      label={product.category} 
                      size="small" 
                      color="primary" 
                      variant="outlined"
                    />
                  </Box>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={selectedProducts.has(product.id)}
                        onChange={(e) => handleProductSelect(product.id, e.target.checked)}
                      />
                    }
                    label="Import"
                  />
                </Box>
                
                <Accordion sx={{ mt: 2 }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>
                      Variants ({product.variants.length})
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>SKU</TableCell>
                            <TableCell>Metal</TableCell>
                            <TableCell>Karat</TableCell>
                            <TableCell>Cost</TableCell>
                            <TableCell>Stock</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {product.variants.map((variant, index) => (
                            <TableRow key={index}>
                              <TableCell>{variant.sku}</TableCell>
                              <TableCell>
                                {variant.metalType.charAt(0).toUpperCase() + variant.metalType.slice(1)}
                              </TableCell>
                              <TableCell>{variant.karat.toUpperCase()}</TableCell>
                              <TableCell>${variant.unitCost.toFixed(2)}</TableCell>
                              <TableCell>
                                {variant.inStock ? (
                                  <CheckIcon color="success" fontSize="small" />
                                ) : (
                                  <ErrorIcon color="error" fontSize="small" />
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </AccordionDetails>
                </Accordion>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  /**
   * Render import results
   */
  const renderImportResults = () => (
    <Box sx={{ p: 2 }}>
      {importResults && (
        <>
          <Alert severity="success" sx={{ mb: 2 }}>
            Successfully imported {importResults.success} materials
          </Alert>
          
          {importResults.failed > 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Failed to import {importResults.failed} materials
            </Alert>
          )}
          
          {importResults.errors.length > 0 && (
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Import Errors ({importResults.errors.length})</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box>
                  {importResults.errors.map((error, index) => (
                    <Alert key={index} severity="error" sx={{ mb: 1 }}>
                      <strong>{error.product}:</strong> {error.error}
                    </Alert>
                  ))}
                </Box>
              </AccordionDetails>
            </Accordion>
          )}
          
          <Box mt={2}>
            <Typography variant="h6" gutterBottom>Imported Materials</Typography>
            <Grid container spacing={2}>
              {importResults.imported.map((material, index) => (
                <Grid item xs={12} key={index}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle1">{material.displayName}</Typography>
                      <Typography variant="body2" color="textSecondary">
                        {material.hasVariants ? `${material.variants.length} variants` : 'Single variant'}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        </>
      )}
    </Box>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{ sx: { height: '80vh' } }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={2}>
          <SearchIcon />
          Stuller Material Search & Import
        </Box>
      </DialogTitle>
      
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label="Search" />
          <Tab 
            label={`Results (${searchResults.length})`} 
            disabled={searchResults.length === 0}
          />
          <Tab 
            label="Import Results" 
            disabled={!importResults}
          />
        </Tabs>
        
        {tabValue === 0 && renderSearchForm()}
        {tabValue === 1 && renderSearchResults()}
        {tabValue === 2 && renderImportResults()}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>
          Close
        </Button>
        {tabValue === 1 && selectedProducts.size > 0 && (
          <Button
            variant="contained"
            startIcon={<ImportIcon />}
            onClick={handleImport}
            disabled={importing}
          >
            {importing ? <CircularProgress size={20} /> : `Import ${selectedProducts.size} Selected`}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

export default StullerSearchDialog;
