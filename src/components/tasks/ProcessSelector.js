/**
 * ProcessSelector.js - Enhanced process selector with universal pricing impact
 * 
 * Shows how process selection affects task pricing across all metal types.
 * Integrates seamlessly with your existing process selection UI.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Grid,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Badge
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { PricingService } from '../../services/PricingService';
import { useMetalContext } from '../../contexts/MetalContextProvider';

export function UniversalProcessSelector({ 
  availableProcesses = [], 
  selectedProcesses = [],
  onProcessesChange,
  maxSelection = null 
}) {
  const { currentMetalContext, getCurrentDisplayName } = useMetalContext();
  const [expandedProcess, setExpandedProcess] = useState(null);

  // Calculate how each process affects pricing
  const processAnalysis = useMemo(() => {
    return availableProcesses.map(process => {
      const isSelected = selectedProcesses.some(sp => sp.processId === process._id);
      const selectionData = selectedProcesses.find(sp => sp.processId === process._id);
      const quantity = selectionData?.quantity || 1;

      // Get pricing stats for this process
      const pricingStats = process.pricing ? 
        PricingService.calculatePricingStats(process.pricing) : null;

      // Get price for current metal context
      const currentPrice = process.pricing ?
        PricingService.getPriceForMetal(
          process.pricing,
          currentMetalContext.metalType,
          currentMetalContext.karat
        ) : null;

      return {
        ...process,
        isSelected,
        quantity,
        pricingStats,
        currentPrice,
        totalCurrentPrice: currentPrice ? currentPrice * quantity : null,
        isCurrentMetalSupported: currentPrice !== null
      };
    });
  }, [availableProcesses, selectedProcesses, currentMetalContext]);

  // Calculate total impact of selected processes
  const totalImpact = useMemo(() => {
    const selectedAnalysis = processAnalysis.filter(p => p.isSelected);
    
    if (selectedAnalysis.length === 0) {
      return {
        totalCurrentPrice: 0,
        supportedCount: 0,
        unsupportedCount: 0,
        priceRange: null
      };
    }

    // Calculate total for current metal context
    const totalCurrentPrice = selectedAnalysis.reduce((sum, process) => {
      return sum + (process.totalCurrentPrice || 0);
    }, 0);

    // Count support
    const supportedCount = selectedAnalysis.filter(p => p.isCurrentMetalSupported).length;
    const unsupportedCount = selectedAnalysis.length - supportedCount;

    // Calculate price range across all metals (simplified)
    const allPrices = selectedAnalysis
      .filter(p => p.pricingStats)
      .map(p => ({
        min: p.pricingStats.min * p.quantity,
        max: p.pricingStats.max * p.quantity
      }));

    const priceRange = allPrices.length > 0 ? {
      min: allPrices.reduce((sum, p) => sum + p.min, 0),
      max: allPrices.reduce((sum, p) => sum + p.max, 0)
    } : null;

    return {
      totalCurrentPrice,
      supportedCount,
      unsupportedCount,
      priceRange
    };
  }, [processAnalysis]);

  const handleProcessToggle = (process) => {
    if (process.isSelected) {
      // Remove process
      const newSelection = selectedProcesses.filter(sp => sp.processId !== process._id);
      onProcessesChange(newSelection);
    } else {
      // Add process
      if (maxSelection && selectedProcesses.length >= maxSelection) {
        return; // Max selection reached
      }
      
      const newSelection = [...selectedProcesses, {
        processId: process._id,
        quantity: 1
      }];
      onProcessesChange(newSelection);
    }
  };

  const handleQuantityChange = (processId, newQuantity) => {
    if (newQuantity < 1) {
      // Remove if quantity goes to 0
      const newSelection = selectedProcesses.filter(sp => sp.processId !== processId);
      onProcessesChange(newSelection);
      return;
    }

    const newSelection = selectedProcesses.map(sp => 
      sp.processId === processId 
        ? { ...sp, quantity: newQuantity }
        : sp
    );
    onProcessesChange(newSelection);
  };

  return (
    <Box>
      {/* Selection Summary */}
      {selectedProcesses.length > 0 && (
        <Card sx={{ mb: 2, bgcolor: 'primary.light' }}>
          <CardContent>
            <Typography variant="h6" color="primary.contrastText" gutterBottom>
              Selected Processes Impact
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={6} sm={3}>
                <Typography variant="body2" color="primary.contrastText">
                  {getCurrentDisplayName()} Total:
                </Typography>
                <Typography variant="h5" color="primary.contrastText" fontWeight="bold">
                  {PricingService.formatPrice(totalImpact.totalCurrentPrice)}
                </Typography>
              </Grid>
              
              <Grid item xs={6} sm={3}>
                <Typography variant="body2" color="primary.contrastText">
                  Processes Selected:
                </Typography>
                <Typography variant="h5" color="primary.contrastText" fontWeight="bold">
                  {selectedProcesses.length}
                </Typography>
              </Grid>

              {totalImpact.priceRange && (
                <>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="body2" color="primary.contrastText">
                      Min Total:
                    </Typography>
                    <Typography variant="h6" color="primary.contrastText">
                      {PricingService.formatPrice(totalImpact.priceRange.min)}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={6} sm={3}>
                    <Typography variant="body2" color="primary.contrastText">
                      Max Total:
                    </Typography>
                    <Typography variant="h6" color="primary.contrastText">
                      {PricingService.formatPrice(totalImpact.priceRange.max)}
                    </Typography>
                  </Grid>
                </>
              )}
            </Grid>

            {totalImpact.unsupportedCount > 0 && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                {totalImpact.unsupportedCount} selected process(es) don&apos;t support {getCurrentDisplayName()}
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Process List */}
      <Box>
        <Typography variant="h6" gutterBottom>
          Available Processes ({processAnalysis.length})
        </Typography>

        {processAnalysis.map(process => (
          <Card 
            key={process._id} 
            sx={{ 
              mb: 2,
              border: process.isSelected ? '2px solid' : '1px solid',
              borderColor: process.isSelected ? 'primary.main' : 'divider',
              opacity: process.isCurrentMetalSupported ? 1 : 0.7
            }}
          >
            <CardContent>
              <Grid container spacing={2} alignItems="center">
                {/* Process Info */}
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="h6">
                      {process.displayName || process.name}
                    </Typography>
                    
                    {!process.isCurrentMetalSupported && (
                      <Chip 
                        label="Not compatible" 
                        size="small" 
                        color="warning" 
                        variant="outlined"
                      />
                    )}
                  </Box>
                  
                  {process.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {process.description}
                    </Typography>
                  )}

                  {/* Process pricing preview */}
                  {process.pricingStats && (
                    <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip 
                        label={`Range: ${process.pricingStats.formattedMin} - ${process.pricingStats.formattedMax}`}
                        size="small"
                        variant="outlined"
                      />
                      <Chip 
                        label={`${process.pricingStats.count} metals`}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                  )}
                </Grid>

                {/* Current Metal Price */}
                <Grid item xs={12} sm={3}>
                  {process.isCurrentMetalSupported ? (
                    <Box textAlign="center">
                      <Typography variant="body2" color="text.secondary">
                        {getCurrentDisplayName()}
                      </Typography>
                      <Typography variant="h5" color="primary.main" fontWeight="bold">
                        {PricingService.formatPrice(process.currentPrice)}
                      </Typography>
                      {process.isSelected && process.quantity > 1 && (
                        <Typography variant="body2" color="text.secondary">
                          Total: {PricingService.formatPrice(process.totalCurrentPrice)}
                        </Typography>
                      )}
                    </Box>
                  ) : (
                    <Box textAlign="center">
                      <Typography variant="h5" color="text.disabled">
                        N/A
                      </Typography>
                      <Typography variant="caption" color="text.disabled">
                        Not supported
                      </Typography>
                    </Box>
                  )}
                </Grid>

                {/* Actions */}
                <Grid item xs={12} sm={3}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
                    {process.isSelected ? (
                      <>
                        {/* Quantity Controls */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <IconButton 
                            size="small"
                            onClick={() => handleQuantityChange(process._id, process.quantity - 1)}
                          >
                            <RemoveIcon />
                          </IconButton>
                          
                          <Typography variant="h6" sx={{ minWidth: 20, textAlign: 'center' }}>
                            {process.quantity}
                          </Typography>
                          
                          <IconButton 
                            size="small"
                            onClick={() => handleQuantityChange(process._id, process.quantity + 1)}
                          >
                            <AddIcon />
                          </IconButton>
                        </Box>
                      </>
                    ) : (
                      <Tooltip title={
                        maxSelection && selectedProcesses.length >= maxSelection 
                          ? `Maximum ${maxSelection} processes allowed`
                          : 'Add this process'
                      }>
                        <span>
                          <IconButton 
                            color="primary"
                            disabled={maxSelection && selectedProcesses.length >= maxSelection}
                            onClick={() => handleProcessToggle(process)}
                          >
                            <AddIcon />
                          </IconButton>
                        </span>
                      </Tooltip>
                    )}

                    {/* Process Details */}
                    <IconButton 
                      size="small"
                      onClick={() => setExpandedProcess(
                        expandedProcess === process._id ? null : process._id
                      )}
                    >
                      <InfoIcon />
                    </IconButton>
                  </Box>
                </Grid>
              </Grid>

              {/* Expanded Details */}
              {expandedProcess === process._id && process.pricingStats && (
                <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Pricing for All Metal Types:
                  </Typography>
                  
                  <Grid container spacing={1}>
                    {process.pricingStats.metalBreakdown.map(metal => (
                      <Grid item xs={6} sm={4} md={3} key={metal.metalKey}>
                        <Box 
                          sx={{ 
                            p: 1, 
                            border: 1, 
                            borderColor: 'divider', 
                            borderRadius: 1,
                            bgcolor: metal.metalKey === 
                              `${currentMetalContext.metalType}_${currentMetalContext.karat}`
                              ? 'primary.light' : 'transparent'
                          }}
                        >
                          <Typography variant="caption" display="block">
                            {metal.displayName}
                          </Typography>
                          <Typography variant="body1" fontWeight="bold">
                            {metal.formattedPrice}
                          </Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>

                  {process.laborHours && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Labor Hours: {process.laborHours}
                      </Typography>
                    </Box>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>
        ))}

        {processAnalysis.length === 0 && (
          <Alert severity="info">
            No processes available. Load processes to build tasks.
          </Alert>
        )}
      </Box>
    </Box>
  );
}
