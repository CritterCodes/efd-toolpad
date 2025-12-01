/**
 * Product Schema - Complete Product Management System
 * Handles gemstones, artisan submissions, CAD requests, designs, and collections
 * Replaces Shopify product management with internal system
 */

export const productSchema = {
  // ============================================
  // BASIC PRODUCT INFORMATION
  // ============================================
  
  _id: {
    type: 'ObjectId',
    description: 'MongoDB document ID'
  },

  title: {
    type: 'string',
    required: true,
    description: 'Product title'
  },

  slug: {
    type: 'string',
    required: true,
    unique: true,
    description: 'URL-friendly slug for product'
  },

  description: {
    type: 'string',
    required: true,
    description: 'Full product description'
  },

  productType: {
    type: 'string',
    enum: ['gemstone', 'jewelry', 'custom'],
    default: 'gemstone',
    description: 'Type of product'
  },

  // ============================================
  // ARTISAN INFORMATION
  // ============================================

  artisanId: {
    type: 'string',
    required: true,
    description: 'User ID of artisan who created product'
  },

  artisanInfo: {
    type: 'object',
    description: 'Embedded artisan information at time of submission',
    properties: {
      artisanId: 'string',
      businessName: 'string',
      businessHandle: 'string',
      email: 'string',
      phone: 'string',
      location: 'string'
    }
  },

  // ============================================
  // LIFECYCLE & STATUS
  // ============================================

  status: {
    type: 'string',
    enum: ['draft', 'pending-approval', 'approved', 'revision-requested', 'published', 'rejected', 'archived'],
    default: 'draft',
    description: 'Product lifecycle status'
  },

  statusHistory: {
    type: 'array',
    description: 'Timeline of status changes',
    items: {
      type: 'object',
      properties: {
        status: 'string',
        timestamp: 'date',
        changedBy: 'string',
        reason: 'string',
        notes: 'string'
      }
    }
  },

  approvedBy: {
    type: 'string',
    description: 'Admin ID who approved the product'
  },

  approvalDate: {
    type: 'date',
    description: 'When product was approved'
  },

  revisionRequestNotes: {
    type: 'string',
    description: 'Admin notes if revision requested'
  },

  rejectionReason: {
    type: 'string',
    description: 'Reason if product was rejected'
  },

  publishedAt: {
    type: 'date',
    description: 'When product was published to shop'
  },

  archivedAt: {
    type: 'date',
    description: 'When product was archived'
  },

  // ============================================
  // GEMSTONE PROPERTIES
  // ============================================

  gemstone: {
    type: 'object',
    description: 'Gemstone-specific properties',
    properties: {
      // Basic gemstone info
      species: {
        type: 'string',
        description: 'Gemstone species (Diamond, Ruby, etc.)'
      },
      mineral: {
        type: 'string',
        description: 'Mineral composition'
      },
      subspecies: {
        type: 'string',
        description: 'Subspecies or variety'
      },

      // Quality metrics
      carats: {
        type: 'number',
        description: 'Weight in carats'
      },
      clarity: {
        type: 'string',
        enum: ['IF', 'VVS1', 'VVS2', 'VS1', 'VS2', 'SI1', 'SI2', 'I1'],
        description: 'Clarity grade (diamonds) or eye-clean'
      },
      color: {
        type: 'string',
        description: 'Color description or GIA color grade'
      },
      cut: {
        type: 'string',
        description: 'Cut quality or style'
      },

      // Origin & Treatment
      origin: {
        type: 'string',
        description: 'Geographic origin'
      },
      locale: {
        type: 'string',
        description: 'Specific locale/region'
      },
      treatment: {
        type: 'string',
        description: 'Any treatments applied (heated, irradiated, etc.)'
      },
      isTreated: {
        type: 'boolean',
        default: false,
        description: 'Whether gemstone has been treated'
      },

      // Dimensions
      cuttingStyle: {
        type: 'string',
        description: 'Cutting style (brilliant, step, mixed, etc.)'
      },
      dimensions: {
        type: 'object',
        description: 'Physical dimensions',
        properties: {
          length: 'number',
          width: 'number',
          depth: 'number',
          unit: 'string'
        }
      },

      // Certifications
      hasGemCert: {
        type: 'boolean',
        default: false,
        description: 'Has gemstone certification'
      },
      certificationNumber: {
        type: 'string',
        description: 'Certification ID (GIA, AGS, etc.)'
      },
      certificationBody: {
        type: 'string',
        description: 'Certification organization'
      },
      certificationFileUrl: {
        type: 'string',
        description: 'URL to certification document'
      }
    }
  },

  // ============================================
  // PRICING
  // ============================================

  pricing: {
    type: 'object',
    description: 'Product pricing information',
    properties: {
      costPrice: {
        type: 'number',
        description: 'Production cost'
      },
      retailPrice: {
        type: 'number',
        description: 'Retail sale price'
      },
      wholesalePrice: {
        type: 'number',
        description: 'Bulk/wholesale price'
      },
      markupPercentage: {
        type: 'number',
        description: 'Markup percentage from cost'
      },
      currency: {
        type: 'string',
        default: 'USD',
        description: 'Currency code'
      }
    }
  },

  // ============================================
  // INVENTORY
  // ============================================

  inventory: {
    type: 'object',
    description: 'Inventory tracking',
    properties: {
      quantity: {
        type: 'number',
        default: 1,
        description: 'Number of items available'
      },
      reserved: {
        type: 'number',
        default: 0,
        description: 'Number of reserved/pending items'
      },
      available: {
        type: 'number',
        description: 'Available quantity (quantity - reserved)'
      },
      lowStockThreshold: {
        type: 'number',
        default: 3,
        description: 'Alert when stock falls below this'
      },
      sku: {
        type: 'string',
        description: 'Stock keeping unit'
      }
    }
  },

  // ============================================
  // MEDIA & FILES
  // ============================================

  images: {
    type: 'array',
    description: 'Product images',
    items: {
      type: 'object',
      properties: {
        url: 'string',
        thumbUrl: 'string',
        altText: 'string',
        uploadedAt: 'date',
        primary: 'boolean'
      }
    }
  },

  media: {
    type: 'object',
    description: 'Additional media files',
    properties: {
      model3d: {
        type: 'object',
        description: '3D model for visualization',
        properties: {
          glbUrl: 'string',
          stlUrl: 'string',
          previewImageUrl: 'string'
        }
      },
      video: {
        type: 'object',
        description: 'Product video',
        properties: {
          url: 'string',
          title: 'string'
        }
      }
    }
  },

  // ============================================
  // COLLECTIONS & DROPS
  // ============================================

  collectionIds: {
    type: 'array',
    description: 'Collections this product belongs to',
    items: 'string'
  },

  dropIds: {
    type: 'array',
    description: 'Drop requests this product was selected for',
    items: 'string'
  },

  // ============================================
  // CAD REQUESTS (Embedded)
  // ============================================

  cadRequests: {
    type: 'array',
    description: 'Custom design requests using this gemstone',
    items: {
      type: 'object',
      properties: {
        _id: 'ObjectId',
        status: {
          enum: ['open', 'claimed', 'in-progress', 'submitted', 'approved', 'declined', 'revision-requested', 'published'],
          description: 'CAD request status'
        },
        customizationDetails: 'string',
        requestedBy: 'string',
        designerId: 'string',
        submittedAt: 'date',
        designs: 'array',
        adminFeedback: 'string',
        createdAt: 'date',
        updatedAt: 'date'
      }
    }
  },

  // ============================================
  // DESIGNS (Embedded)
  // ============================================

  designs: {
    type: 'array',
    description: 'Design submissions and options',
    items: {
      type: 'object',
      properties: {
        _id: 'ObjectId',
        cadRequestId: 'string',
        designerId: 'string',
        files: {
          type: 'object',
          properties: {
            glbUrl: 'string',
            stlUrl: 'string'
          }
        },
        description: 'string',
        status: {
          enum: ['submitted', 'approved', 'declined', 'revision-requested', 'published'],
          description: 'Design approval status'
        },
        adminFeedback: 'string',
        submittedAt: 'date',
        approvedAt: 'date'
      }
    }
  },

  // ============================================
  // DESIGN OPTIONS (For upsale)
  // ============================================

  designOptions: {
    type: 'array',
    description: 'Approved designs available as upsale options',
    items: {
      type: 'object',
      properties: {
        _id: 'ObjectId',
        name: 'string',
        description: 'string',
        glbUrl: 'string',
        stlUrl: 'string',
        additionalPrice: 'number',
        createdAt: 'date'
      }
    }
  },

  // ============================================
  // SEO & METADATA
  // ============================================

  seo: {
    type: 'object',
    description: 'SEO and metadata',
    properties: {
      metaTitle: 'string',
      metaDescription: 'string',
      keywords: 'array',
      ogImage: 'string'
    }
  },

  tags: {
    type: 'array',
    description: 'Product tags for filtering',
    items: 'string'
  },

  // ============================================
  // TIMESTAMPS
  // ============================================

  createdAt: {
    type: 'date',
    required: true,
    description: 'When product was created'
  },

  updatedAt: {
    type: 'date',
    required: true,
    description: 'Last update timestamp'
  }
};

/**
 * Indexes for optimal query performance
 */
export const productIndexes = [
  { artisanId: 1, status: 1 },      // Query artisan's pending products
  { status: 1, createdAt: -1 },     // Admin dashboard pending products
  { slug: 1 },                      // SEO-friendly URLs
  { collectionIds: 1 },             // Find products in collections
  { 'gemstone.species': 1 },        // Filter by gemstone type
  { createdAt: -1 }                 // Recent products
];

/**
 * Helper methods for product schema
 */
export const productMethods = {
  /**
   * Get products pending admin approval
   */
  getPendingApproval: async (db) => {
    return db.collection('products')
      .find({ status: 'pending-approval' })
      .sort({ createdAt: -1 })
      .toArray();
  },

  /**
   * Get artisan's products by status
   */
  getArtisanProducts: async (db, artisanId, status = null) => {
    const query = { artisanId };
    if (status) query.status = status;
    return db.collection('products')
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();
  },

  /**
   * Transition product status with history tracking
   */
  updateStatus: async (db, productId, newStatus, changedBy, reason = '', notes = '') => {
    const statusRecord = {
      status: newStatus,
      timestamp: new Date(),
      changedBy,
      reason,
      notes
    };

    return db.collection('products').findOneAndUpdate(
      { _id: productId },
      {
        $set: { status: newStatus, updatedAt: new Date() },
        $push: { statusHistory: statusRecord }
      },
      { returnDocument: 'after' }
    );
  },

  /**
   * Calculate available inventory
   */
  calculateAvailable: async (db, productId) => {
    const product = await db.collection('products').findOne({ _id: productId });
    if (!product) return 0;
    return (product.inventory?.quantity || 1) - (product.inventory?.reserved || 0);
  }
};
