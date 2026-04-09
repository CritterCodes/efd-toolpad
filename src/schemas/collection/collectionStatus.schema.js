export const collectionStatusSchema = {
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
  }
};
