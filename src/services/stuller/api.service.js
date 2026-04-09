export class StullerApiService {
  constructor(config = {}) {
    this.baseUrl = config.baseUrl || process.env.STULLER_API_URL || 'https://api.stuller.com';
    this.apiKey = config.apiKey || process.env.STULLER_API_KEY;
    this.timeout = config.timeout || 10000;
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
    if (metalTypes && metalTypes.length > 0) {
      filtered = filtered.filter(p =>
        p.variants.some(v => metalTypes.includes(v.metalType))
      );
    }

    // Filter by karats if specified
    if (karats && karats.length > 0) {
      filtered = filtered.filter(p =>
        p.variants.some(v => karats.includes(v.karat))
      );
    }

    return filtered.slice(0, limit);
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
