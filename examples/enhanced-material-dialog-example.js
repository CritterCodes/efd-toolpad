/**
 * Enhanced Material Dialog Integration Example
 * Shows how the new multi-variant system works with your existing Stuller fetch
 */

import React from 'react';
import EnhancedStullerService from '@/services/enhanced-stuller.service';

// Example usage in your materials manager hook
export const useEnhancedMaterialsManager = () => {
  const [formData, setFormData] = React.useState({
    // Standard fields
    name: '',
    displayName: '',
    category: 'solder',
    description: '',
    unitType: 'sheet',
    supplier: 'Stuller',
    
    // Single material fields (used when hasVariants = false)
    unitCost: 0,
    sku: '',
    stuller_item_number: '',
    karat: '',
    compatibleMetals: [],
    
    // Multi-variant fields (used when hasVariants = true)
    hasVariants: false,
    variants: [],
    
    // Other existing fields
    auto_update_pricing: true,
    portionsPerUnit: 1,
    portionType: 'piece',
    isActive: true
  });

  const [loadingStuller, setLoadingStuller] = React.useState(false);

  /**
   * Enhanced fetch Stuller data function
   * Now supports both single product and variant discovery
   */
  const fetchStullerData = async (itemNumber, isVariantMode = false) => {
    if (!itemNumber?.trim()) return;
    
    setLoadingStuller(true);
    
    try {
      const result = await EnhancedStullerService.fetchAndConvert(
        itemNumber, 
        isVariantMode, 
        formData
      );
      
      if (result.success) {
        setFormData(result.formData);
        
        // Show success message based on type
        if (result.type === 'variants') {
          console.log(`✅ ${result.message}`);
          console.log(`Created ${result.formData.variants.length} variants`);
        } else {
          console.log('✅ Product data fetched successfully');
        }
      } else {
        console.error('❌ Failed to fetch Stuller data:', result.error);
        // You could show an error toast here
      }
    } catch (error) {
      console.error('❌ Error fetching Stuller data:', error);
    } finally {
      setLoadingStuller(false);
    }
  };

  return {
    formData,
    setFormData,
    fetchStullerData,
    loadingStuller
    // ... other existing methods
  };
};

// Example workflow scenarios:

/**
 * Scenario 1: Creating a Single Material (Current Workflow)
 * User creates a material the traditional way
 */
const createSingleMaterialExample = () => {
  // 1. User opens "Add Material" dialog
  // 2. hasVariants toggle is OFF (default)
  // 3. User enters Stuller item number: "SOLDER:77433:P"
  // 4. User clicks "Fetch Data" 
  // 5. fetchStullerData("SOLDER:77433:P", false) is called
  // 6. Single product data is fetched and form is populated
  // 7. User can edit fields and save normally
  
  const resultFormData = {
    name: "cadmium_free_hard_plumb_solder_sheet",
    displayName: "Cadmium Free Hard Plumb Solder Sheet",
    category: "solder",
    unitCost: 111.41,
    karat: "14K",
    stuller_item_number: "SOLDER:77433:P",
    hasVariants: false,
    variants: []
  };
  
  console.log('Single material created:', resultFormData);
};

/**
 * Scenario 2: Creating a Multi-Variant Material (New Workflow)
 * User creates a material that supports multiple metal types/karats
 */
const createMultiVariantMaterialExample = () => {
  // 1. User opens "Add Material" dialog
  // 2. User toggles ON "Multi-Variant Material"
  // 3. hasVariants becomes true, pricing fields are hidden
  // 4. User enters Stuller item number: "SOLDER:77433:P"
  // 5. User clicks "Find Variants" (button text changes)
  // 6. fetchStullerData("SOLDER:77433:P", true) is called
  // 7. Related products are found and variants are created
  // 8. User can switch to "Variants" tab to see/edit variants
  // 9. User saves the multi-variant material
  
  const resultFormData = {
    name: "cadmium_free_hard_plumb_solder_sheet",
    displayName: "Cadmium Free Hard Plumb Solder Sheet", 
    category: "solder",
    hasVariants: true,
    variants: [
      {
        metalType: "gold",
        karat: "10k",
        unitCost: 85.20,
        sku: "MT-SO-G862",
        stullerProductId: "SOLDER:77431:P"
      },
      {
        metalType: "gold",
        karat: "14k", 
        unitCost: 111.41,
        sku: "MT-SO-G864",
        stullerProductId: "SOLDER:77433:P"
      },
      {
        metalType: "gold",
        karat: "18k",
        unitCost: 145.62,
        sku: "MT-SO-G866", 
        stullerProductId: "SOLDER:77434:P"
      }
    ],
    // Legacy fields cleared
    unitCost: null,
    sku: null,
    stuller_item_number: null
  };
  
  console.log('Multi-variant material created:', resultFormData);
};

/**
 * Scenario 3: Converting Existing Material to Multi-Variant
 * User converts an existing single material to support variants
 */
const convertExistingMaterialExample = () => {
  // Starting with your existing material structure:
  const existingMaterial = {
    "_id": "6896417006c19cd8cf71342a",
    "sku": "MT-SO-G864",
    "name": "14k_yellow_cadmium_free_hard_plumb_solder_sheet",
    "displayName": "14K Yellow Cadmium Free Hard Plumb Solder Sheet",
    "unitCost": 111.41,
    "karat": "14K",
    "stuller_item_number": "SOLDER:77433:P"
  };
  
  // 1. User opens edit dialog for existing material
  // 2. User toggles ON "Multi-Variant Material" 
  // 3. System converts current material to first variant
  // 4. User can click "Find Variants" to discover related products
  // 5. Additional variants are added automatically
  // 6. User saves the converted material
  
  const convertedMaterial = {
    "_id": "6896417006c19cd8cf71342a",
    "name": "cadmium_free_hard_plumb_solder_sheet", // Cleaned up
    "displayName": "Cadmium Free Hard Plumb Solder Sheet", // Cleaned up  
    "hasVariants": true,
    "variants": [
      // Original material becomes first variant
      {
        "metalType": "gold",
        "karat": "14k",
        "unitCost": 111.41,
        "sku": "MT-SO-G864",
        "stullerProductId": "SOLDER:77433:P"
      }
      // Additional variants discovered via Stuller fetch
    ],
    "unitCost": null, // Cleared for variant materials
    "sku": null,
    "stuller_item_number": null
  };
  
  console.log('Converted material:', convertedMaterial);
};

/**
 * Benefits Summary
 */
const benefitsSummary = {
  "Immediate Benefits": [
    "✅ Keep existing single material workflow unchanged",
    "✅ Stuller fetch continues to work exactly as before", 
    "✅ Enhanced fetch can find multiple related products",
    "✅ Visual toggle between single and multi-variant modes"
  ],
  
  "Long-term Benefits": [
    "🎯 Reduce material records by 80-90%",
    "🎯 Single process works across all metal types",
    "🎯 Bulk Stuller imports with variant discovery",
    "🎯 Dynamic pricing based on job requirements"
  ],
  
  "User Experience": [
    "👤 Familiar workflow for existing users",
    "👤 New capabilities available when needed",
    "👤 Clear visual indicators of material type",
    "👤 Tabbed interface for complex materials"
  ]
};

console.log('Benefits Summary:', benefitsSummary);

export {
  createSingleMaterialExample,
  createMultiVariantMaterialExample,
  convertExistingMaterialExample,
  benefitsSummary
};
