'use client';
import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
  Box, Typography, Chip, Grid, Card, CardContent, CardActions,
  InputAdornment, CircularProgress, Alert, Divider, Stack
} from '@mui/material';
import { Search as SearchIcon, Add as AddIcon, Inventory as InventoryIcon } from '@mui/icons-material';

const METAL_COLORS = {
  yellow_gold: '#FFD700', white_gold: '#E8E8E8', rose_gold: '#E8B4A0',
  silver: '#C0C0C0', platinum: '#E5E4E2', default: '#9E9E9E'
};

export default function StullerMaterialFinder({ open, onClose, onAddMaterial, initialQuery = '' }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [addedItems, setAddedItems] = useState(new Set());

  useEffect(() => {
    if (open && initialQuery) {
      setQuery(initialQuery);
      performSearch(initialQuery);
    }
    if (!open) { setAddedItems(new Set()); setError(''); }
  }, [open, initialQuery]);

  const performSearch = useCallback(async (searchQuery) => {
    const q = String(searchQuery || '').trim();
    if (!q) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/stuller/search?q=${encodeURIComponent(q)}`);
      const payload = await res.json();
      if (!res.ok || !payload?.success) throw new Error(payload?.error || 'Search failed');
      setResults(payload.results || []);
      if ((payload.results || []).length === 0) setError(`No results found for "${q}"`);
    } catch (err) {
      setError(err.message || 'Stuller search failed');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = () => performSearch(query);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') performSearch(query);
  };

  const handleAdd = (item, variant = null) => {
    const key = variant ? `${item.itemNumber}-${variant.sku || variant.metalType}` : item.itemNumber;
    setAddedItems(prev => new Set([...prev, key]));

    if (onAddMaterial) {
      onAddMaterial({
        stullerItemNumber: item.itemNumber,
        name: variant
          ? `${item.description} (${(variant.metalType || '').replace('_', ' ')} ${variant.karat || ''}`.trim() + ')'
          : item.description,
        category: item.category,
        unitCost: variant ? (variant.unitCost || 0) : (item.unitCost || 0),
        unit: variant ? (variant.unit || 'each') : (item.unit || 'each'),
        metalType: variant?.metalType || null,
        karat: variant?.karat || null
      });
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <InventoryIcon color="primary" />
        Stuller Material Finder
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            placeholder="Search by material name, category, or SKU..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
              endAdornment: loading ? <InputAdornment position="end"><CircularProgress size={20} /></InputAdornment> : null
            }}
          />
          <Button onClick={handleSearch} variant="outlined" sx={{ mt: 1 }} disabled={loading || !query.trim()}>
            Search
          </Button>
        </Box>

        {error && <Alert severity="info" sx={{ mb: 2 }}>{error}</Alert>}

        <Grid container spacing={2}>
          {results.map((item, idx) => {
            const hasVariants = Array.isArray(item.variants) && item.variants.length > 0;
            return (
              <Grid item xs={12} sm={6} key={item.itemNumber || idx}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent sx={{ pb: 1 }}>
                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom noWrap>
                      {item.description}
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 1 }}>
                      <Chip label={item.itemNumber} size="small" variant="outlined" />
                      <Chip label={item.category} size="small" color="primary" />
                      {item.inStock !== false && <Chip label="In Stock" size="small" color="success" />}
                    </Stack>
                    {!hasVariants && item.unitCost > 0 && (
                      <Typography variant="body2" color="success.main" fontWeight="bold">
                        ${item.unitCost.toFixed(2)} / {item.unit || 'each'}
                      </Typography>
                    )}
                    {hasVariants && (
                      <Box sx={{ mt: 1 }}>
                        <Divider sx={{ mb: 1 }} />
                        <Typography variant="caption" color="text.secondary">Variants:</Typography>
                        {item.variants.map((v, vi) => {
                          const vKey = `${item.itemNumber}-${v.sku || v.metalType || vi}`;
                          const isAdded = addedItems.has(vKey);
                          const dotColor = METAL_COLORS[v.metalType] || METAL_COLORS.default;
                          return (
                            <Box key={vi} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.5 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: dotColor, border: '1px solid #ccc', flexShrink: 0 }} />
                                <Typography variant="caption">
                                  {(v.metalType || '').replace('_', ' ')} {v.karat || ''} — ${(v.unitCost || 0).toFixed(2)}
                                </Typography>
                              </Box>
                              <Button size="small" variant={isAdded ? 'outlined' : 'contained'} color={isAdded ? 'success' : 'primary'} onClick={() => handleAdd(item, v)} startIcon={<AddIcon />} sx={{ minWidth: 70, fontSize: '0.7rem' }}>
                                {isAdded ? 'Added' : 'Add'}
                              </Button>
                            </Box>
                          );
                        })}
                      </Box>
                    )}
                  </CardContent>
                  {!hasVariants && (
                    <CardActions sx={{ pt: 0 }}>
                      <Button
                        size="small"
                        variant={addedItems.has(item.itemNumber) ? 'outlined' : 'contained'}
                        color={addedItems.has(item.itemNumber) ? 'success' : 'primary'}
                        startIcon={<AddIcon />}
                        onClick={() => handleAdd(item)}
                      >
                        {addedItems.has(item.itemNumber) ? 'Added' : 'Add to Process'}
                      </Button>
                    </CardActions>
                  )}
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
