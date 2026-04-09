export const dropRequestRequirementsSchema = {
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
  }
};
