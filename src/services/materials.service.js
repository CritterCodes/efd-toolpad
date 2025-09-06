/**
 * Materials Service
 * Handles all API interactions for materials management
 */

class MaterialsService {
  constructor() {
    this.baseUrl = '/api/materials';
    this.stullerUrl = '/api/stuller/item';
  }

  /**
   * Fetch all materials
   * @returns {Promise<Array>} Array of materials
   */
  async getMaterials() {
    try {
      const response = await fetch(this.baseUrl);
      
      if (!response.ok) {
        throw new Error('Failed to load materials');
      }
      
      const data = await response.json();
      return data.materials || [];
    } catch (error) {
      console.error('Error loading materials:', error);
      throw error;
    }
  }

  /**
   * Create a new material
   * @param {Object} materialData - Material data to create
   * @returns {Promise<Object>} Created material
   */
  async createMaterial(materialData) {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this._processFormData(materialData))
      });

      if (!response.ok) {
        const errorData = await this._getErrorMessage(response);
        throw new Error(errorData);
      }

      const result = await response.json();
      return result.material;
    } catch (error) {
      console.error('Error creating material:', error);
      throw error;
    }
  }

  /**
   * Update an existing material
   * @param {string} materialId - ID of material to update
   * @param {Object} materialData - Updated material data
   * @returns {Promise<Object>} Updated material
   */
  async updateMaterial(materialId, materialData) {
    try {
      const response = await fetch(`${this.baseUrl}?id=${materialId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this._processFormData(materialData))
      });

      if (!response.ok) {
        const errorData = await this._getErrorMessage(response);
        throw new Error(errorData);
      }

      const result = await response.json();
      return result.material;
    } catch (error) {
      console.error('Error updating material:', error);
      throw error;
    }
  }

  /**
   * Delete a material
   * @param {string} materialId - ID of material to delete
   * @returns {Promise<void>}
   */
  async deleteMaterial(materialId) {
    try {
      const response = await fetch(`${this.baseUrl}?id=${materialId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete material');
      }
    } catch (error) {
      console.error('Error deleting material:', error);
      throw error;
    }
  }

  /**
   * Fetch material data from Stuller API
   * @param {string} itemNumber - Stuller item number
   * @returns {Promise<Object>} Stuller material data
   */
  async fetchStullerData(itemNumber) {
    if (!itemNumber?.trim()) {
      throw new Error('Item number is required');
    }

    try {
      const response = await fetch(this.stullerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemNumber: itemNumber.trim() })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch Stuller data');
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Error fetching Stuller data:', error);
      throw error;
    }
  }

  /**
   * Transform Stuller data into form data format
   * @param {Object} stullerData - Raw Stuller data
   * @param {Object} currentFormData - Current form data to merge with
   * @returns {Object} Transformed form data
   */
  transformStullerToFormData(stullerData, currentFormData = {}) {
    const mappedCategory = this._mapStullerCategory(stullerData.category);
    const compatibleMetals = this._mapStullerToCompatibleMetals(stullerData);
    const extractedKarat = this._extractKaratFromStuller(stullerData);
    
    console.log('🎯 Form Population Debug:', {
      mappedCategory,
      compatibleMetals,
      extractedKarat,
      rawCategory: stullerData.category,
      metalData: stullerData.metal,
      qualityData: stullerData.specifications?.Quality
    });
    
    return {
      ...currentFormData,
      displayName: stullerData.description || currentFormData.displayName,
      category: mappedCategory || currentFormData.category,
      karat: extractedKarat || currentFormData.karat,
      unitCost: this._extractPrice(stullerData.price) || currentFormData.unitCost,
      supplier: 'Stuller',
      description: stullerData.longDescription || stullerData.description || currentFormData.description,
      auto_update_pricing: true,
      stuller_item_number: stullerData.itemNumber || currentFormData.stuller_item_number,
      compatibleMetals: compatibleMetals.length > 0 ? compatibleMetals : currentFormData.compatibleMetals
    };
  }

  /**
   * Generate a preview SKU based on category and display name
   * @param {string} displayName - Material display name
   * @param {string} category - Material category
   * @returns {string} Preview SKU
   */
  generatePreviewSku(displayName, category) {
    if (!displayName || !category) return 'SKU will be auto-generated';
    
    // Simple preview generation (actual generation happens on server)
    const categoryPrefix = category.substring(0, 2).toUpperCase();
    const materialType = this._determineMaterialType(displayName, category);
    const typePrefix = this._getMaterialTypePrefix(materialType);
    return `MT-${categoryPrefix}-${typePrefix}XXX`;
  }

  /**
   * Generate internal name from display name
   * @param {string} displayName - Display name
   * @returns {string} Internal name
   */
  generateName(displayName) {
    return displayName.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
  }

  /**
   * Calculate cost per portion
   * @param {number|string} unitCost - Unit cost
   * @param {number|string} portionsPerUnit - Portions per unit
   * @returns {string} Cost per portion (4 decimal places)
   */
  calculateCostPerPortion(unitCost, portionsPerUnit) {
    const cost = parseFloat(unitCost) || 0;
    const portions = parseInt(portionsPerUnit) || 1;
    return portions > 0 ? (cost / portions).toFixed(4) : '0.0000';
  }

  // Private helper methods

  /**
   * Process form data before sending to API
   * @private
   */
  _processFormData(formData) {
    // Multi-variant structure (only format we support now)
    return {
      // General material information
      name: this.generateName(formData.displayName),
      displayName: formData.displayName,
      category: formData.category,
      description: formData.description,
      unitType: formData.unitType,
      supplier: formData.supplier,
      isActive: formData.isActive !== false,
      isMetalDependent: formData.hasOwnProperty('isMetalDependent') ? Boolean(formData.isMetalDependent) : true,
      
      // Portion information
      portionsPerUnit: parseInt(formData.portionsPerUnit) || 1,
      portionType: formData.portionType,
      
      // Base pricing (for non-metal dependent materials)
      unitCost: parseFloat(formData.unitCost) || 0,
      
      // Multi-variant structure - Array of Stuller products
      stullerProducts: formData.stullerProducts?.map(product => ({
        id: product.id,
        stullerItemNumber: product.stullerItemNumber,
        metalType: product.metalType,
        karat: product.karat,
        stullerPrice: parseFloat(product.stullerPrice) || 0,
        markupRate: parseFloat(product.markupRate) || 1.5,
        markedUpPrice: parseFloat(product.markedUpPrice) || 0,
        unitCost: parseFloat(product.markedUpPrice) || 0, // For compatibility
        sku: product.sku || '',
        description: product.description || '',
        weight: parseFloat(product.weight) || 0,
        dimensions: product.dimensions || '',
        addedAt: product.addedAt || new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        autoUpdatePricing: product.autoUpdatePricing !== false
      })) || []
    };
  }

  /**
   * Extract error message from response
   * @private
   */
  async _getErrorMessage(response) {
    try {
      const data = await response.json();
      return data.error || 'Failed to save material';
    } catch (jsonError) {
      return response.statusText || `HTTP Error ${response.status}`;
    }
  }

  /**
   * Extract price from Stuller data
   * @private
   */
  _extractPrice(priceData) {
    const rawPrice = typeof priceData === 'number' ? priceData : priceData?.Value || priceData;
    if (rawPrice && !isNaN(rawPrice)) {
      return parseFloat(rawPrice).toFixed(2);
    }
    return null;
  }

  /**
   * Map Stuller categories to internal categories
   * @private
   */
  _mapStullerCategory(stullerCategory) {
    const categoryMap = {
      'solder': 'solder',
      'findings': 'consumable',
      'tools': 'tools',
      'polishing': 'finishing',
      'cleaning': 'consumable',
      'sizing stock': 'sizing_material',
      'wire': 'sizing_material',
      'sheet': 'sizing_material',
      'tube': 'sizing_material',
      'flat': 'sizing_material',
      'chain': 'findings',
      'stone': 'stones',
      'setting': 'findings',
      'mill product': 'sizing_material',
      'fabricated metals': 'sizing_material'
    };
    
    let categoryString = '';
    
    if (typeof stullerCategory === 'string') {
      categoryString = stullerCategory.toLowerCase();
    } else if (typeof stullerCategory === 'object' && stullerCategory !== null) {
      categoryString = (
        stullerCategory.primary || 
        stullerCategory.group || 
        stullerCategory.hierarchy || 
        ''
      ).toLowerCase();
    }
    
    console.log('🔍 Category Mapping Debug:', {
      original: stullerCategory,
      categoryString,
      mapping: categoryMap
    });
    
    for (const [key, value] of Object.entries(categoryMap)) {
      if (categoryString.includes(key)) {
        console.log(`✅ Found category match: "${key}" → "${value}"`);
        return value;
      }
    }
    
    console.log(`⚠️ No category match found, defaulting to "other"`);
    return 'other';
  }

  /**
   * Map Stuller metal data to compatible metals
   * @private
   */
  _mapStullerToCompatibleMetals(stullerData) {
    const metalMappings = {
      '14k yellow': ['yellow_gold'],
      '14ky': ['yellow_gold'],
      '18k yellow': ['yellow_gold'],
      '18ky': ['yellow_gold'],
      '10k yellow': ['yellow_gold'],
      '10ky': ['yellow_gold'],
      '22k yellow': ['yellow_gold'],
      '24k yellow': ['yellow_gold'],
      'yellow gold': ['yellow_gold'],
      'yellow': ['yellow_gold'],
      '14k white': ['white_gold'],
      '14kw': ['white_gold'],
      '18k white': ['white_gold'],
      '18kw': ['white_gold'],
      '10k white': ['white_gold'],
      '10kw': ['white_gold'],
      'white gold': ['white_gold'],
      'white': ['white_gold'],
      '14k rose': ['rose_gold'],
      '14kr': ['rose_gold'],
      '18k rose': ['rose_gold'],
      '18kr': ['rose_gold'],
      '10k rose': ['rose_gold'],
      '10kr': ['rose_gold'],
      'rose gold': ['rose_gold'],
      'rose': ['rose_gold'],
      'pink gold': ['rose_gold'],
      'red gold': ['rose_gold'],
      'sterling': ['sterling_silver'],
      '925': ['sterling_silver'],
      'sterling silver': ['sterling_silver'],
      'fine silver': ['fine_silver'],
      '999': ['fine_silver'],
      'silver': ['sterling_silver'],
      'platinum': ['platinum'],
      '950': ['platinum']
    };

    const metals = [];
    
    if (stullerData.metal && stullerData.metal.type) {
      const metalType = stullerData.metal.type.toLowerCase();
      console.log('🔍 Metal Type from Stuller:', metalType);
      
      for (const [key, values] of Object.entries(metalMappings)) {
        if (metalType.includes(key)) {
          metals.push(...values);
          console.log(`✅ Found metal match: "${key}" → [${values.join(', ')}]`);
        }
      }
    }

    if (metals.length === 0 && stullerData.description) {
      const description = stullerData.description.toLowerCase();
      for (const [key, values] of Object.entries(metalMappings)) {
        if (description.includes(key)) {
          metals.push(...values);
          console.log(`✅ Found metal in description: "${key}" → [${values.join(', ')}]`);
          break;
        }
      }
    }

    return [...new Set(metals)];
  }

  /**
   * Extract karat information from Stuller data
   * @private
   */
  _extractKaratFromStuller(stullerData) {
    if (stullerData.specifications?.Quality?.displayValue) {
      const qualityValue = stullerData.specifications.Quality.displayValue;
      console.log('🔍 Quality from Stuller specifications:', qualityValue);
      
      const karatMappings = {
        '14k yellow': '14K',
        '14k white': '14K', 
        '14k rose': '14K',
        '14k': '14K',
        '18k yellow': '18K',
        '18k white': '18K',
        '18k rose': '18K', 
        '18k': '18K',
        '10k yellow': '10K',
        '10k white': '10K',
        '10k': '10K',
        '22k': '22K',
        '24k': '24K',
        'sterling': '925',
        '925': '925',
        'platinum': '950',
        '950': '950',
        'fine silver': '999',
        '999': '999'
      };
      
      const qualityLower = qualityValue.toLowerCase();
      for (const [key, karat] of Object.entries(karatMappings)) {
        if (qualityLower.includes(key)) {
          console.log(`✅ Found karat match: "${key}" → "${karat}"`);
          return karat;
        }
      }
    }
    
    if (stullerData.metal?.quality) {
      const metalQuality = stullerData.metal.quality.toLowerCase();
      console.log('🔍 Metal quality from Stuller:', metalQuality);
      
      if (metalQuality.includes('14k')) return '14K';
      if (metalQuality.includes('18k')) return '18K';
      if (metalQuality.includes('10k')) return '10K';
      if (metalQuality.includes('22k')) return '22K';
      if (metalQuality.includes('24k')) return '24K';
      if (metalQuality.includes('925')) return '925';
      if (metalQuality.includes('950')) return '950';
      if (metalQuality.includes('999')) return '999';
    }
    
    if (stullerData.description) {
      const description = stullerData.description.toLowerCase();
      console.log('🔍 Checking description for karat:', description);
      
      if (description.includes('14k')) return '14K';
      if (description.includes('18k')) return '18K'; 
      if (description.includes('10k')) return '10K';
      if (description.includes('22k')) return '22K';
      if (description.includes('24k')) return '24K';
      if (description.includes('sterling') || description.includes('925')) return '925';
      if (description.includes('platinum') || description.includes('950')) return '950';
      if (description.includes('fine silver') || description.includes('999')) return '999';
    }
    
    console.log('❌ No karat information found in Stuller data');
    return '';
  }

  /**
   * Determine material type from name and category
   * @private
   */
  _determineMaterialType(name, category) {
    const nameType = name.toLowerCase();
    if (nameType.includes('silver')) return 'silver';
    if (nameType.includes('gold')) return 'gold';
    if (nameType.includes('platinum')) return 'platinum';
    if (nameType.includes('polish')) return 'polishing';
    if (nameType.includes('adhesive')) return 'adhesive';
    if (nameType.includes('solvent')) return 'solvent';
    return 'general';
  }

  /**
   * Get material type prefix for SKU
   * @private
   */
  _getMaterialTypePrefix(materialType) {
    const typeMap = {
      'silver': 'S', 'gold': 'G', 'platinum': 'P',
      'polishing': 'P', 'adhesive': 'A', 'solvent': 'S',
      'general': 'G'
    };
    return typeMap[materialType] || 'G';
  }
}

// Export singleton instance
const materialsService = new MaterialsService();
export default materialsService;
