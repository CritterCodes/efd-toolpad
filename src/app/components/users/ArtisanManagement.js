"use client";
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  InputAdornment,
  Chip,
  Avatar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Tab,
  Tabs,
  Alert,
  Divider,
  Link as MuiLink,
  Tooltip
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Visibility as VisibilityIcon,
  Storefront as StoreIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  Link as LinkIcon,
  Sync as SyncIcon
} from '@mui/icons-material';
import Link from 'next/link';

const ARTISAN_TYPES = [
  { value: 'jeweler', label: 'Jeweler' },
  { value: 'designer', label: 'Designer' },
  { value: 'lapidarist', label: 'Lapidarist' },
  { value: 'metalworker', label: 'Metalworker' },
  { value: 'gemcutter', label: 'Gem Cutter' }
];

const ArtisanManagement = () => {
  const [artisans, setArtisans] = useState([]);
  const [vendorProfiles, setVendorProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredArtisans, setFilteredArtisans] = useState([]);
  const [selectedArtisan, setSelectedArtisan] = useState(null);
  const [vendorDialogOpen, setVendorDialogOpen] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [alert, setAlert] = useState(null);

  // Fetch artisans and vendor profiles
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch artisan users
      const artisansResponse = await fetch('/api/users?role=artisan');
      const artisansData = await artisansResponse.json();
      
      if (artisansData.success) {
        setArtisans(artisansData.data);
      }

      // Fetch vendor profiles from efd-shop
      const vendorsResponse = await fetch(`${process.env.NEXT_PUBLIC_SHOP_URL}/api/vendors`);
      const vendorsData = await vendorsResponse.json();
      
      if (vendorsData.success) {
        setVendorProfiles(vendorsData.data);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
      showAlert('Error fetching data', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter artisans based on search
  useEffect(() => {
    if (!searchQuery) {
      setFilteredArtisans(artisans);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = artisans.filter(artisan =>
        `${artisan.firstName} ${artisan.lastName}`.toLowerCase().includes(query) ||
        artisan.email.toLowerCase().includes(query) ||
        artisan.business?.toLowerCase().includes(query)
      );
      setFilteredArtisans(filtered);
    }
  }, [artisans, searchQuery]);

  const showAlert = (message, severity = 'info') => {
    setAlert({ message, severity });
    setTimeout(() => setAlert(null), 5000);
  };

  // Check if artisan has a corresponding vendor profile
  const getVendorProfile = (artisan) => {
    return vendorProfiles.find(vendor => vendor.vendorName === artisan.business);
  };

  // Sync artisan to vendor profile
  const syncToVendorProfile = async (artisan) => {
    try {
      setSyncing(true);
      const response = await fetch('/api/artisans/sync-vendor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: artisan._id,
          artisanData: artisan 
        })
      });

      const data = await response.json();
      
      if (data.success) {
        showAlert('Vendor profile synced successfully', 'success');
        fetchData(); // Refresh data
      } else {
        showAlert(data.error || 'Failed to sync vendor profile', 'error');
      }
    } catch (error) {
      console.error('Error syncing vendor profile:', error);
      showAlert('Error syncing vendor profile', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const handleCreateVendorProfile = (artisan) => {
    setSelectedArtisan(artisan);
    setVendorDialogOpen(true);
  };

  const ArtisanCard = ({ artisan }) => {
    const vendorProfile = getVendorProfile(artisan);
    const hasVendorProfile = !!vendorProfile;

    return (
      <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <CardContent sx={{ flexGrow: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: 'secondary.main' }}>
                {artisan.firstName[0]}{artisan.lastName[0]}
              </Avatar>
              <Box>
                <Typography variant="h6">
                  {artisan.firstName} {artisan.lastName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {artisan.email}
                </Typography>
              </Box>
            </Box>
            <Chip
              size="small"
              label={artisan.status}
              color={artisan.status === 'verified' ? 'success' : 'warning'}
            />
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Business Name:
            </Typography>
            <Typography variant="body1">
              {artisan.business || 'Not specified'}
            </Typography>
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Vendor Profile Status:
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                size="small"
                label={hasVendorProfile ? 'Synced' : 'Not Synced'}
                color={hasVendorProfile ? 'success' : 'warning'}
                icon={hasVendorProfile ? <LinkIcon /> : <BusinessIcon />}
              />
              {hasVendorProfile && (
                <Tooltip title="View on Shop">
                  <IconButton
                    size="small"
                    component={MuiLink}
                    href={`${process.env.NEXT_PUBLIC_SHOP_URL}/vendors/${vendorProfile.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <VisibilityIcon />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={() => {/* TODO: Edit artisan */}}
            >
              Edit User
            </Button>
            
            {hasVendorProfile ? (
              <Button
                size="small"
                variant="outlined"
                startIcon={<SyncIcon />}
                onClick={() => syncToVendorProfile(artisan)}
                disabled={syncing}
              >
                Re-sync
              </Button>
            ) : (
              <Button
                size="small"
                variant="contained"
                startIcon={<StoreIcon />}
                onClick={() => handleCreateVendorProfile(artisan)}
                disabled={!artisan.business}
              >
                Create Profile
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      {alert && (
        <Alert severity={alert.severity} sx={{ mb: 3 }} onClose={() => setAlert(null)}>
          {alert.message}
        </Alert>
      )}

      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Artisan Management
        </Typography>
        <Typography variant="body1" color="text.secondary" gutterBottom>
          Manage artisan accounts and their public vendor profiles on the shop.
        </Typography>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3 }}>
          <TextField
            placeholder="Search artisans..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 300 }}
          />
          
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {/* TODO: Create new artisan */}}
          >
            Add Artisan
          </Button>
        </Box>
      </Box>

      {/* Statistics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary">
                {artisans.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Artisans
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="success.main">
                {artisans.filter(a => getVendorProfile(a)).length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                With Profiles
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="warning.main">
                {artisans.filter(a => !getVendorProfile(a)).length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Need Profiles
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="secondary.main">
                {artisans.filter(a => a.status === 'verified').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Verified
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Artisan Cards */}
      <Grid container spacing={3}>
        {loading ? (
          <Grid item xs={12}>
            <Typography>Loading artisans...</Typography>
          </Grid>
        ) : filteredArtisans.length === 0 ? (
          <Grid item xs={12}>
            <Typography color="text.secondary" textAlign="center">
              No artisans found. {searchQuery && 'Try adjusting your search.'}
            </Typography>
          </Grid>
        ) : (
          filteredArtisans.map((artisan) => (
            <Grid item xs={12} sm={6} lg={4} key={artisan._id}>
              <ArtisanCard artisan={artisan} />
            </Grid>
          ))
        )}
      </Grid>

      {/* Vendor Profile Creation Dialog */}
      {/* TODO: Implement vendor profile creation dialog */}
    </Box>
  );
};

export default ArtisanManagement;