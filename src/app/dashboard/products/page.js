"use client";

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Alert,
  CircularProgress,
  Chip
} from '@mui/material';
import CategoryIcon from '@mui/icons-material/Category';
import DiamondIcon from '@mui/icons-material/Diamond';
import DesignServicesIcon from '@mui/icons-material/DesignServices';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useRouter } from 'next/navigation';

const PRODUCT_TYPE_INFO = {
  'Gem Cutter': {
    title: 'Gemstones',
    description: 'Manage your gemstone inventory with detailed specifications including weight, cut, clarity, origin, and treatment information.',
    icon: <DiamondIcon sx={{ fontSize: 40 }} />,
    path: '/dashboard/products/gemstones',
    status: 'available'
  },
  'Jeweler': {
    title: 'Jewelry',
    description: 'List finished jewelry pieces including rings, necklaces, bracelets, and custom designs for sale.',
    icon: <CategoryIcon sx={{ fontSize: 40 }} />,
    path: '/dashboard/products/jewelry',
    status: 'coming-soon'
  },
  'CAD Designer': {
    title: 'Designs',
    description: 'Showcase your CAD designs, 3D models, and offer custom design services to jewelers and customers.',
    icon: <DesignServicesIcon sx={{ fontSize: 40 }} />,
    path: '/dashboard/products/designs',
    status: 'coming-soon'
  },
  'Hand Engraver': {
    title: 'Engraving Services',
    description: 'Offer custom engraving services and showcase your hand engraving portfolio.',
    icon: <DesignServicesIcon sx={{ fontSize: 40 }} />,
    path: '/dashboard/products/engravings',
    status: 'coming-soon'
  }
};

export default function ProductsOverviewPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [availableProductTypes, setAvailableProductTypes] = useState([]);

  useEffect(() => {
    if (session?.user) {
      const userRole = session.user.role;
      const artisanTypes = session.user.artisanTypes || [];
      
      // Show all product types for admins and devs
      if (userRole === 'admin' || userRole === 'dev') {
        setAvailableProductTypes(Object.keys(PRODUCT_TYPE_INFO));
      }
      // Show only relevant types for artisans
      else if (userRole === 'artisan') {
        setAvailableProductTypes(artisanTypes.filter(type => PRODUCT_TYPE_INFO[type]));
      }
    }
  }, [session]);

  const handleNavigateToProduct = (productType) => {
    const info = PRODUCT_TYPE_INFO[productType];
    if (info?.path) {
      router.push(info.path);
    }
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
          You must be logged in to access product management.
        </Alert>
      </Container>
    );
  }

  // No product types available
  if (availableProductTypes.length === 0) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="info">
          <Typography variant="h6" gutterBottom>
            Product Management Not Available
          </Typography>
          <Typography>
            Product management is currently available only for artisans with specific 
            artisan types. If you&apos;re an artisan, please ensure your profile includes 
            your artisan specialties (Gem Cutter, Jeweler, CAD Designer, or Hand Engraver).
          </Typography>
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Page Header */}
      <Box mb={4}>
        <Box display="flex" alignItems="center" gap={2} mb={2}>
          <CategoryIcon color="primary" sx={{ fontSize: 32 }} />
          <Typography variant="h4" component="h1">
            Product Management
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary">
          Manage your product inventory and listings. Each product type has its own
          specialized interface tailored to your artisan specialty.
        </Typography>
      </Box>

      {/* Product Type Cards */}
      <Grid container spacing={3}>
        {availableProductTypes.map((productType) => {
          const info = PRODUCT_TYPE_INFO[productType];
          return (
            <Grid item xs={12} md={6} lg={4} key={productType}>
              <Card 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  position: 'relative',
                  transition: 'transform 0.2s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4
                  }
                }}
              >
                <CardContent sx={{ flexGrow: 1, pb: 1 }}>
                  <Box display="flex" alignItems="center" gap={2} mb={2}>
                    <Box color="primary.main">
                      {info.icon}
                    </Box>
                    <Typography variant="h6" component="h2">
                      {info.title}
                    </Typography>
                    {info.status === 'coming-soon' && (
                      <Chip 
                        label="Coming Soon" 
                        size="small" 
                        color="secondary" 
                        variant="outlined"
                      />
                    )}
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary">
                    {info.description}
                  </Typography>
                </CardContent>
                
                <CardActions sx={{ pt: 0, pb: 2, px: 2 }}>
                  <Button
                    variant={info.status === 'available' ? 'contained' : 'outlined'}
                    endIcon={<ArrowForwardIcon />}
                    onClick={() => handleNavigateToProduct(productType)}
                    disabled={info.status === 'coming-soon'}
                    fullWidth
                  >
                    {info.status === 'available' ? 'Manage' : 'Preview'}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Help Section */}
      <Box mt={6}>
        <Alert severity="info">
          <Typography variant="h6" gutterBottom>
            💡 Getting Started with Product Management
          </Typography>
          <Typography variant="body2" component="div">
            <strong>For Artisans:</strong>
            <ul>
              <li><strong>Gemstones:</strong> Currently available - Add detailed gemstone listings with specifications</li>
              <li><strong>Jewelry:</strong> Coming soon - Manage finished jewelry pieces and custom designs</li>
              <li><strong>Designs:</strong> Coming soon - Showcase CAD work and offer design services</li>
              <li><strong>Engraving:</strong> Coming soon - List engraving services and portfolio</li>
            </ul>
            
            <strong>Admin Approval:</strong><br />
            All product listings require administrator approval before becoming publicly visible.
            You&apos;ll receive notifications about the status of your product submissions.
          </Typography>
        </Alert>
      </Box>
    </Container>
  );
}