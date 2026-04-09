export const contentSchema = {
  // ============================================
  // NOTIFICATION TYPE & CONTENT
  // ============================================

  type: {
    type: 'string',
    enum: [
      'product-approved',
      'product-rejected',
      'product-revision-requested',
      'product-published',
      'cad-request-new',
      'cad-design-submitted',
      'cad-design-approved',
      'cad-design-declined',
      'drop-request-new',
      'artisan-selected-for-drop',
      'artisan-not-selected',
      'collection-published'
    ],
    required: true,
    description: 'Type of notification'
  },

  title: {
    type: 'string',
    description: 'Notification title'
  },

  message: {
    type: 'string',
    description: 'Notification message'
  },

  description: {
    type: 'string',
    description: 'Longer description for in-app display'
  }
};
