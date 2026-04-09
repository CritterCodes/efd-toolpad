export const MaterialVariantSchema = {
  metalType: {
    type: String,
    required: true,
    enum: ['gold', 'silver', 'platinum', 'palladium', 'stainless', 'mixed', 'other']
  },
  karat: {
    type: String,
    required: true,
    // Will be validated based on metalType
  },
  sku: {
    type: String,
    required: false
  },
  unitCost: {
    type: Number,
    required: true,
    min: 0
  },
  stullerProductId: {
    type: String,
    required: false
  },
  compatibleMetals: [{
    type: String,
    enum: ['gold', 'silver', 'platinum', 'palladium', 'stainless', 'mixed', 'other']
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String,
    required: false
  }
};
