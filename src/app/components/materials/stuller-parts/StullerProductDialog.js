import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  TextField,
  DialogActions,
  Button,
  CircularProgress,
  Card,
  CardContent,
  Chip,
  Stack,
  Alert
} from '@mui/material';
import { Search as SearchIcon, Add as AddIcon } from '@mui/icons-material';

export const StullerProductDialog = ({ 
  addDialogOpen, 
  setAddDialogOpen, 
  stullerItemNumber, 
  setStullerItemNumber, 
  handleFetchStuller, 
  handleAddVariant,
  loadingStuller, 
  processingFetch 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  const runSearch = async () => {
    const q = searchQuery.trim();
    if (!q) return;

    setSearching(true);
    setSearchError('');
    try {
      const res = await fetch(`/api/stuller/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Search failed');
      }
      setSearchResults(Array.isArray(data.results) ? data.results : []);
      if (!Array.isArray(data.results) || data.results.length === 0) {
        setSearchError(`No products found for "${q}"`);
      }
    } catch (err) {
      setSearchError(err.message || 'Search failed');
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const closeDialog = () => {
    setAddDialogOpen(false);
    setSearchError('');
    setSearchResults([]);
    setSearchQuery('');
  };

  const onAddFromSearch = (product, variant) => {
    if (handleAddVariant) {
      handleAddVariant(product, variant);
    }
  };

  return (
    <>
{/* Add Product Dialog */}
      <Dialog open={addDialogOpen} onClose={closeDialog} maxWidth="md" fullWidth>
        <DialogTitle>Add Stuller Product</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Search by keyword (example: laser wire) and pick the exact SKU/variant to add.
          </Typography>

          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <TextField
              fullWidth
              label="Search Stuller Products"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  runSearch();
                }
              }}
              placeholder="e.g., laser wire"
            />
            <Button
              variant="contained"
              onClick={runSearch}
              disabled={!searchQuery.trim() || searching}
              startIcon={<SearchIcon />}
            >
              {searching ? 'Searching...' : 'Search'}
            </Button>
          </Box>

          {searching && <CircularProgress size={20} sx={{ mb: 2 }} />}
          {searchError && <Alert severity="info" sx={{ mb: 2 }}>{searchError}</Alert>}

          {searchResults.length > 0 && (
            <Stack spacing={1.25} sx={{ mb: 3 }}>
              {searchResults.map((product, idx) => {
                const variants = Array.isArray(product.variants) && product.variants.length > 0
                  ? product.variants
                  : [{
                      sku: product.itemNumber,
                      itemNumber: product.itemNumber,
                      metalType: product.metalType,
                      karat: product.karat,
                      unitCost: product.unitCost,
                      unit: product.unit,
                      inStock: product.inStock
                    }];

                return (
                  <Card key={`${product.itemNumber}-${idx}`} variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {product.description}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, mt: 0.5, mb: 1, flexWrap: 'wrap' }}>
                        <Chip size="small" label={product.category || 'supplies'} />
                        <Chip size="small" variant="outlined" label={`${variants.length} SKU${variants.length > 1 ? 's' : ''}`} />
                      </Box>

                      <Stack spacing={0.5}>
                        {variants.map((variant, vIdx) => (
                          <Box
                            key={`${variant.sku || variant.itemNumber || vIdx}`}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              border: '1px solid',
                              borderColor: 'divider',
                              borderRadius: 1,
                              px: 1,
                              py: 0.75
                            }}
                          >
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {variant.sku || variant.itemNumber}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {(variant.metalType || 'n/a').replace('_', ' ')} {variant.karat || ''}
                                {' '}| ${Number(variant.unitCost || 0).toFixed(2)} / {variant.unit || 'each'}
                              </Typography>
                            </Box>
                            <Button
                              size="small"
                              variant="contained"
                              startIcon={<AddIcon />}
                              onClick={() => onAddFromSearch(product, variant)}
                            >
                              Add SKU
                            </Button>
                          </Box>
                        ))}
                      </Stack>
                    </CardContent>
                  </Card>
                );
              })}
            </Stack>
          )}

          <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
            Manual Item Number (fallback)
          </Typography>
          <TextField
            fullWidth
            label="Stuller Item Number"
            value={stullerItemNumber}
            onChange={(e) => setStullerItemNumber(e.target.value)}
            placeholder="e.g., SOLDER:77433:P"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Close</Button>
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
    
    </>
  );
};
