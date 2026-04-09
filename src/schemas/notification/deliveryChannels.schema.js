export const deliveryChannelsSchema = {
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
  }
};
