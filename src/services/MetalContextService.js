/**
 * MetalContextService.js - Metal context handling and validation
 * 
 * Provides utilities for working with metal types, karats, and context validation.
 * Handles metal key formatting and parsing consistently across the application.
 */

export class MetalContextService {
  // Supported metal types and their valid karats
  static METAL_TYPES = {
    gold: ['10k', '14k', '18k', '22k'],
    silver: ['sterling', 'fine'],
    platinum: ['900', '950'],
    palladium: ['500', '950'],
    titanium: ['grade1', 'grade2'],
    stainless: ['316L', '904L']
  };

  // Metal display names
  static METAL_DISPLAY_NAMES = {
    gold: 'Gold',
    silver: 'Silver', 
    platinum: 'Platinum',
    palladium: 'Palladium',
    titanium: 'Titanium',
    stainless: 'Stainless Steel'
  };

  // Karat display names
  static KARAT_DISPLAY_NAMES = {
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
   * @param {string} metalType - Metal type (gold, silver, etc.)
   * @param {string} karat - Karat/purity (14k, sterling, etc.)
   * @returns {string} Formatted metal key (gold_14k, silver_sterling)
   */
  static formatMetalKey(metalType, karat) {
    if (!metalType || !karat) {
      throw new Error('Both metalType and karat are required');
    }

    const normalizedMetal = metalType.toLowerCase();
    const normalizedKarat = karat.toLowerCase();

    // Validate metal type
    if (!this.METAL_TYPES[normalizedMetal]) {
      throw new Error(`Unsupported metal type: ${metalType}`);
    }

    // Validate karat for metal type
    if (!this.METAL_TYPES[normalizedMetal].includes(normalizedKarat)) {
      throw new Error(`Unsupported karat ${karat} for metal type ${metalType}`);
    }

    return `${normalizedMetal}_${normalizedKarat}`;
  }

  /**
   * Parse metal key into metal type and karat
   * @param {string} metalKey - Metal key (gold_14k, silver_sterling)
   * @returns {Object} { metalType, karat }
   */
  static parseMetalKey(metalKey) {
    if (!metalKey || typeof metalKey !== 'string') {
      throw new Error('Metal key is required and must be a string');
    }

    const parts = metalKey.split('_');
    if (parts.length !== 2) {
      throw new Error(`Invalid metal key format: ${metalKey}. Expected format: metalType_karat`);
    }

    const [metalType, karat] = parts;
    
    // Validate parsed values
    this.validateMetalContext({ metalType, karat });

    return { metalType, karat };
  }

  /**
   * Validate metal context object
   * @param {Object} context - { metalType, karat }
   * @returns {boolean} True if valid
   * @throws {Error} If invalid
   */
  static validateMetalContext(context) {
    if (!context || typeof context !== 'object') {
      throw new Error('Metal context must be an object');
    }

    const { metalType, karat } = context;

    if (!metalType || !karat) {
      throw new Error('Metal context must include both metalType and karat');
    }

    const normalizedMetal = metalType.toLowerCase();
    const normalizedKarat = karat.toLowerCase();

    if (!this.METAL_TYPES[normalizedMetal]) {
      throw new Error(`Unsupported metal type: ${metalType}`);
    }

    if (!this.METAL_TYPES[normalizedMetal].includes(normalizedKarat)) {
      throw new Error(`Unsupported karat ${karat} for metal type ${metalType}`);
    }

    return true;
  }

  /**
   * Get all supported metal combinations
   * @returns {Array} Array of { metalType, karat, metalKey, displayName }
   */
  static getAllSupportedMetals() {
    const metals = [];

    for (const [metalType, karats] of Object.entries(this.METAL_TYPES)) {
      for (const karat of karats) {
        metals.push({
          metalType,
          karat,
          metalKey: this.formatMetalKey(metalType, karat),
          displayName: this.getDisplayName(metalType, karat)
        });
      }
    }

    return metals;
  }

  /**
   * Get supported karats for a specific metal type
   * @param {string} metalType - Metal type
   * @returns {Array} Array of supported karats
   */
  static getSupportedKarats(metalType) {
    const normalizedMetal = metalType.toLowerCase();
    return this.METAL_TYPES[normalizedMetal] || [];
  }

  /**
   * Get display name for metal context
   * @param {string} metalType - Metal type
   * @param {string} karat - Karat
   * @returns {string} Display name (Gold 14K, Silver Sterling)
   */
  static getDisplayName(metalType, karat) {
    const metalDisplay = this.METAL_DISPLAY_NAMES[metalType.toLowerCase()] || metalType;
    const karatDisplay = this.KARAT_DISPLAY_NAMES[karat.toLowerCase()] || karat;
    return `${metalDisplay} ${karatDisplay}`;
  }

  /**
   * Get display name from metal key
   * @param {string} metalKey - Metal key (gold_14k)
   * @returns {string} Display name (Gold 14K)
   */
  static getDisplayNameFromKey(metalKey) {
    const { metalType, karat } = this.parseMetalKey(metalKey);
    return this.getDisplayName(metalType, karat);
  }

  /**
   * Check if metal context is supported
   * @param {string} metalType - Metal type
   * @param {string} karat - Karat
   * @returns {boolean} True if supported
   */
  static isSupported(metalType, karat) {
    try {
      this.validateMetalContext({ metalType, karat });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get metal type options for UI
   * @returns {Array} Array of { value, label }
   */
  static getMetalTypeOptions() {
    return Object.keys(this.METAL_TYPES).map(metalType => ({
      value: metalType,
      label: this.METAL_DISPLAY_NAMES[metalType] || metalType
    }));
  }

  /**
   * Get karat options for specific metal type
   * @param {string} metalType - Metal type
   * @returns {Array} Array of { value, label }
   */
  static getKaratOptions(metalType) {
    const karats = this.getSupportedKarats(metalType);
    return karats.map(karat => ({
      value: karat,
      label: this.KARAT_DISPLAY_NAMES[karat] || karat
    }));
  }

  /**
   * Sort metal contexts by display preference
   * @param {Array} metalContexts - Array of metal contexts
   * @returns {Array} Sorted array
   */
  static sortByPreference(metalContexts) {
    // Preferred order for metals
    const metalOrder = ['gold', 'silver', 'platinum', 'palladium', 'titanium', 'stainless'];
    
    // Preferred order for karats within each metal
    const karatOrder = {
      gold: ['14k', '18k', '10k', '22k'],
      silver: ['sterling', 'fine'],
      platinum: ['950', '900'],
      palladium: ['950', '500'],
      titanium: ['grade2', 'grade1'],
      stainless: ['316L', '904L']
    };

    return metalContexts.sort((a, b) => {
      // First sort by metal type
      const aMetalIndex = metalOrder.indexOf(a.metalType);
      const bMetalIndex = metalOrder.indexOf(b.metalType);
      
      if (aMetalIndex !== bMetalIndex) {
        return aMetalIndex - bMetalIndex;
      }

      // Then sort by karat within same metal type
      const metalKaratOrder = karatOrder[a.metalType] || [];
      const aKaratIndex = metalKaratOrder.indexOf(a.karat);
      const bKaratIndex = metalKaratOrder.indexOf(b.karat);
      
      return aKaratIndex - bKaratIndex;
    });
  }
}
