/**
 * Notification Schema - Multi-Channel Notification System
 * Tracks email, in-app, and push notifications with delivery status
 */

export const notificationSchema = {
  _id: {
    type: 'ObjectId',
    description: 'MongoDB document ID'
  },

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
  },

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
  },

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
  },

  // ============================================
  // ACTION
  // ============================================

  actionUrl: {
    type: 'string',
    description: 'URL to take action/view details'
  },

  actionLabel: {
    type: 'string',
    description: 'Label for action button'
  },

  // ============================================
  // EMAIL CHANNEL
  // ============================================

  email: {
    type: 'object',
    description: 'Email delivery tracking',
    properties: {
      sent: {
        type: 'boolean',
        default: false,
        description: 'Whether email was sent'
      },
      sentAt: {
        type: 'date',
        description: 'When email was sent'
      },
      messageId: {
        type: 'string',
        description: 'Email service message ID'
      },
      error: {
        type: 'string',
        description: 'Error message if send failed'
      },
      opened: {
        type: 'boolean',
        default: false,
        description: 'Whether email was opened (if tracking enabled)'
      },
      openedAt: {
        type: 'date',
        description: 'When email was opened'
      },
      openCount: {
        type: 'number',
        default: 0,
        description: 'Number of times opened'
      },
      clicked: {
        type: 'boolean',
        default: false,
        description: 'Whether link was clicked'
      },
      clickedAt: {
        type: 'date',
        description: 'When link was clicked'
      }
    }
  },

  // ============================================
  // IN-APP NOTIFICATION
  // ============================================

  inApp: {
    type: 'object',
    description: 'In-app notification tracking',
    properties: {
      sent: {
        type: 'boolean',
        default: false,
        description: 'Whether notification was created'
      },
      sentAt: {
        type: 'date',
        description: 'When notification was created'
      },
      read: {
        type: 'boolean',
        default: false,
        description: 'Whether user has read it'
      },
      readAt: {
        type: 'date',
        description: 'When user read it'
      },
      dismissed: {
        type: 'boolean',
        default: false,
        description: 'Whether user dismissed it'
      },
      dismissedAt: {
        type: 'date',
        description: 'When user dismissed it'
      }
    }
  },

  // ============================================
  // PUSH NOTIFICATION
  // ============================================

  pushNotification: {
    type: 'object',
    description: 'Web push notification tracking',
    properties: {
      sent: {
        type: 'boolean',
        default: false,
        description: 'Whether push was sent'
      },
      sentAt: {
        type: 'date',
        description: 'When push was sent'
      },
      clicked: {
        type: 'boolean',
        default: false,
        description: 'Whether user clicked notification'
      },
      clickedAt: {
        type: 'date',
        description: 'When user clicked it'
      },
      error: {
        type: 'string',
        description: 'Error if send failed'
      }
    }
  },

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
  },

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

/**
 * Notification templates for different event types
 */
export const notificationTemplates = {
  'product-approved': {
    title: 'Product Approved! 🎉',
    message: 'Your product has been approved and will be published soon.',
    channels: ['email', 'inApp', 'push']
  },
  'product-rejected': {
    title: 'Product Review - Not Approved',
    message: 'Your product submission needs revision.',
    channels: ['email', 'inApp']
  },
  'product-revision-requested': {
    title: 'Product Revision Requested',
    message: 'Please review the feedback and make corrections.',
    channels: ['email', 'inApp', 'push']
  },
  'product-published': {
    title: 'Product Live! 🚀',
    message: 'Your product is now available in the shop.',
    channels: ['email', 'inApp', 'push']
  },
  'cad-request-new': {
    title: 'New CAD Request Available',
    message: 'A customer requested a custom design using this gemstone.',
    channels: ['email', 'inApp', 'push']
  },
  'cad-design-submitted': {
    title: 'Design Submitted for Review',
    message: 'A designer has submitted design options for review.',
    channels: ['email', 'inApp']
  },
  'cad-design-approved': {
    title: 'Design Approved! ✓',
    message: 'Your design has been approved and is now available.',
    channels: ['email', 'inApp', 'push']
  },
  'cad-design-declined': {
    title: 'Design Feedback',
    message: 'Please review the feedback and submit revisions.',
    channels: ['email', 'inApp']
  },
  'drop-request-new': {
    title: 'New Drop Request - Submit Your Work!',
    message: 'A new drop has been announced with your specific needs.',
    channels: ['email', 'inApp', 'push']
  },
  'artisan-selected-for-drop': {
    title: 'Congratulations! You\'re In The Drop 🌟',
    message: 'Your product has been selected for the upcoming collection.',
    channels: ['email', 'inApp', 'push']
  },
  'artisan-not-selected': {
    title: 'Drop Results',
    message: 'Thank you for your submission. Your product wasn\'t selected this time.',
    channels: ['email', 'inApp']
  }
};

/**
 * Indexes for notifications
 */
export const notificationIndexes = [
  { userId: 1, createdAt: -1 },           // Get user's notifications
  { userId: 1, 'inApp.read': 1 },         // Unread notifications
  { userId: 1, isArchived: 1 },           // Active notifications
  { userEmail: 1, 'email.sent': 1 },      // Email delivery tracking
  { relatedId: 1, relatedType: 1 },       // Find notifications by entity
  { type: 1, createdAt: -1 }              // Get notifications by type
];
