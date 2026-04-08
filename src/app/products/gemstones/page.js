
'use client';
import React, { useState } from 'react';
import { Box, Typography, Button, Alert, Tab, Tabs, TextField, InputAdornment } from '@mui/material';
import { Add, Edit, Delete, Visibility, Search, LocalOffer } from '@mui/icons-material';
import { useSession } from 'next-auth/react';
import GemstoneGrid from '../../../components/products/gemstones/GemstoneGrid';
import { useGemstoneManagement } from '../../../hooks/products/gemstones/useGemstoneManagement';

export default function GemCutterProductsPage() {
  const sessionState = useSession() || {};
  const { data: session = null } = sessionState;
  const { products, loading, error, setError, success, setSuccess, handleDeleteProduct } = useGemstoneManagement('/api/products/gemstones');
  const [tabValue, setTabValue] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  const isGemCutter = session?.user?.artisanTypes?.includes('Gem Cutter');

  if (!isGemCutter) {
    return <Box sx={{p:3}}><Typography variant="h5">Gem Cutter Access Required</Typography></Box>;
  }

  const filteredProducts = products.filter(p => p.title?.toLowerCase().includes(searchTerm.toLowerCase()));
  const draftProducts = filteredProducts.filter(p => p.status === 'draft');
  const activeProducts = filteredProducts.filter(p => p.status === 'active');
  const soldProducts = filteredProducts.filter(p => p.status === 'sold');

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Gemstone Inventory</Typography>
        <Button variant="contained" startIcon={<Add />}>Add Gemstone</Button>
      </Box>
      {error && <Alert severity="error">{error}</Alert>}
      {success && <Alert severity="success">{success}</Alert>}
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, newVal) => setTabValue(newVal)}>
          <Tab label={`Draft (${draftProducts.length})`} />
          <Tab label={`Active (${activeProducts.length})`} />
          <Tab label={`Sold (${soldProducts.length})`} />
        </Tabs>
      </Box>

      {tabValue === 0 && <GemstoneGrid products={draftProducts} onDelete={handleDeleteProduct} isLoading={loading} />}
      {tabValue === 1 && <GemstoneGrid products={activeProducts} onDelete={handleDeleteProduct} isLoading={loading} />}
      {tabValue === 2 && <GemstoneGrid products={soldProducts} onDelete={handleDeleteProduct} isLoading={loading} />}
    </Box>
  );
}
