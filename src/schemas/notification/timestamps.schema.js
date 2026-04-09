export const timestampsSchema = {
  // ============================================
  // TIMESTAMPS
  // ============================================

  createdAt: {
    type: 'date',
    required: true,
    description: 'When notification was created'
  },

  updatedAt: {
    type: 'date',
    required: true,
    description: 'Last update'
  }
};
