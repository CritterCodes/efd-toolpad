"use client";

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  Box,
  Container,
  Typography,
  Button,
  Tab,
  Tabs,
  Alert,
  Paper,
  CircularProgress
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DiamondIcon from '@mui/icons-material/Diamond';
import GemstonCreationForm from '@/components/products/GemstonCreationForm';
import GemCutterProductsPage from '@/components/products/GemCutterProductsPage';

// Tab panel component
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`products-tabpanel-${index}`}
      aria-labelledby={`products-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function GemstonesManagementPage() {
  const { data: session, status } = useSession();
  const [currentTab, setCurrentTab] = useState(0);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [userCanCreateProducts, setUserCanCreateProducts] = useState(false);

  // Check if user can create/manage gemstone products
  useEffect(() => {
    if (session?.user) {
      const userRole = session.user.role;
      const artisanTypes = session.user.artisanTypes || [];
      
      // Allow gem cutters, admins, and devs to manage gemstones
      const canManage = userRole === 'admin' || 
                       userRole === 'dev' || 
                       (userRole === 'artisan' && artisanTypes.includes('Gem Cutter'));
      
      setUserCanCreateProducts(canManage);
    }
  }, [session]);

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const handleCreateNew = () => {
    setShowCreateForm(true);
    setCurrentTab(0); // Switch to "Create" tab
  };

  const handleFormClose = () => {
    setShowCreateForm(false);
  };

  const handleFormSuccess = () => {
    setShowCreateForm(false);
    setCurrentTab(1); // Switch to "My Gemstones" tab to see the new product
  };

  // Loading state
  if (status === 'loading') {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  // Not authenticated
  if (!session) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">
          You must be logged in to access gemstone management.
        </Alert>
      </Container>
    );
  }

  // Not authorized
  if (!userCanCreateProducts) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="warning">
          <Typography variant="h6" gutterBottom>
            Gemstone Management Access Required
          </Typography>
          <Typography>
            Only gem cutters, administrators, and developers can manage gemstone inventory. 
            If you are a gem cutter, please ensure your artisan profile includes &quot;Gem Cutter&quot; 
            in your artisan types.
          </Typography>
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Page Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box display="flex" alignItems="center" gap={2}>
          <DiamondIcon color="primary" sx={{ fontSize: 32 }} />
          <Typography variant="h4" component="h1">
            Gemstone Management
          </Typography>
        </Box>
        
        {userCanCreateProducts && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateNew}
            size="large"
          >
            Add New Gemstone
          </Button>
        )}
      </Box>

      {/* Description */}
      <Typography variant="body1" color="text.secondary" mb={4}>
        Manage your gemstone inventory. Add new gemstones with detailed specifications,
        track their status, and make them available for jewelry designers and customers.
        All gemstone listings require admin approval before becoming publicly visible.
      </Typography>

      {/* Navigation Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          aria-label="gemstone management tabs"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab 
            label={showCreateForm ? "Create New Gemstone" : "Overview"} 
            id="products-tab-0"
            aria-controls="products-tabpanel-0"
          />
          <Tab 
            label="My Gemstones" 
            id="products-tab-1"
            aria-controls="products-tabpanel-1"
          />
          <Tab 
            label="Draft Listings" 
            id="products-tab-2"
            aria-controls="products-tabpanel-2"
          />
          <Tab 
            label="Pending Approval" 
            id="products-tab-3"
            aria-controls="products-tabpanel-3"
          />
        </Tabs>

        {/* Tab Content */}
        <TabPanel value={currentTab} index={0}>
          {showCreateForm ? (
            <GemstonCreationForm
              onSuccess={handleFormSuccess}
              onCancel={handleFormClose}
            />
          ) : (
            <Box textAlign="center" py={6}>
              <DiamondIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h5" gutterBottom>
                Welcome to Gemstone Management
              </Typography>
              <Typography variant="body1" color="text.secondary" mb={3}>
                Create detailed listings for your gemstones with comprehensive specifications
                including weight, dimensions, cut quality, origin, and treatment information.
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleCreateNew}
                size="large"
              >
                Create Your First Gemstone Listing
              </Button>
            </Box>
          )}
        </TabPanel>

        <TabPanel value={currentTab} index={1}>
          <GemCutterProductsPage 
            filterStatus="all"
            showCreateButton={false}
          />
        </TabPanel>

        <TabPanel value={currentTab} index={2}>
          <GemCutterProductsPage 
            filterStatus="draft"
            showCreateButton={false}
          />
        </TabPanel>

        <TabPanel value={currentTab} index={3}>
          <GemCutterProductsPage 
            filterStatus="pending"
            showCreateButton={false}
          />
        </TabPanel>
      </Paper>

      {/* Help Information */}
      <Paper sx={{ p: 3, bgcolor: 'grey.50' }}>
        <Typography variant="h6" gutterBottom>
          💡 Getting Started with Gemstone Listings
        </Typography>
        <Typography variant="body2" component="div">
          <strong>Required Information:</strong>
          <ul>
            <li><strong>Basic Details:</strong> Title, quantity, price, and description</li>
            <li><strong>Physical Properties:</strong> Weight in carats, dimensions (L×W×H)</li>
            <li><strong>Classification:</strong> Shape, cut quality, species, and subspecies</li>
            <li><strong>Origin & Characteristics:</strong> Country, locale, color, and clarity</li>
            <li><strong>Treatment Information:</strong> Natural vs. lab-grown, any treatments applied</li>
            <li><strong>Certification:</strong> Lab certification details if available</li>
          </ul>
          
          <strong>Approval Process:</strong><br />
          All gemstone listings are reviewed by our team before being made public to ensure 
          quality and accuracy. You&apos;ll be notified when your listing is approved or if any 
          changes are needed.
        </Typography>
      </Paper>
    </Container>
  );
}