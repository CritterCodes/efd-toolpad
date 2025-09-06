/**
 * UniversalTaskBuilder.js - Enhanced task builder with universal pricing
 * 
 * Modular components that preserve your existing process-based task builder UI
 * while adding universal pricing and metal context support.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Alert, 
  Card,
  CardContent,
  Chip,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { MetalContextProvider, useMetalContext } from '../../../contexts/MetalContextProvider';
import { TaskService } from '../../../services/TaskService';
import { PricingService } from '../../../services/PricingService';

// Metal Context Display Component
export function MetalContextDisplay({ showSelector = true, compact = false }) {
  const {
    currentMetalContext,
    getCurrentDisplayName,
    getMetalTypeOptions,
    getKaratOptions,
    setMetalType,
    setKarat,
    error
  } = useMetalContext();

  if (compact) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="body2" color="text.secondary">
          Metal Context:
        </Typography>
        <Chip 
          label={getCurrentDisplayName()} 
          size="small" 
          color="primary"
          variant="outlined"
        />
      </Box>
    );
  }

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Metal Context
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Metal Type</InputLabel>
              <Select
                value={currentMetalContext.metalType}
                label="Metal Type"
                onChange={(e) => setMetalType(e.target.value)}
              >
                {getMetalTypeOptions().map(option => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Karat/Purity</InputLabel>
              <Select
                value={currentMetalContext.karat}
                label="Karat/Purity"
                onChange={(e) => setKarat(e.target.value)}
              >
                {getKaratOptions().map(option => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Selected Context:
          </Typography>
          <Chip 
            label={getCurrentDisplayName()} 
            color="primary" 
          />
        </Box>
      </CardContent>
    </Card>
  );
}

// Universal Pricing Preview Component
export function UniversalPricingPreview({ universalPricing, loading = false }) {
  const { currentMetalContext, getCurrentDisplayName } = useMetalContext();
  const [pricingStats, setPricingStats] = useState(null);
  const [currentPrice, setCurrentPrice] = useState(null);

  useEffect(() => {
    if (universalPricing) {
      const stats = PricingService.calculatePricingStats(universalPricing);
      setPricingStats(stats);
      
      const price = PricingService.getPriceForMetal(
        universalPricing,
        currentMetalContext.metalType,
        currentMetalContext.karat
      );
      setCurrentPrice(price);
    } else {
      setPricingStats(null);
      setCurrentPrice(null);
    }
  }, [universalPricing, currentMetalContext]);

  if (loading) {
    return (
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6">Calculating Universal Pricing...</Typography>
        </CardContent>
      </Card>
    );
  }

  if (!pricingStats) {
    return null;
  }

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Universal Pricing Preview
        </Typography>

        {/* Current Metal Context Price */}
        <Box sx={{ mb: 2, p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle1" color="primary.contrastText">
                {getCurrentDisplayName()} Price:
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography 
                variant="h5" 
                color="primary.contrastText" 
                fontWeight="bold"
              >
                {currentPrice !== null 
                  ? PricingService.formatPrice(currentPrice)
                  : 'Not Available'
                }
              </Typography>
            </Grid>
          </Grid>
        </Box>

        {/* Pricing Statistics */}
        <Grid container spacing={2}>
          <Grid item xs={4}>
            <Box textAlign="center">
              <Typography variant="body2" color="text.secondary">
                Min Price
              </Typography>
              <Typography variant="h6" color="success.main">
                {pricingStats.formattedMin}
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={4}>
            <Box textAlign="center">
              <Typography variant="body2" color="text.secondary">
                Average
              </Typography>
              <Typography variant="h6">
                {pricingStats.formattedAverage}
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={4}>
            <Box textAlign="center">
              <Typography variant="body2" color="text.secondary">
                Max Price
              </Typography>
              <Typography variant="h6" color="warning.main">
                {pricingStats.formattedMax}
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {/* Metal Breakdown */}
        <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
          All Metal Combinations ({pricingStats.count} total):
        </Typography>
        
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {pricingStats.metalBreakdown.map(metal => (
            <Chip
              key={metal.metalKey}
              label={`${metal.displayName}: ${metal.formattedPrice}`}
              size="small"
              color={metal.metalKey === 
                `${currentMetalContext.metalType}_${currentMetalContext.karat}` 
                ? 'primary' : 'default'
              }
              variant={metal.metalKey === 
                `${currentMetalContext.metalType}_${currentMetalContext.karat}` 
                ? 'filled' : 'outlined'
              }
            />
          ))}
        </Box>
      </CardContent>
    </Card>
  );
}

// Enhanced Process Selection Component (preserves your existing UI)
export function UniversalProcessSelection({ 
  processes, 
  availableProcesses,
  onProcessesChange,
  onPricingUpdate 
}) {
  const { currentMetalContext } = useMetalContext();
  const [pricingPreview, setPricingPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  // Calculate universal pricing when processes change
  const calculateUniversalPricing = useCallback(async (selectedProcesses) => {
    if (selectedProcesses.length === 0) {
      setPricingPreview(null);
      onPricingUpdate && onPricingUpdate(null);
      return;
    }

    setLoading(true);
    try {
      const taskData = {
        processes: selectedProcesses.map(p => ({
          processId: p.processId,
          quantity: p.quantity || 1
        }))
      };

      const result = await TaskService.calculateTaskPricing(taskData);
      setPricingPreview(result.universalPricing);
      onPricingUpdate && onPricingUpdate(result.universalPricing);
      
    } catch (error) {
      console.error('Error calculating universal pricing:', error);
      setPricingPreview(null);
      onPricingUpdate && onPricingUpdate(null);
    } finally {
      setLoading(false);
    }
  }, [onPricingUpdate]);

  // Recalculate when processes change
  useEffect(() => {
    calculateUniversalPricing(processes);
  }, [processes, calculateUniversalPricing]);

  return (
    <Box>
      {/* Your existing process selection UI would go here */}
      {/* This preserves the drag/drop and selection interface you love */}
      
      {/* Universal pricing preview */}
      <UniversalPricingPreview 
        universalPricing={pricingPreview}
        loading={loading}
      />
    </Box>
  );
}

// Main Universal Task Builder Wrapper
export function UniversalTaskBuilder({ 
  children, 
  initialMetalContext = null,
  onMetalContextChange = null 
}) {
  return (
    <MetalContextProvider 
      initialMetalContext={initialMetalContext}
    >
      <UniversalTaskBuilderContent 
        onMetalContextChange={onMetalContextChange}
      >
        {children}
      </UniversalTaskBuilderContent>
    </MetalContextProvider>
  );
}

function UniversalTaskBuilderContent({ children, onMetalContextChange }) {
  const metalContext = useMetalContext();

  // Notify parent of metal context changes
  useEffect(() => {
    if (onMetalContextChange) {
      onMetalContextChange(metalContext.currentMetalContext);
    }
  }, [metalContext.currentMetalContext, onMetalContextChange]);

  return (
    <Box>
      {/* Metal Context Display */}
      <MetalContextDisplay />
      
      {/* Your existing task builder content */}
      {children}
    </Box>
  );
}

// Hook for existing components to use universal pricing
export function useUniversalTaskPricing() {
  const metalContext = useMetalContext();
  const [universalPricing, setUniversalPricing] = useState(null);
  const [loading, setLoading] = useState(false);

  const calculatePricing = useCallback(async (taskData) => {
    setLoading(true);
    try {
      const result = await TaskService.calculateTaskPricing(taskData);
      setUniversalPricing(result.universalPricing);
      return result;
    } catch (error) {
      console.error('Error calculating universal pricing:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const getCurrentPrice = useCallback(() => {
    if (!universalPricing) return null;
    
    return PricingService.getPriceForMetal(
      universalPricing,
      metalContext.currentMetalContext.metalType,
      metalContext.currentMetalContext.karat
    );
  }, [universalPricing, metalContext.currentMetalContext]);

  const getFormattedCurrentPrice = useCallback(() => {
    const price = getCurrentPrice();
    return price !== null ? PricingService.formatPrice(price) : 'N/A';
  }, [getCurrentPrice]);

  return {
    universalPricing,
    loading,
    calculatePricing,
    getCurrentPrice,
    getFormattedCurrentPrice,
    metalContext
  };
}
