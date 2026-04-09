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
