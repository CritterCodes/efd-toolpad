import {
  createNotification as realCreateNotification,
  getUserNotifications,
  markNotificationAsRead,
  archiveNotification,
} from '../../lib/notificationService.js';

/**
 * Notification type constants used across the application.
 * These are string identifiers that map to email templates and notification categories.
 */
export const NOTIFICATION_TYPES = {
  // Custom Tickets
  CUSTOM_TICKET_CREATED: 'custom-ticket-created',
  CUSTOM_TICKET_STATUS_CHANGED: 'custom-ticket-status-changed',
  CUSTOM_TICKET_MESSAGE_SENT: 'custom-ticket-message-sent',
  CUSTOM_TICKET_ARTISAN_ASSIGNED: 'custom-ticket-artisan-assigned',

  // CAD / Design
  CAD_REQUEST_CREATED: 'cad-request-new',
  CAD_REQUEST_AVAILABLE: 'cad-request-new',
  CAD_CLAIMED: 'cad-design-submitted',
  CAD_STL_SUBMITTED: 'cad-design-submitted',
  CAD_GLB_SUBMITTED: 'cad-design-submitted',
  CAD_STL_APPROVED: 'cad-design-approved',
  CAD_GLB_APPROVED: 'cad-design-approved',
  CAD_STL_DECLINED: 'cad-design-declined',
  CAD_GLB_DECLINED: 'cad-design-declined',
  CAD_COMPLETED: 'cad-design-approved',

  // Products / Artisan
  PRODUCT_APPROVED: 'product-approved',
  PRODUCT_REJECTED: 'product-rejected',
  PRODUCT_REVISION_REQUESTED: 'product-revision-requested',
  PRODUCT_PUBLISHED: 'product-published',
  ARTISAN_ADDED: 'artisan-added',

  // Drops
  DROP_REQUEST_NEW: 'drop-request-new',
  ARTISAN_SELECTED_FOR_DROP: 'artisan-selected-for-drop',
  ARTISAN_NOT_SELECTED: 'artisan-not-selected',

  // Payments / Invoices
  INVOICE_CREATED: 'invoice-created',
  PAYMENT_RECEIVED: 'payment-received',
  PAYMENT_THRESHOLD_REACHED: 'payment-threshold-reached',
};

export const NOTIFICATION_STATUS = {
  PENDING: 'pending',
  SENT: 'sent',
  FAILED: 'failed',
  READ: 'read',
};

export const CHANNELS = {
  IN_APP: 'inApp',
  EMAIL: 'email',
  SMS: 'sms',
  PUSH: 'push',
};

/**
 * NotificationService bridge — delegates to the real lib/notificationService.js.
 * Exposes static methods so callers can use NotificationService.createNotification().
 */
export class NotificationService {
  static async createNotification({
    userId,
    type,
    title,
    message,
    channels = ['inApp', 'email'],
    data = {},
    templateName,
    recipientEmail,
    priority = 'normal',
    tags = [],
  }) {
    const resolvedChannels = (channels || []).map((ch) => {
      if (ch === 'inApp' || ch === CHANNELS.IN_APP) return 'inApp';
      if (ch === 'email' || ch === CHANNELS.EMAIL) return 'email';
      if (ch === 'push' || ch === CHANNELS.PUSH) return 'push';
      return ch;
    });

    return realCreateNotification({
      userId,
      userEmail: recipientEmail || data?.recipientEmail || '',
      userRole: data?.userRole || 'user',
      type: templateName || type,
      title,
      message,
      relatedId: data?.ticketNumber || data?.requestId || data?.productId || '',
      relatedType: data?.relatedType || '',
      relatedData: data,
      actionUrl: data?.ticketUrl || data?.actionUrl || '',
      actionLabel: data?.actionLabel || 'View Details',
      channels: resolvedChannels,
      priority,
      tags,
    });
  }

  static async getNotifications(userId, options = {}) {
    return getUserNotifications(userId, {
      limit: options.limit || 50,
      page: options.page || Math.floor((options.skip || 0) / (options.limit || 50)) + 1,
      unreadOnly: options.status === 'unread',
    });
  }

  static async markAsRead(notificationId, userId) {
    return markNotificationAsRead(notificationId, userId);
  }

  static async archiveNotification(notificationId) {
    return archiveNotification(notificationId);
  }
}

const notificationServiceInstance = {
  getNotifications: (userId, options) => NotificationService.getNotifications(userId, options),
  createNotification: (params) => NotificationService.createNotification(params),
  markAsRead: (id, userId) => NotificationService.markAsRead(id, userId),
  archiveNotification: (id) => NotificationService.archiveNotification(id),
};

export default notificationServiceInstance;
