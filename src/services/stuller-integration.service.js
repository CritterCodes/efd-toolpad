/**
 * Stuller Integration Service for Multi-Variant Materials
 * Handles searching, importing, and managing Stuller products
 */

export class StullerIntegrationService {
  constructor() {
    this.baseUrl = process.env.STULLER_API_URL || 'https://api.stuller.com';
    this.apiKey = process.env.STULLER_API_KEY;
    this.timeout = 10000; // 10 seconds
  }

  /**
   * Search Stuller products by category and keywords
   * @param {Object} searchParams - Search parameters
   * @returns {Array} - Array of Stuller products
   */
  async searchProducts(searchParams = {}) {
    const {
      category = '',
      keywords = '',
      metalTypes = [],
      karats = [],
      supplier = 'Stuller',
      limit = 50,
      offset = 0
    } = searchParams;

    try {
      // Mock implementation for now - replace with actual Stuller API
      const mockResults = await this.mockStullerSearch({
        category,
        keywords,
        metalTypes,
        karats,
        limit,
        offset
      });

      return {
        success: true,
        data: mockResults,
        total: mockResults.length,
        hasMore: mockResults.length === limit
      };
    } catch (error) {
      console.error('Stuller search error:', error);
      return {
        success: false,
        error: error.message,
        data: [],
        total: 0,
        hasMore: false
      };
    }
  }

  /**
   * Mock Stuller search for development
   * Replace this with actual Stuller API integration
   */
  async mockStullerSearch({ category, keywords, metalTypes, karats, limit }) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const mockProducts = [
      {
        id: 'STU-SOL-001',
        name: 'Precious Metal Solder',
        category: 'solder',
        description: 'High-quality precious metal solder for jewelry repair',
        variants: [
          {
            sku: 'SOL-10K-YG',
            metalType: 'gold',
            karat: '10k',
            color: 'yellow',
            unitCost: 1.25,
            inStock: true,
            weight: '1dwt'
          },
          {
            sku: 'SOL-14K-YG',
            metalType: 'gold', 
            karat: '14k',
            color: 'yellow',
            unitCost: 1.85,
            inStock: true,
            weight: '1dwt'
          },
          {
            sku: 'SOL-18K-YG',
            metalType: 'gold',
            karat: '18k',
            color: 'yellow',
            unitCost: 2.45,
            inStock: true,
            weight: '1dwt'
          },
          {
            sku: 'SOL-SIL-925',
            metalType: 'silver',
            karat: '925',
            color: 'white',
            unitCost: 0.65,
            inStock: true,
            weight: '1dwt'
          }
        ]
      },
      {
        id: 'STU-WIRE-001',
        name: 'Round Wire',
        category: 'wire',
        description: 'Round wire for jewelry making and repair',
        variants: [
          {
            sku: 'WIRE-14K-RD-18G',
            metalType: 'gold',
            karat: '14k',
            gauge: '18',
            unitCost: 15.50,
            inStock: true,
            length: '6inch'
          },
          {
            sku: 'WIRE-SIL-RD-18G',
            metalType: 'silver',
            karat: '925',
            gauge: '18',
            unitCost: 2.75,
            inStock: true,
            length: '6inch'
          }
        ]
      },
      {
        id: 'STU-FIND-001',
        name: 'Jump Rings',
        category: 'findings',
        description: 'Round jump rings for jewelry assembly',
        variants: [
          {
            sku: 'JR-14K-5MM',
            metalType: 'gold',
            karat: '14k',
            size: '5mm',
            unitCost: 8.25,
            inStock: true,
            quantity: '10pcs'
          },
          {
            sku: 'JR-SIL-5MM',
            metalType: 'silver',
            karat: '925',
            size: '5mm',
            unitCost: 1.45,
            inStock: true,
            quantity: '10pcs'
          }
        ]
      }
    ];

    // Filter by category if specified
    let filtered = mockProducts;
    if (category) {
      filtered = filtered.filter(p => p.category === category);
    }

    // Filter by keywords if specified
    if (keywords) {
      const keywordLower = keywords.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(keywordLower) ||
        p.description.toLowerCase().includes(keywordLower)
      );
    }

    // Filter by metal types if specified
    if (metalTypes.length > 0) {
      filtered = filtered.filter(p =>
        p.variants.some(v => metalTypes.includes(v.metalType))
      );
    }

    // Filter by karats if specified
    if (karats.length > 0) {
      filtered = filtered.filter(p =>
        p.variants.some(v => karats.includes(v.karat))
      );
    }

    return filtered.slice(0, limit);
  }

  /**
   * Convert Stuller product to our material format
   * @param {Object} stullerProduct - Stuller product data
   * @returns {Object} - Material object in our format
   */
  convertToMaterial(stullerProduct) {
    const material = {
      name: stullerProduct.name.toLowerCase().replace(/\s+/g, '_'),
      displayName: stullerProduct.name,
      category: stullerProduct.category,
      unitType: this.determineUnitType(stullerProduct.category),
      supplier: 'Stuller',
      description: stullerProduct.description,
      isActive: true,
      autoUpdate: true,
      hasVariants: stullerProduct.variants && stullerProduct.variants.length > 0,
      variants: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Convert variants
    if (material.hasVariants) {
      material.variants = stullerProduct.variants.map(variant => ({
        metalType: variant.metalType,
        karat: variant.karat,
        sku: variant.sku,
        unitCost: variant.unitCost,
        stullerProductId: stullerProduct.id,
        compatibleMetals: [variant.metalType],
        isActive: variant.inStock,
        lastUpdated: new Date(),
        notes: this.buildVariantNotes(variant)
      }));
      
      // Set legacy fields to null
      material.unitCost = null;
      material.sku = null;
      material.stullerProductId = null;
      material.metalType = null;
      material.karat = null;
    } else {
      // Single variant - use legacy format
      const variant = stullerProduct.variants[0];
      material.unitCost = variant.unitCost;
      material.sku = variant.sku;
      material.stullerProductId = stullerProduct.id;
      material.metalType = variant.metalType;
      material.karat = variant.karat;
      material.compatibleMetals = [variant.metalType];
    }

    return material;
  }

  /**
   * Determine unit type based on category
   */
  determineUnitType(category) {
    const unitTypeMap = {
      solder: 'application',
      wire: 'inch',
      sheet: 'square_inch',
      findings: 'piece',
      stones: 'carat',
      consumable: 'application',
      tools: 'piece'
    };
    return unitTypeMap[category] || 'piece';
  }

  /**
   * Build notes for variant based on additional properties
   */
  buildVariantNotes(variant) {
    const notes = [];
    if (variant.color) notes.push(`Color: ${variant.color}`);
    if (variant.gauge) notes.push(`Gauge: ${variant.gauge}`);
    if (variant.size) notes.push(`Size: ${variant.size}`);
    if (variant.weight) notes.push(`Weight: ${variant.weight}`);
    if (variant.length) notes.push(`Length: ${variant.length}`);
    if (variant.quantity) notes.push(`Quantity: ${variant.quantity}`);
    return notes.join(', ');
  }

  /**
   * Bulk import materials from Stuller
   * @param {Array} stullerProducts - Array of Stuller products
   * @returns {Object} - Import results
   */
  async bulkImport(stullerProducts) {
    const results = {
      success: 0,
      failed: 0,
      errors: [],
      imported: []
    };

    for (const product of stullerProducts) {
      try {
        const material = this.convertToMaterial(product);
        
        // Here you would call your material creation API
        // const created = await MaterialService.createMaterial(material);
        
        results.success++;
        results.imported.push(material);
      } catch (error) {
        results.failed++;
        results.errors.push({
          product: product.name,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Update pricing for materials with Stuller products
   * @param {Array} materials - Materials to update
   * @returns {Object} - Update results
   */
  async updatePricing(materials) {
    const results = {
      updated: 0,
      failed: 0,
      errors: []
    };

    for (const material of materials) {
      try {
        if (!material.autoUpdate) continue;

        if (material.hasVariants) {
          // Update each variant that has a Stuller product ID
          for (const variant of material.variants) {
            if (variant.stullerProductId) {
              // Here you would fetch current pricing from Stuller
              // const currentPrice = await this.getProductPrice(variant.stullerProductId);
              // variant.unitCost = currentPrice;
              variant.lastUpdated = new Date();
            }
          }
        } else {
          // Update single material
          if (material.stullerProductId) {
            // const currentPrice = await this.getProductPrice(material.stullerProductId);
            // material.unitCost = currentPrice;
            material.updatedAt = new Date();
          }
        }

        results.updated++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          material: material.displayName,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Get search suggestions for categories and keywords
   */
  getSearchSuggestions() {
    return {
      categories: [
        { value: 'solder', label: 'Solder' },
        { value: 'wire', label: 'Wire' },
        { value: 'sheet', label: 'Sheet Metal' },
        { value: 'findings', label: 'Findings' },
        { value: 'stones', label: 'Gemstones' },
        { value: 'tools', label: 'Tools' },
        { value: 'consumable', label: 'Consumables' }
      ],
      metalTypes: [
        { value: 'gold', label: 'Gold' },
        { value: 'silver', label: 'Silver' },
        { value: 'platinum', label: 'Platinum' },
        { value: 'palladium', label: 'Palladium' }
      ],
      karats: {
        gold: [
          { value: '10k', label: '10K' },
          { value: '14k', label: '14K' },
          { value: '18k', label: '18K' },
          { value: '24k', label: '24K' }
        ],
        silver: [
          { value: '925', label: 'Sterling (925)' },
          { value: 'fine', label: 'Fine Silver' }
        ],
        platinum: [
          { value: '950', label: '950 Platinum' },
          { value: '900', label: '900 Platinum' }
        ]
      }
    };
  }
}

const stullerIntegrationService = new StullerIntegrationService();
export default stullerIntegrationService;
