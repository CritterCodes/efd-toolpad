/**
 * Enhanced Stuller Service for Multi-Variant Materials
 * Extends existing Stuller functionality to support variant discovery
 */

import stullerIntegrationService from './stuller-integration.service';

export class EnhancedStullerService {
  /**
   * Enhanced fetch that can find single products or related variants
   * @param {string} itemNumber - Stuller item number
   * @param {boolean} findVariants - Whether to find related variants
   * @returns {Object} Stuller product data
   */
  static async fetchStullerProduct(itemNumber, findVariants = false) {
    try {
      if (findVariants) {
        // Find related products for variant creation
        return await this.findRelatedProducts(itemNumber);
      } else {
        // Standard single product fetch (existing functionality)
        return await this.fetchSingleProduct(itemNumber);
      }
    } catch (error) {
      console.error('Stuller fetch error:', error);
      throw error;
    }
  }

  /**
   * Fetch single product (existing functionality)
   */
  static async fetchSingleProduct(itemNumber) {
    // This would be your existing Stuller API call
    // For now, I'll create a mock response matching your existing material structure
    return this.mockSingleProductResponse(itemNumber);
  }

  /**
   * Find related products for variant creation
   */
  static async findRelatedProducts(itemNumber) {
    // This would search for related products based on the base item
    // For now, I'll create a mock response showing related products
    return this.mockRelatedProductsResponse(itemNumber);
  }

  /**
   * Mock single product response (replace with actual Stuller API)
   */
  static async mockSingleProductResponse(itemNumber) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Return mock data matching your existing structure
    return {
      success: true,
      data: {
        stuller_item_number: itemNumber,
        name: "cadmium_free_hard_plumb_solder_sheet",
        displayName: "Cadmium Free Hard Plumb Solder Sheet",
        description: "High-quality cadmium-free solder sheet",
        unitCost: 111.41,
        unitType: "sheet",
        category: "solder",
        supplier: "Stuller",
        karat: "14K",
        compatibleMetals: ["yellow_gold"],
        auto_update_pricing: true,
        portionsPerUnit: 30,
        portionType: "clip",
        costPerPortion: 3.714
      }
    };
  }

  /**
   * Mock related products response for variant creation
   */
  static async mockRelatedProductsResponse(baseItemNumber) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Extract base information and generate related products
    const baseProduct = {
      name: "cadmium_free_hard_plumb_solder_sheet",
      displayName: "Cadmium Free Hard Plumb Solder Sheet",
      description: "High-quality cadmium-free solder sheet",
      category: "solder",
      unitType: "sheet",
      supplier: "Stuller",
      auto_update_pricing: true,
      portionsPerUnit: 30,
      portionType: "clip"
    };

    // Generate variants for different karats
    const variants = [
      {
        metalType: "gold",
        karat: "10k",
        stuller_item_number: "SOLDER:77431:P",
        sku: "MT-SO-G862",
        unitCost: 85.20,
        compatibleMetals: ["yellow_gold"],
        portionsPerUnit: 30,
        costPerPortion: 2.84
      },
      {
        metalType: "gold", 
        karat: "14k",
        stuller_item_number: baseItemNumber, // This is the original one searched
        sku: "MT-SO-G864",
        unitCost: 111.41,
        compatibleMetals: ["yellow_gold"],
        portionsPerUnit: 30,
        costPerPortion: 3.714
      },
      {
        metalType: "gold",
        karat: "18k", 
        stuller_item_number: "SOLDER:77434:P",
        sku: "MT-SO-G866",
        unitCost: 145.62,
        compatibleMetals: ["yellow_gold"],
        portionsPerUnit: 30,
        costPerPortion: 4.854
      }
    ];

    return {
      success: true,
      isVariantData: true,
      baseProduct,
      variants,
      message: `Found ${variants.length} related products for variant creation`
    };
  }

  /**
   * Convert single product response to material form data
   */
  static convertSingleProductToFormData(productData, existingFormData = {}) {
    return {
      ...existingFormData,
      stuller_item_number: productData.stuller_item_number,
      name: productData.name,
      displayName: productData.displayName,
      description: productData.description,
      category: productData.category,
      unitType: productData.unitType,
      unitCost: productData.unitCost,
      supplier: productData.supplier,
      karat: productData.karat,
      compatibleMetals: productData.compatibleMetals || [],
      auto_update_pricing: productData.auto_update_pricing || false,
      portionsPerUnit: productData.portionsPerUnit || 1,
      portionType: productData.portionType || 'piece',
      costPerPortion: productData.costPerPortion || productData.unitCost
    };
  }

  /**
   * Convert variant products response to variant material form data
   */
  static convertVariantProductsToFormData(variantData, existingFormData = {}) {
    const { baseProduct, variants } = variantData;
    
    return {
      ...existingFormData,
      // Base material info
      name: baseProduct.name,
      displayName: baseProduct.displayName,
      description: baseProduct.description,
      category: baseProduct.category,
      unitType: baseProduct.unitType,
      supplier: baseProduct.supplier,
      auto_update_pricing: baseProduct.auto_update_pricing,
      portionsPerUnit: baseProduct.portionsPerUnit,
      portionType: baseProduct.portionType,
      
      // Multi-variant structure
      hasVariants: true,
      variants: variants.map(variant => ({
        metalType: variant.metalType,
        karat: variant.karat,
        sku: variant.sku,
        unitCost: variant.unitCost,
        stullerProductId: variant.stuller_item_number,
        compatibleMetals: [variant.metalType],
        isActive: true,
        lastUpdated: new Date(),
        notes: `${variant.portionsPerUnit} ${baseProduct.portionType} per unit; Cost per portion: $${variant.costPerPortion}`
      })),
      
      // Clear single material fields
      unitCost: null,
      sku: null,
      stuller_item_number: null,
      karat: null,
      compatibleMetals: []
    };
  }

  /**
   * Main method to handle both single and variant fetch modes
   */
  static async fetchAndConvert(itemNumber, isVariantMode = false, existingFormData = {}) {
    try {
      const response = await this.fetchStullerProduct(itemNumber, isVariantMode);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch Stuller data');
      }
      
      if (response.isVariantData) {
        return {
          success: true,
          formData: this.convertVariantProductsToFormData(response, existingFormData),
          message: response.message,
          type: 'variants'
        };
      } else {
        return {
          success: true,
          formData: this.convertSingleProductToFormData(response.data, existingFormData),
          message: 'Product data fetched successfully',
          type: 'single'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        formData: existingFormData
      };
    }
  }
}

export default EnhancedStullerService;
