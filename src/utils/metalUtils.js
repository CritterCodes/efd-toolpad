/**
 * metalUtils.js - Metal type formatting and validation utilities
 * 
 * Utility functions for working with metal types, karats, and contexts.
 * Provides helper functions used across components and services.
 */

// Supported metal types and their valid karats
export const METAL_TYPES = {
  gold: ['10k', '14k', '18k', '22k'],
  silver: ['sterling', 'fine'], 
  platinum: ['900', '950'],
  palladium: ['500', '950'],
  titanium: ['grade1', 'grade2'],
  stainless: ['316L', '904L']
};

// Display names for metal types
export const METAL_DISPLAY_NAMES = {
  gold: 'Gold',
  silver: 'Silver',
  platinum: 'Platinum', 
  palladium: 'Palladium',
  titanium: 'Titanium',
  stainless: 'Stainless Steel'
};

// Display names for karats
export const KARAT_DISPLAY_NAMES = {
  '10k': '10K',
  '14k': '14K',
  '18k': '18K', 
  '22k': '22K',
  'sterling': 'Sterling',
  'fine': 'Fine',
  '900': '900 Pt',
  '950': '950 Pt',
  '500': '500 Pd',
  'grade1': 'Grade 1',
  'grade2': 'Grade 2',
  '316L': '316L',
  '904L': '904L'
};

/**
 * Format metal type and karat into standardized key
 */
export function formatMetalKey(metalType, karat) {
  if (!metalType || !karat) {
    throw new Error('Both metalType and karat are required');
  }

  const normalizedMetal = metalType.toLowerCase();
  const normalizedKarat = karat.toLowerCase();

  if (!METAL_TYPES[normalizedMetal]) {
    throw new Error(`Unsupported metal type: ${metalType}`);
  }

  if (!METAL_TYPES[normalizedMetal].includes(normalizedKarat)) {
    throw new Error(`Unsupported karat ${karat} for metal type ${metalType}`);
  }

  return `${normalizedMetal}_${normalizedKarat}`;
}

/**
 * Parse metal key into components
 */
export function parseMetalKey(metalKey) {
  if (!metalKey || typeof metalKey !== 'string') {
    throw new Error('Metal key is required and must be a string');
  }

  const parts = metalKey.split('_');
  if (parts.length !== 2) {
    throw new Error(`Invalid metal key format: ${metalKey}`);
  }

  const [metalType, karat] = parts;
  
  // Validate parsed values
  validateMetalContext({ metalType, karat });

  return { metalType, karat };
}

/**
 * Validate metal context
 */
export function validateMetalContext(context) {
  if (!context || typeof context !== 'object') {
    throw new Error('Metal context must be an object');
  }

  const { metalType, karat } = context;

  if (!metalType || !karat) {
    throw new Error('Metal context must include both metalType and karat');
  }

  const normalizedMetal = metalType.toLowerCase();
  const normalizedKarat = karat.toLowerCase();

  if (!METAL_TYPES[normalizedMetal]) {
    throw new Error(`Unsupported metal type: ${metalType}`);
  }

  if (!METAL_TYPES[normalizedMetal].includes(normalizedKarat)) {
    throw new Error(`Unsupported karat ${karat} for metal type ${metalType}`);
  }

  return true;
}

/**
 * Get display name for metal context
 */
export function getMetalDisplayName(metalType, karat) {
  const metalDisplay = METAL_DISPLAY_NAMES[metalType.toLowerCase()] || metalType;
  const karatDisplay = KARAT_DISPLAY_NAMES[karat.toLowerCase()] || karat;
  return `${metalDisplay} ${karatDisplay}`;
}

/**
 * Get all supported metal combinations
 */
export function getAllSupportedMetals() {
  const metals = [];

  for (const [metalType, karats] of Object.entries(METAL_TYPES)) {
    for (const karat of karats) {
      metals.push({
        metalType,
        karat,
        metalKey: formatMetalKey(metalType, karat),
        displayName: getMetalDisplayName(metalType, karat)
      });
    }
  }

  return metals;
}

/**
 * Get supported karats for metal type
 */
export function getSupportedKarats(metalType) {
  const normalizedMetal = metalType.toLowerCase();
  return METAL_TYPES[normalizedMetal] || [];
}

/**
 * Check if metal context is supported
 */
export function isMetalSupported(metalType, karat) {
  try {
    validateMetalContext({ metalType, karat });
    return true;
  } catch {
    return false;
  }
}

/**
 * Sort metal contexts by preference
 */
export function sortMetalsByPreference(metalContexts) {
  const metalOrder = ['gold', 'silver', 'platinum', 'palladium', 'titanium', 'stainless'];
  const karatOrder = {
    gold: ['14k', '18k', '10k', '22k'],
    silver: ['sterling', 'fine'],
    platinum: ['950', '900'], 
    palladium: ['950', '500'],
    titanium: ['grade2', 'grade1'],
    stainless: ['316L', '904L']
  };

  return metalContexts.sort((a, b) => {
    const aMetalIndex = metalOrder.indexOf(a.metalType);
    const bMetalIndex = metalOrder.indexOf(b.metalType);
    
    if (aMetalIndex !== bMetalIndex) {
      return aMetalIndex - bMetalIndex;
    }

    const metalKaratOrder = karatOrder[a.metalType] || [];
    const aKaratIndex = metalKaratOrder.indexOf(a.karat);
    const bKaratIndex = metalKaratOrder.indexOf(b.karat);
    
    return aKaratIndex - bKaratIndex;
  });
}

/**
 * Get metal type options for UI
 */
export function getMetalTypeOptions() {
  return Object.keys(METAL_TYPES).map(metalType => ({
    value: metalType,
    label: METAL_DISPLAY_NAMES[metalType] || metalType
  }));
}

/**
 * Get karat options for metal type
 */
export function getKaratOptions(metalType) {
  const karats = getSupportedKarats(metalType);
  return karats.map(karat => ({
    value: karat,
    label: KARAT_DISPLAY_NAMES[karat] || karat
  }));
}

/**
 * Extract metal context from various input formats
 */
export function extractMetalContext(input) {
  if (typeof input === 'string') {
    // Try to parse as metal key
    try {
      return parseMetalKey(input);
    } catch {
      // Try to extract from string patterns
      const lowerInput = input.toLowerCase();
      
      for (const [metalType, karats] of Object.entries(METAL_TYPES)) {
        for (const karat of karats) {
          if (lowerInput.includes(metalType) && lowerInput.includes(karat)) {
            return { metalType, karat };
          }
        }
      }
      
      throw new Error(`Could not extract metal context from: ${input}`);
    }
  }
  
  if (input && typeof input === 'object') {
    if (input.metalType && input.karat) {
      validateMetalContext(input);
      return { metalType: input.metalType, karat: input.karat };
    }
  }
  
  throw new Error('Invalid metal context input');
}

/**
 * Compare two metal contexts
 */
export function compareMetalContexts(context1, context2) {
  if (!context1 || !context2) return false;
  
  return context1.metalType === context2.metalType && context1.karat === context2.karat;
}

/**
 * Get metal context from URL parameters
 */
export function getMetalContextFromParams(searchParams) {
  const metalType = searchParams.get('metalType');
  const karat = searchParams.get('karat');
  
  if (metalType && karat) {
    try {
      validateMetalContext({ metalType, karat });
      return { metalType, karat };
    } catch {
      return null;
    }
  }
  
  return null;
}
