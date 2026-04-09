export const relatedEntitySchema = {
  // ============================================
  // RELATED ENTITY
  // ============================================

  relatedId: {
    type: 'string',
    description: 'ID of related document (product, CAD request, etc.)'
  },

  relatedType: {
    type: 'string',
    enum: ['product', 'cad-request', 'design', 'collection', 'drop-request'],
    description: 'Type of related entity'
  },

  relatedData: {
    type: 'object',
    description: 'Embedded data from related entity for easy display',
    properties: {
      title: 'string',
      image: 'string',
      artisanName: 'string'
    }
  }
};
