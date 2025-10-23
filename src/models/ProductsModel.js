/**
 * Products Model - Universal product system for gemstones and jewelry
 * Supports gem cutters, jewelers, and other artisan types
 */

export class ProductsModel {
  constructor() {
    this.collection = 'products';
  }

  /**
   * Create a new product (gemstone, jewelry, etc.)
   */
  static createProduct(productData) {
    const baseProduct = {
      productID: productData.productID || this.generateProductID(),
      title: productData.title || '',
      type: productData.type || 'gemstone', // 'gemstone', 'jewelry', 'setting', etc.
      status: productData.status || 'draft', // 'draft', 'active', 'sold', 'reserved', 'archived'
      
      // Artisan information
      artisanID: productData.artisanID || '',
      artisanName: productData.artisanName || '',
      artisanEmail: productData.artisanEmail || '',
      artisanType: productData.artisanType || '', // 'gem cutter', 'jeweler', etc.
      
      // Basic product info
      description: productData.description || '',
      images: productData.images || [],
      quantity: productData.quantity || 1,
      price: productData.price || 0,
      currency: productData.currency || 'USD',
      
      // Timestamps
      createdAt: new Date(),
      updatedAt: new Date(),
      listedAt: null,
      soldAt: null,
      
      // Metadata
      tags: productData.tags || [],
      category: productData.category || '',
      subcategory: productData.subcategory || '',
      
      // Mounting/Setting requirements (for gemstones)
      mountingRequired: productData.mountingRequired || false,
      mountingType: productData.mountingType || null, // 'custom', 'stuller', 'optional'
      mountingNotes: productData.mountingNotes || '',
      
      // Type-specific data
      gemstoneData: null,
      jewelryData: null,
      settingData: null
    };

    // Add type-specific data
    if (productData.type === 'gemstone') {
      baseProduct.gemstoneData = this.createGemstonData(productData.gemstoneData || {});
    } else if (productData.type === 'jewelry') {
      baseProduct.jewelryData = this.createJewelryData(productData.jewelryData || {});
    } else if (productData.type === 'setting') {
      baseProduct.settingData = this.createSettingData(productData.settingData || {});
    }

    return baseProduct;
  }

  /**
   * Create gemstone-specific data structure
   */
  static createGemstonData(gemstoneData) {
    return {
      // Physical properties
      weight: gemstoneData.weight || 0, // in carats
      dimensions: {
        length: gemstoneData.dimensions?.length || 0, // in mm
        width: gemstoneData.dimensions?.width || 0,   // in mm
        depth: gemstoneData.dimensions?.depth || 0    // in mm
      },
      
      // Gemstone classification
      shape: gemstoneData.shape || '', // 'round', 'oval', 'emerald', 'pear', etc.
      cut: gemstoneData.cut || '', // specific cut name for listing
      species: gemstoneData.species || '', // 'beryl', 'corundum', 'quartz', etc.
      subspecies: gemstoneData.subspecies || '', // 'emerald', 'sapphire', 'amethyst', etc.
      
      // Origin and characteristics
      origin: gemstoneData.origin || '', // country/locale where mined
      locale: gemstoneData.locale || '', // specific mining location if known
      color: gemstoneData.color || '',
      clarity: gemstoneData.clarity || '',
      
      // Treatment and origin type
      isLabGrown: gemstoneData.isLabGrown || false,
      isNatural: gemstoneData.isNatural !== false, // default to natural
      treatments: gemstoneData.treatments || [], // array of treatment types
      treatmentDetails: gemstoneData.treatmentDetails || '',
      
      // Certification
      hasCertificate: gemstoneData.hasCertificate || false,
      certificateType: gemstoneData.certificateType || '', // 'GIA', 'AGL', etc.
      certificateNumber: gemstoneData.certificateNumber || '',
      certificateImages: gemstoneData.certificateImages || [],
      
      // Quality and grading
      quality: gemstoneData.quality || '', // 'commercial', 'fine', 'extra fine', etc.
      rarity: gemstoneData.rarity || 'common', // 'common', 'uncommon', 'rare', 'very rare'
      
      // Additional properties
      fluorescence: gemstoneData.fluorescence || 'none',
      pleochroism: gemstoneData.pleochroism || '',
      refractionIndex: gemstoneData.refractionIndex || '',
      specificGravity: gemstoneData.specificGravity || '',
      
      // Cutting details
      cutGrade: gemstoneData.cutGrade || '',
      symmetry: gemstoneData.symmetry || '',
      polish: gemstoneData.polish || '',
      cutterNotes: gemstoneData.cutterNotes || ''
    };
  }

  /**
   * Create jewelry-specific data structure (for future use)
   */
  static createJewelryData(jewelryData) {
    return {
      jewelryType: jewelryData.jewelryType || '', // 'ring', 'necklace', 'earrings', etc.
      style: jewelryData.style || '',
      metalType: jewelryData.metalType || '',
      metalPurity: jewelryData.metalPurity || '',
      size: jewelryData.size || '',
      weight: jewelryData.weight || 0, // in grams
      dimensions: jewelryData.dimensions || {},
      gemstones: jewelryData.gemstones || [], // references to gemstone products
      // Additional jewelry-specific fields...
    };
  }

  /**
   * Create setting-specific data structure (for future use)
   */
  static createSettingData(settingData) {
    return {
      settingType: settingData.settingType || '', // 'prong', 'bezel', 'channel', etc.
      metalType: settingData.metalType || '',
      metalPurity: settingData.metalPurity || '',
      gemstoneCompatibility: settingData.gemstoneCompatibility || [],
      stullerSKU: settingData.stullerSKU || '',
      // Additional setting-specific fields...
    };
  }

  /**
   * Generate unique product ID
   */
  static generateProductID() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `PROD-${timestamp}-${random}`;
  }

  /**
   * Validate product data
   */
  static validateProduct(productData) {
    const errors = [];

    // Required fields
    if (!productData.title) {
      errors.push('Title is required');
    }
    if (!productData.type) {
      errors.push('Product type is required');
    }
    if (!productData.artisanID) {
      errors.push('Artisan ID is required');
    }
    if (productData.price < 0) {
      errors.push('Price must be non-negative');
    }
    if (productData.quantity < 0) {
      errors.push('Quantity must be non-negative');
    }

    // Type-specific validations
    if (productData.type === 'gemstone') {
      if (!productData.gemstoneData?.weight || productData.gemstoneData.weight <= 0) {
        errors.push('Gemstone weight is required and must be greater than 0');
      }
      if (!productData.gemstoneData?.shape) {
        errors.push('Gemstone shape is required');
      }
      if (!productData.gemstoneData?.species) {
        errors.push('Gemstone species is required');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get gemstone dropdown options
   */
  static getGemstoneOptions() {
    return {
      shapes: [
        'Round', 'Oval', 'Emerald', 'Pear', 'Marquise', 'Princess', 'Cushion',
        'Asscher', 'Radiant', 'Heart', 'Trillion', 'Baguette', 'Square',
        'Rectangle', 'Octagon', 'Antique Cushion', 'Rose Cut', 'Cabochon',
        'Freeform', 'Custom'
      ],
      
      species: [
        'Beryl', 'Corundum', 'Quartz', 'Feldspar', 'Tourmaline', 'Garnet',
        'Spinel', 'Chrysoberyl', 'Zircon', 'Topaz', 'Peridot', 'Tanzanite',
        'Jade', 'Opal', 'Turquoise', 'Lapis Lazuli', 'Malachite', 'Agate',
        'Jasper', 'Onyx', 'Other'
      ],
      
      subspecies: {
        'Beryl': ['Emerald', 'Aquamarine', 'Morganite', 'Heliodor', 'Goshenite', 'Bixbite'],
        'Corundum': ['Ruby', 'Sapphire', 'Padparadscha', 'Star Sapphire', 'Star Ruby'],
        'Quartz': ['Amethyst', 'Citrine', 'Smoky Quartz', 'Rose Quartz', 'Prasiolite', 'Ametrine'],
        'Tourmaline': ['Paraiba', 'Rubellite', 'Indicolite', 'Chrome Tourmaline', 'Watermelon'],
        'Garnet': ['Almandine', 'Pyrope', 'Spessartine', 'Grossular', 'Andradite', 'Uvarovite', 'Rhodolite', 'Malaia']
      },
      
      treatments: [
        'None', 'Heat', 'Oil/Resin', 'Fracture Filling', 'Diffusion', 
        'Irradiation', 'Coating', 'Dyeing', 'Impregnation', 'Other'
      ],
      
      origins: [
        'Afghanistan', 'Australia', 'Brazil', 'Burma (Myanmar)', 'Cambodia', 
        'Canada', 'Colombia', 'Ethiopia', 'India', 'Kenya', 'Madagascar', 
        'Mozambique', 'Nigeria', 'Pakistan', 'Sri Lanka', 'Tanzania', 
        'Thailand', 'USA', 'Vietnam', 'Zambia', 'Zimbabwe', 'Other'
      ],
      
      clarityGrades: [
        'FL - Flawless', 'IF - Internally Flawless', 'VVS1 - Very Very Slightly Included 1',
        'VVS2 - Very Very Slightly Included 2', 'VS1 - Very Slightly Included 1',
        'VS2 - Very Slightly Included 2', 'SI1 - Slightly Included 1',
        'SI2 - Slightly Included 2', 'I1 - Included 1', 'I2 - Included 2', 'I3 - Included 3'
      ]
    };
  }
}

export default ProductsModel;