/**
 * Collection Schema - Product Collections & Drop Management
 * Handles artisan portfolios, admin themed collections, and drop orchestration
 */

export const collectionSchema = {
  _id: {
    type: 'ObjectId',
    description: 'MongoDB document ID'
  },

  name: {
    type: 'string',
    required: true,
    description: 'Collection name'
  },

  slug: {
    type: 'string',
    required: true,
    unique: true,
    description: 'URL-friendly slug'
  },

  description: {
    type: 'string',
    description: 'Collection description/story'
  },

  type: {
    type: 'string',
    enum: ['artisan', 'admin', 'drop'],
    description: 'Collection type'
  },

  // ============================================
  // OWNERSHIP & ACCESS
  // ============================================

  ownerId: {
    type: 'string',
    description: 'User ID of owner (for artisan collections)'
  },

  ownerInfo: {
    type: 'object',
    description: 'Embedded owner information',
    properties: {
      businessName: 'string',
      businessHandle: 'string',
      email: 'string'
    }
  },

  // ============================================
  // STATUS & VISIBILITY
  // ============================================

  status: {
    type: 'string',
    enum: ['draft', 'active', 'scheduled', 'archived'],
    default: 'draft',
    description: 'Collection visibility status'
  },

  isPublished: {
    type: 'boolean',
    default: false,
    description: 'Whether collection is live'
  },

  publishedAt: {
    type: 'date',
    description: 'When collection was published'
  },

  // ============================================
  // PRODUCTS IN COLLECTION
  // ============================================

  products: {
    type: 'array',
    description: 'Products in this collection',
    items: {
      type: 'object',
      properties: {
        productId: 'string',
        position: 'number',
        addedAt: 'date',
        notes: 'string'
      }
    }
  },

  // ============================================
  // DROP-SPECIFIC FIELDS (when type='drop')
  // ============================================

  drop: {
    type: 'object',
    description: 'Drop-specific information',
    properties: {
      theme: {
        type: 'string',
        description: 'Drop theme name'
      },
      vibes: {
        type: 'string',
        description: 'Aesthetic vibes/mood'
      },
      releaseDate: {
        type: 'date',
        description: 'When drop goes live'
      },
      targetQuantity: {
        type: 'number',
        description: 'Target number of pieces in drop'
      },
      requestId: {
        type: 'string',
        description: 'Reference to drop-request document'
      },
      sourceDropRequest: {
        type: 'object',
        description: 'Original drop request that generated this collection',
        properties: {
          theme: 'string',
          vibes: 'string',
          requirements: 'object'
        }
      }
    }
  },

  // ============================================
  // METADATA & SEO
  // ============================================

  image: {
    type: 'string',
    description: 'Collection hero/display image'
  },

  thumbnail: {
    type: 'string',
    description: 'Collection thumbnail'
  },

  seo: {
    type: 'object',
    description: 'SEO metadata',
    properties: {
      metaTitle: 'string',
      metaDescription: 'string',
      keywords: 'array'
    }
  },

  // ============================================
  // TIMESTAMPS
  // ============================================

  createdAt: {
    type: 'date',
    required: true,
    description: 'When collection was created'
  },

  updatedAt: {
    type: 'date',
    required: true,
    description: 'Last update'
  }
};

/**
 * Drop Request Schema - Admin orchestrates artisan submissions
 */
export const dropRequestSchema = {
  _id: {
    type: 'ObjectId',
    description: 'MongoDB document ID'
  },

  // ============================================
  // BASIC INFORMATION
  // ============================================

  theme: {
    type: 'string',
    required: true,
    description: 'Drop theme/concept'
  },

  vibes: {
    type: 'string',
    description: 'Aesthetic direction/mood'
  },

  description: {
    type: 'string',
    description: 'Detailed drop brief'
  },

  // ============================================
  // REQUIREMENTS
  // ============================================

  requirements: {
    type: 'object',
    description: 'What admin is looking for',
    properties: {
      desiredGemstones: {
        type: 'array',
        description: 'Preferred gemstone types'
      },
      priceRange: {
        type: 'object',
        properties: {
          min: 'number',
          max: 'number'
        }
      },
      targetQuantity: {
        type: 'number',
        description: 'How many pieces needed'
      },
      targetDeliveryDate: {
        type: 'date',
        description: 'When pieces should be ready'
      },
      maxArtisansPerProduct: {
        type: 'number',
        default: 1,
        description: 'How many artisans can have similar products'
      }
    }
  },

  // ============================================
  // TIMELINE
  // ============================================

  createdAt: {
    type: 'date',
    required: true,
    description: 'When drop request was created'
  },

  opensAt: {
    type: 'date',
    description: 'When submissions become visible to artisans'
  },

  closesAt: {
    type: 'date',
    required: true,
    description: 'Submission deadline'
  },

  selectionDeadline: {
    type: 'date',
    description: 'When admin finalizes selection'
  },

  releaseDate: {
    type: 'date',
    description: 'When drop goes live to customers'
  },

  // ============================================
  // STATUS & SUBMISSIONS
  // ============================================

  status: {
    type: 'string',
    enum: ['open', 'in-progress', 'selection', 'closed'],
    default: 'open',
    description: 'Drop request lifecycle status'
  },

  submissions: {
    type: 'array',
    description: 'Artisan submissions for this drop',
    items: {
      type: 'object',
      properties: {
        _id: 'ObjectId',
        artisanId: 'string',
        productId: 'string',
        submittedAt: 'date',
        selected: 'boolean',
        notes: 'string'
      }
    }
  },

  // ============================================
  // SELECTION & RESULTS
  // ============================================

  selectedProducts: {
    type: 'array',
    description: 'Products selected for the drop',
    items: 'string'
  },

  collectionId: {
    type: 'string',
    description: 'Generated collection document ID'
  },

  // ============================================
  // ADMIN CONTROL
  // ============================================

  createdBy: {
    type: 'string',
    description: 'Admin ID who created request'
  },

  visibility: {
    type: 'string',
    enum: ['all-artisans', 'selected-artisans'],
    default: 'all-artisans',
    description: 'Who can see this drop request'
  },

  notifyArtisans: {
    type: 'boolean',
    default: true,
    description: 'Whether to send notification to artisans'
  },

  updatedAt: {
    type: 'date',
    description: 'Last update'
  }
};

/**
 * Indexes for collections
 */
export const collectionIndexes = [
  { ownerId: 1, status: 1 },       // Get artisan's collections
  { status: 1, isPublished: 1 },   // Find published collections
  { slug: 1 },                     // URL lookup
  { 'drop.releaseDate': 1 },       // Upcoming drops
  { createdAt: -1 }                // Recent collections
];

/**
 * Indexes for drop requests
 */
export const dropRequestIndexes = [
  { status: 1, closesAt: 1 },      // Active drop requests
  { createdBy: 1, createdAt: -1 }, // Admin's drop requests
  { 'submissions.artisanId': 1 },  // Find artisan's submissions
  { releaseDate: 1 }               // Upcoming drops
];
