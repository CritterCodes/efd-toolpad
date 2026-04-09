export const metadataSchema = {
  // ============================================
  // PRIORITY & EXPIRATION
  // ============================================

  priority: {
    type: 'string',
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal',
    description: 'Notification priority'
  },

  channels: {
    type: 'array',
    default: ['email', 'inApp'],
    description: 'Which channels to send to',
    items: {
      enum: ['email', 'inApp', 'push']
    }
  },

  expiresAt: {
    type: 'date',
    description: 'When notification expires (optional)'
  },

  // ============================================
  // METADATA
  // ============================================

  isArchived: {
    type: 'boolean',
    default: false,
    description: 'Whether notification is archived'
  },

  retryCount: {
    type: 'number',
    default: 0,
    description: 'Number of send retries'
  },

  maxRetries: {
    type: 'number',
    default: 3,
    description: 'Maximum retry attempts'
  },

  tags: {
    type: 'array',
    description: 'Tags for filtering/grouping',
    items: 'string'
  },

  metadata: {
    type: 'object',
    description: 'Custom metadata for specific notification types'
  }
};
