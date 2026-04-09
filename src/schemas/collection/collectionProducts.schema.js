export const collectionProductsSchema = {
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
  }
};
