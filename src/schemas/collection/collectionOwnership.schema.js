export const collectionOwnershipSchema = {
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
  }
};
