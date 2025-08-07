/**
 * Mobile-optimized repair form utilities and responsive helpers
 */

import { useMediaQuery, useTheme } from '@mui/material';

export const useResponsiveLayout = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

  return {
    isMobile,
    isTablet,
    isDesktop,
    // Responsive grid settings
    gridSpacing: isMobile ? 1 : 2,
    cardPadding: isMobile ? 1 : 2,
    // Form field sizing
    textFieldVariant: isMobile ? 'filled' : 'outlined',
    // Modal/form sizing
    formMaxWidth: isMobile ? '100%' : 800,
    formPadding: isMobile ? 1 : 2
  };
};

export const RESPONSIVE_BREAKPOINTS = {
  mobile: 'down:sm',
  tablet: 'between:sm:md', 
  desktop: 'up:md'
};

// Form validation utilities
export const validateForm = (formData) => {
  const errors = {};
  
  // Required fields
  if (!formData.clientName?.trim()) {
    errors.clientName = 'Client name is required';
  }
  
  if (!formData.description?.trim()) {
    errors.description = 'Description is required';
  }
  
  if (!formData.promiseDate) {
    errors.promiseDate = 'Promise date is required';
  } else {
    const promiseDate = new Date(formData.promiseDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (promiseDate < today) {
      errors.promiseDate = 'Promise date cannot be in the past';
    }
  }
  
  // Ring size validation
  if (formData.isRing && formData.desiredRingSize && formData.currentRingSize) {
    if (formData.desiredRingSize === formData.currentRingSize) {
      errors.ringSize = 'Desired size must be different from current size';
    }
  }
  
  // At least one work item required
  const hasWorkItems = (formData.tasks?.length > 0) || 
                      (formData.processes?.length > 0) || 
                      (formData.materials?.length > 0) || 
                      (formData.customLineItems?.length > 0);
  
  if (!hasWorkItems) {
    errors.workItems = 'At least one task, process, material, or custom item is required';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Image handling utilities
export const handleImageCapture = (file) => {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve(null);
      return;
    }
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      reject(new Error('Please select a valid image file'));
      return;
    }
    
    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      reject(new Error('Image size must be less than 5MB'));
      return;
    }
    
    // Create preview URL
    const reader = new FileReader();
    reader.onload = (e) => {
      resolve({
        file,
        preview: e.target.result,
        name: file.name,
        size: file.size,
        type: file.type
      });
    };
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
};

// Calculate pricing utilities
export const calculateItemTotal = (item) => {
  const price = parseFloat(item.price || 0);
  const quantity = parseInt(item.quantity || 1);
  return price * quantity;
};

export const calculateSectionTotal = (items) => {
  return items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
};

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
};

// Form state management helpers
export const createInitialFormState = (clientInfo = null, initialData = null) => {
  return {
    // Client info
    userID: clientInfo?.userID || initialData?.userID || '',
    clientName: clientInfo?.name || initialData?.clientName || '',
    
    // Repair details
    description: initialData?.description || '',
    promiseDate: initialData?.promiseDate || '',
    isRush: initialData?.isRush || initialData?.priority === 'rush' || false,
    
    // Item details
    metalType: initialData?.metalType || '',
    karat: initialData?.karat || '',
    
    // Ring sizing
    isRing: initialData?.isRing || false,
    currentRingSize: initialData?.currentRingSize || '',
    desiredRingSize: initialData?.desiredRingSize || '',
    
    // Notes
    notes: initialData?.notes || '',
    internalNotes: initialData?.internalNotes || '',
    
    // Repair items
    tasks: initialData?.tasks || [],
    processes: initialData?.processes || [],
    materials: initialData?.materials || [],
    customLineItems: initialData?.customLineItems || [],
    
    // Pricing
    isWholesale: initialData?.isWholesale || false,
    
    // Image
    picture: initialData?.picture || null
  };
};

// Accessibility helpers
export const getAriaLabel = (section, count) => {
  const labels = {
    tasks: `Tasks section with ${count} items`,
    processes: `Processes section with ${count} items`, 
    materials: `Materials section with ${count} items`,
    custom: `Custom items section with ${count} items`
  };
  return labels[section] || `${section} section`;
};

export const getFocusableElements = (container) => {
  const selector = [
    'button:not([disabled])',
    '[href]',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(',');
  
  return container.querySelectorAll(selector);
};
