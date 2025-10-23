/**
 * Gem Cutter Products Management Page
 * Allows gem cutters to view, add, and manage their gemstone inventory
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Fab,
  Alert,
  Tab,
  Tabs,
  TextField,
  InputAdornment
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Visibility,
  Search,
  FilterList,
  Diamond,
  LocalOffer,
  Inventory
} from '@mui/icons-material';
import { useSession } from 'next-auth/react';
import GemstonCreationForm from '../components/products/GemstonCreationForm';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`products-tabpanel-${index}`}
      aria-labelledby={`products-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function GemCutterProductsPage() {
  const { data: session } = useSession();
  const [products, setProducts] = useState([]);
  const [tabValue, setTabValue] = useState(0);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Check if user is a gem cutter
  const artisanTypes = session?.user?.artisanTypes || [];
  const isGemCutter = artisanTypes.includes('Gem Cutter');

  useEffect(() => {
    if (isGemCutter) {
      fetchProducts();
    }
  }, [isGemCutter]);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/products?action=artisan-products&type=gemstone');
      const data = await response.json();
      
      if (data.success) {
        setProducts(data.data.products);
      } else {
        setError('Failed to fetch products');
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      setError('Failed to fetch products');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProduct = async (productData) => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/products?action=create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(productData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccess('Gemstone added successfully!');
        setShowCreateForm(false);
        fetchProducts(); // Refresh the list
      } else {
        setError(data.error || 'Failed to create gemstone');
      }
    } catch (error) {
      console.error('Error creating product:', error);
      setError('Failed to create gemstone');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
  };

  const handleUpdateProduct = async (productData) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/products/${editingProduct.productID}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(productData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccess('Gemstone updated successfully!');
        setEditingProduct(null);
        fetchProducts(); // Refresh the list
      } else {
        setError(data.error || 'Failed to update gemstone');
      }
    } catch (error) {
      console.error('Error updating product:', error);
      setError('Failed to update gemstone');
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'draft': return 'default';
      case 'sold': return 'error';
      case 'reserved': return 'warning';
      default: return 'default';
    }
  };

  const filteredProducts = products.filter(product =>
    product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.gemstoneData?.species?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.gemstoneData?.color?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const productsByStatus = {
    draft: filteredProducts.filter(p => p.status === 'draft'),
    active: filteredProducts.filter(p => p.status === 'active'),
    sold: filteredProducts.filter(p => p.status === 'sold'),
  };

  if (!isGemCutter) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Diamond sx={{ fontSize: 60, color: 'grey.400', mb: 2 }} />
        <Typography variant="h5" gutterBottom>
          Gem Cutter Access Required
        </Typography>
        <Typography variant="body1" color="text.secondary">
          This section is only available to verified gem cutters. 
          {artisanTypes.length > 0 ? (
            ' Your artisan types: ' + artisanTypes.join(', ')
          ) : (
            ' Please complete your artisan application first.'
          )}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Gemstone Inventory
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Manage your gemstone collection and listings
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setShowCreateForm(true)}
          size="large"
        >
          Add Gemstone
        </Button>
      </Box>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Search and Filters */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search gemstones by title, species, or color..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            )
          }}
          sx={{ maxWidth: 400 }}
        />
      </Box>

      {/* Status Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab 
            label={`Draft (${productsByStatus.draft.length})`} 
            icon={<Edit />}
          />
          <Tab 
            label={`Active (${productsByStatus.active.length})`} 
            icon={<Visibility />}
          />
          <Tab 
            label={`Sold (${productsByStatus.sold.length})`} 
            icon={<LocalOffer />}
          />
        </Tabs>
      </Box>

      {/* Product Grids */}
      <TabPanel value={tabValue} index={0}>
        <ProductGrid 
          products={productsByStatus.draft} 
          onEdit={handleEditProduct}
          isLoading={isLoading}
          emptyMessage="No draft gemstones. Create your first listing!"
        />
      </TabPanel>
      
      <TabPanel value={tabValue} index={1}>
        <ProductGrid 
          products={productsByStatus.active} 
          onEdit={handleEditProduct}
          isLoading={isLoading}
          emptyMessage="No active listings. Publish some gemstones to make them available!"
        />
      </TabPanel>
      
      <TabPanel value={tabValue} index={2}>
        <ProductGrid 
          products={productsByStatus.sold} 
          onEdit={handleEditProduct}
          isLoading={isLoading}
          emptyMessage="No sold gemstones yet."
        />
      </TabPanel>

      {/* Create Form Dialog */}
      <Dialog 
        open={showCreateForm} 
        onClose={() => setShowCreateForm(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>Add New Gemstone</DialogTitle>
        <DialogContent>
          <GemstonCreationForm 
            onSubmit={handleCreateProduct}
            onCancel={() => setShowCreateForm(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Form Dialog */}
      <Dialog 
        open={!!editingProduct} 
        onClose={() => setEditingProduct(null)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>Edit Gemstone</DialogTitle>
        <DialogContent>
          <GemstonCreationForm 
            initialData={editingProduct}
            onSubmit={handleUpdateProduct}
            onCancel={() => setEditingProduct(null)}
          />
        </DialogContent>
      </Dialog>

      {/* Floating Action Button for Mobile */}
      <Fab
        color="primary"
        aria-label="add gemstone"
        sx={{ 
          position: 'fixed', 
          bottom: 16, 
          right: 16,
          display: { xs: 'flex', md: 'none' }
        }}
        onClick={() => setShowCreateForm(true)}
      >
        <Add />
      </Fab>
    </Box>
  );
}

// Product Grid Component
function ProductGrid({ products, onEdit, isLoading, emptyMessage }) {
  if (isLoading) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography>Loading gemstones...</Typography>
      </Box>
    );
  }

  if (products.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Inventory sx={{ fontSize: 60, color: 'grey.400', mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          {emptyMessage}
        </Typography>
      </Box>
    );
  }

  return (
    <Grid container spacing={3}>
      {products.map((product) => (
        <Grid item xs={12} sm={6} md={4} key={product.productID}>
          <ProductCard product={product} onEdit={() => onEdit(product)} />
        </Grid>
      ))}
    </Grid>
  );
}

// Individual Product Card Component
function ProductCard({ product, onEdit }) {
  const gemstoneData = product.gemstoneData || {};
  
  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {product.images?.[0] && (
        <CardMedia
          component="img"
          height={200}
          image={product.images[0]}
          alt={product.title}
        />
      )}
      <CardContent sx={{ flexGrow: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
          <Typography variant="h6" component="h3" gutterBottom>
            {product.title}
          </Typography>
          <Chip 
            label={product.status} 
            color={getStatusColor(product.status)} 
            size="small"
          />
        </Box>
        
        <Typography variant="h5" color="primary" gutterBottom>
          {formatPrice(product.price)}
        </Typography>
        
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {gemstoneData.weight}ct • {gemstoneData.shape} • {gemstoneData.species}
          </Typography>
          {gemstoneData.color && (
            <Typography variant="body2" color="text.secondary">
              {gemstoneData.color}
            </Typography>
          )}
          {gemstoneData.origin && (
            <Typography variant="body2" color="text.secondary">
              Origin: {gemstoneData.origin}
            </Typography>
          )}
        </Box>

        {product.mountingRequired && (
          <Chip 
            label={`Mounting: ${product.mountingType || 'Required'}`}
            size="small"
            variant="outlined"
            sx={{ mb: 1 }}
          />
        )}
      </CardContent>
      
      <Box sx={{ p: 2, pt: 0, display: 'flex', justifyContent: 'space-between' }}>
        <IconButton onClick={onEdit} color="primary">
          <Edit />
        </IconButton>
        <IconButton color="default">
          <Visibility />
        </IconButton>
      </Box>
    </Card>
  );
}

function getStatusColor(status) {
  switch (status) {
    case 'active': return 'success';
    case 'draft': return 'default';
    case 'sold': return 'error';
    case 'reserved': return 'warning';
    default: return 'default';
  }
}

function formatPrice(price) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(price);
}