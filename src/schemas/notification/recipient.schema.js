export const recipientSchema = {
  // ============================================
  // RECIPIENT
  // ============================================

  userId: {
    type: 'string',
    required: true,
    description: 'User ID of recipient'
  },

  userEmail: {
    type: 'string',
    required: true,
    description: 'Email address of recipient'
  },

  userRole: {
    type: 'string',
    enum: ['customer', 'artisan', 'designer', 'admin', 'superadmin'],
    description: 'Role of recipient'
  }
};
