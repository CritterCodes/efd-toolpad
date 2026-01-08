/**
 * Enhanced Process-Based Task Builder Integration
 * 
 * This file shows how to integrate universal pricing into your existing
 * process-based task builder while preserving the UI you love.
 * 
 * Usage: Import and use these components in your existing task builder page.
 */

import React from 'react';
import { Box, Alert, Typography } from '@mui/material';
import { UniversalTaskBuilder, useUniversalTaskPricing } from './UniversalTaskBuilder';

// Enhanced price preview that replaces your existing calculatePricePreview
export function useEnhancedPricePreview(adminSettings, availableProcesses, formData) {
  const { calculatePricing, universalPricing, loading } = useUniversalTaskPricing();

  const calculatePricePreview = React.useCallback(async () => {
    if (!adminSettings || formData.processes.length === 0) {
      return null;
    }

    try {
      // Use the same process data structure from your existing code
      const taskData = {
        processes: formData.processes.map(processSelection => ({
          processId: processSelection.processId,
          quantity: processSelection.quantity || 1
        })),
        laborCost: formData.service?.laborCost || 0
      };

      const result = await calculatePricing(taskData);
      return result;
      
    } catch (error) {
      console.error('Enhanced price preview calculation error:', error);
      throw error;
    }
  }, [adminSettings, formData.processes, formData.service, calculatePricing]);

  return {
    calculatePricePreview,
    universalPricing,
    loading
  };
}

// Drop-in replacement for your existing price preview display
export function EnhancedPricePreview({ 
  pricePreview, 
  adminSettings,
  loading = false 
}) {
  if (loading) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        Calculating universal pricing for all metal types...
      </Alert>
    );
  }

  if (!pricePreview) {
    return (
      <Alert severity="warning" sx={{ mt: 2 }}>
        Add processes to see universal pricing preview
      </Alert>
    );
  }

  return (
    <Box sx={{ mt: 2 }}>
      {/* Your existing price preview components can stay exactly the same */}
      {/* The universal pricing preview will be handled by UniversalPricingPreview */}
      
      {/* Optional: Show compatibility with existing price structure */}
      {pricePreview.legacyCompatibility && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Task pricing calculated for {pricePreview.supportedMetals?.length || 0} metal combinations
        </Alert>
      )}
    </Box>
  );
}

// Integration helper for your existing form submit
export function enhanceTaskSubmission(formData, universalPricing) {
  return {
    ...formData,
    // Remove old metal-specific fields
    // metalType: undefined,
    // karat: undefined,
    
    // Add universal pricing structure
    pricing: universalPricing,
    universalTask: true,
    supportedMetals: universalPricing ? 
      Object.keys(universalPricing).map(metalKey => {
        const [metalType, karat] = metalKey.split('_');
        return { metalType, karat };
      }) : []
  };
}

// Instructions for integrating with your existing process-based page:
export const INTEGRATION_GUIDE = `
To integrate universal pricing with your existing process-based task builder:

1. Wrap your existing component with UniversalTaskBuilder:

   export default function ProcessBasedTaskBuilder() {
     return (
       <UniversalTaskBuilder>
         {/* Your existing component content */}
       </UniversalTaskBuilder>
     );
   }

2. Replace your calculatePricePreview function:

   const { calculatePricePreview, universalPricing, loading } = useEnhancedPricePreview(
     adminSettings, 
     availableProcesses, 
     formData
   );

3. Update your form submission:

   const handleSubmit = async () => {
     const enhancedFormData = enhanceTaskSubmission(formData, universalPricing);
     // Submit enhancedFormData instead of formData
   };

4. Your existing UI stays the same - just the pricing becomes universal!
`;

// Example of how your existing component would look with minimal changes:
export function IntegratedProcessBasedTaskBuilder() {
  // All your existing state and logic stays the same
  const [formData, setFormData] = React.useState({
    title: '',
    description: '',
    category: 'shanks',
    subcategory: '',
    // Remove: metalType: 'yellow_gold',
    // Remove: karat: '14k',
    requiresMetalType: true,
    processes: [],
    materials: [],
    service: {
      estimatedDays: 3,
      rushDays: 1,
      rushMultiplier: 1.5,
      requiresApproval: true,
      requiresInspection: true,
      canBeBundled: true
    },
    display: {
      isActive: true,
      isFeatured: false,
      sortOrder: 0
    }
  });

  // Replace your calculatePricePreview with universal version
  const { 
    calculatePricePreview, 
    universalPricing, 
    loading 
  } = useEnhancedPricePreview(null, [], formData); // Pass your actual adminSettings and availableProcesses

  const handleSubmit = async () => {
    try {
      // Enhance form data with universal pricing
      const enhancedFormData = enhanceTaskSubmission(formData, universalPricing);
      
      // Use your existing submission logic
      // await submitTask(enhancedFormData);
      
    } catch (error) {
      console.error('Task submission error:', error);
    }
  };

  return (
    <UniversalTaskBuilder>
      {/* All your existing JSX stays exactly the same! */}
      {/* The metal context selector will appear at the top */}
      {/* The pricing preview will show universal pricing */}
      
      <Box>
        <Typography variant="h4">
          Process-Based Task Builder (Enhanced)
        </Typography>
        
        {/* Your existing form fields */}
        {/* Your existing process selection */}
        {/* Your existing material selection */}
        
        {/* Enhanced price preview */}
        <EnhancedPricePreview 
          pricePreview={{ universalPricing, supportedMetals: universalPricing ? Object.keys(universalPricing) : [] }}
          loading={loading}
        />
        
        {/* Your existing submit button */}
      </Box>
    </UniversalTaskBuilder>
  );
}
