export const dropRequestSubmissionsSchema = {
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
  }
};
