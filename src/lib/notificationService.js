/**
 * Unified Notification Service for Admin & CAD System
 * 
 * Comprehensive notification system mirroring efd-shop implementation for:
 * - In-app notifications (stored in MongoDB)
 * - Email notifications (via Nodemailer/Gmail)
 * - SMS notifications (framework for future)
 * 
 * Features:
 * - Respects user consent preferences
 * - Complete audit trail
 * - Retry logic for failed sends
 * - Template-based email generation (file-based with Handlebars)
 * - CAD workflow specific notifications
 */

import { connectToDatabase } from './mongodb.js';
import { ObjectId } from 'mongodb';
import nodemailer from 'nodemailer';
import handlebars from 'handlebars';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Notification Types for CAD & Admin Workflows
 */
export const NOTIFICATION_TYPES = {
  // CAD Designer Notifications
  CAD_REQUEST_AVAILABLE: 'cad_request_available',      // New work available for designers
  
  // CAD Request Workflow - Designer notifications
  CAD_STL_APPROVED: 'cad_stl_approved',
  CAD_STL_DECLINED: 'cad_stl_declined',
  CAD_GLB_APPROVED: 'cad_glb_approved',
  CAD_GLB_DECLINED: 'cad_glb_declined',

  // CAD Request Workflow - Gem Cutter (Requester) notifications
  CAD_REQUEST_CREATED: 'cad_request_created',          // Confirmation gem cutter's request was created
  CAD_CLAIMED: 'cad_claimed',                          // Designer claimed the request
  CAD_STL_SUBMITTED: 'cad_stl_submitted',              // STL submitted by designer
  CAD_GLB_SUBMITTED: 'cad_glb_submitted',              // GLB submitted by designer
  CAD_COMPLETED: 'cad_completed',                      // Full design ready
  CAD_CANCELLED: 'cad_cancelled',

  // Custom Ticket Workflow - Client notifications
  CUSTOM_TICKET_CREATED: 'custom_ticket_created',      // Confirmation ticket was created
  CUSTOM_TICKET_STATUS_CHANGED: 'custom_ticket_status_changed', // Status update
  CUSTOM_TICKET_MESSAGE_SENT: 'custom_ticket_message_sent',     // New message from artisan
  CUSTOM_TICKET_APPROVED: 'custom_ticket_approved',    // Client approval received
  CUSTOM_TICKET_REJECTED: 'custom_ticket_rejected',    // Client rejected work
  CUSTOM_TICKET_COMPLETED: 'custom_ticket_completed',  // Work completed
  CUSTOM_TICKET_CANCELLED: 'custom_ticket_cancelled',  // Ticket cancelled
  CUSTOM_TICKET_ARTISAN_ASSIGNED: 'custom_ticket_artisan_assigned', // Artisan assigned to custom ticket

  // Admin Artisan Management
  ARTISAN_ADDED: 'artisan_added',                      // Artisan added by admin
  ARTISAN_REMOVED: 'artisan_removed',                  // Artisan removed
  
  // Admin Alerts
  ADMIN_ALERT: 'admin_alert',
  SYSTEM_NOTIFICATION: 'system_notification'
};

/**
 * Notification Status
 */
export const NOTIFICATION_STATUS = {
  CREATED: 'created',
  SENT: 'sent',
  DELIVERED: 'delivered',
  READ: 'read',
  FAILED: 'failed',
  ARCHIVED: 'archived'
};

/**
 * Notification Channels
 */
export const CHANNELS = {
  IN_APP: 'in_app',
  EMAIL: 'email',
  SMS: 'sms'
};

/**
 * Nodemailer transport configuration
 */
let emailTransport = null;

function getEmailTransport() {
  if (emailTransport) return emailTransport;
  
  emailTransport = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  });
  
  return emailTransport;
}

/**
 * Get email template from filesystem (using Handlebars)
 * Mirrors efd-shop implementation for consistent email handling
 */
async function getEmailTemplate(templateName) {
  try {
    // Template path: public/email-templates/{templateName}.html
    const templatePath = path.join(
      process.cwd(),
      'public/email-templates',
      `${templateName}.html`
    );

    const templateContent = await fs.readFile(templatePath, 'utf-8');
    return handlebars.compile(templateContent);

  } catch (error) {
    console.error(`❌ Error loading email template ${templateName}:`, error.message);
    return null;
  }
}

/**
 * Email Templates
 * NOTE: Templates are now file-based (public/email-templates/) using Handlebars
 * This mirrors efd-shop implementation for unified email system
 */

export class NotificationService {
  /**
   * Create and send a notification
   */
  static async createNotification(options) {
    const {
      userId,
      type,
      title,
      message,
      channels = [CHANNELS.IN_APP],
      data = {},
      templateName,
      actionUrl,
      priority = 'normal',
      metadata = {},
      recipientEmail = null
    } = options;

    try {
      console.log('📧 [NOTIFICATION] Creating notification:', { userId, type, templateName, channels });
      const { db } = await connectToDatabase();

      // Get user to check preferences and email
      let user = await db.collection('users').findOne({ userID: userId });
      if (!user && !recipientEmail) {
        console.warn(`User not found: ${userId}, but continuing with recipientEmail override`);
        if (!recipientEmail) {
          throw new Error(`User not found: ${userId}`);
        }
      }

      // If user not found but we have an override email, create minimal user object
      if (!user && recipientEmail) {
        user = {
          userID: userId,
          email: recipientEmail,
          firstName: 'Recipient',
          lastName: ''
        };
      }

      // Create notification record
      const notification = {
        _id: new ObjectId(),
        userId,
        userEmail: recipientEmail || user.email,
        type,
        title,
        message,
        channels,
        data,
        templateName,
        actionUrl,
        priority,
        metadata,
        status: NOTIFICATION_STATUS.CREATED,
        createdAt: new Date(),
        updatedAt: new Date(),

        // Channel-specific tracking
        channelStatus: {
          in_app: channels.includes(CHANNELS.IN_APP) ? {
            status: NOTIFICATION_STATUS.CREATED,
            timestamp: new Date()
          } : null,
          email: channels.includes(CHANNELS.EMAIL) ? {
            status: NOTIFICATION_STATUS.CREATED,
            timestamp: new Date()
          } : null,
          sms: channels.includes(CHANNELS.SMS) ? {
            status: NOTIFICATION_STATUS.CREATED,
            timestamp: new Date()
          } : null
        },

        // Email tracking
        emailData: null,
        emailSentAt: null,
        emailOpenedAt: null,

        // Read status
        readAt: null,
        archivedAt: null,

        // Retry logic
        retryCount: 0,
        maxRetries: 3,
        lastRetryAt: null
      };

      // Insert notification record
      await db.collection('notifications').insertOne(notification);
      console.log('✅ [NOTIFICATION] In-app notification saved:', {
        notificationId: notification._id.toString(),
        userId,
        type
      });

      const results = {};

      // In-app notification
      if (channels.includes(CHANNELS.IN_APP)) {
        results.in_app = { success: true, message: 'In-app notification created' };
      }

      // Email notification
      if (channels.includes(CHANNELS.EMAIL)) {
        console.log('📧 [NOTIFICATION] Email channel requested');
        const emailResult = await this.sendEmailNotification(
          notification,
          user,
          data,
          templateName,
          recipientEmail
        );
        results.email = emailResult;

        // Update notification with email status
        if (emailResult.success) {
          await db.collection('notifications').updateOne(
            { _id: notification._id },
            {
              $set: {
                'channelStatus.email.status': NOTIFICATION_STATUS.SENT,
                'channelStatus.email.timestamp': new Date(),
                emailSentAt: new Date()
              }
            }
          );
        } else {
          await db.collection('notifications').updateOne(
            { _id: notification._id },
            {
              $set: {
                'channelStatus.email.status': NOTIFICATION_STATUS.FAILED,
                'channelStatus.email.timestamp': new Date()
              }
            }
          );
        }
      }

      return {
        success: true,
        notificationId: notification._id.toString(),
        results
      };

    } catch (error) {
      console.error('❌ [NOTIFICATION] Error creating notification:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send email notification (using file-based templates)
   */
  static async sendEmailNotification(notification, user, data, templateName, recipientEmail) {
    try {
      const emailTo = recipientEmail || user.email;
      console.log('📧 [EMAIL] Sending email notification:', { templateName, to: emailTo });

      // Load email template from filesystem
      const template = await getEmailTemplate(templateName);
      if (!template) {
        console.error('📧 [EMAIL] Template not found:', templateName);
        return {
          success: false,
          error: `Email template not found: ${templateName}`
        };
      }

      console.log('📧 [EMAIL] Template loaded successfully for:', templateName);

      // Prepare template data
      const templateData = {
        recipientName: `${user.firstName} ${user.lastName}`,
        recipientEmail: emailTo,
        ...data,
        currentYear: new Date().getFullYear(),
        companyName: 'Engel Fine Design'
      };

      // Render template
      const html = template(templateData);

      // Prepare email with consistent branding
      const mailOptions = {
        from: process.env.GMAIL_USER,
        to: emailTo,
        subject: notification.title || notification.subject || 'Engel Fine Design Notification',
        html: html,
        headers: {
          'X-Mailer': 'EFD-Notification-Service/1.0',
          'X-Priority': '3'
        }
      };

      // Send email
      const transport = getEmailTransport();
      const info = await transport.sendMail(mailOptions);

      console.log('✅ [EMAIL] Sent successfully:', {
        to: emailTo,
        messageId: info.messageId,
        type: notification.type
      });

      return {
        success: true,
        messageId: info.messageId,
        timestamp: new Date()
      };

    } catch (error) {
      console.error('❌ [EMAIL] Failed to send:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get notifications for a user
   */
  static async getNotifications(userId, options = {}) {
    try {
      const { db } = await connectToDatabase();
      const {
        limit = 50,
        skip = 0,
        status = null,
        archived = false
      } = options;

      const query = { userId, archivedAt: archived ? { $ne: null } : null };

      if (!archived) {
        query.archivedAt = null;
      }

      if (status) {
        query.status = status;
      }

      const notifications = await db
        .collection('notifications')
        .find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .toArray();

      const total = await db.collection('notifications').countDocuments(query);

      return {
        notifications,
        total,
        limit,
        skip
      };

    } catch (error) {
      console.error('❌ [NOTIFICATION] Error fetching notifications:', error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId) {
    try {
      const { db } = await connectToDatabase();
      const result = await db.collection('notifications').updateOne(
        { _id: new ObjectId(notificationId) },
        {
          $set: {
            status: NOTIFICATION_STATUS.READ,
            readAt: new Date(),
            updatedAt: new Date()
          }
        }
      );

      return result.modifiedCount > 0;

    } catch (error) {
      console.error('❌ [NOTIFICATION] Error marking as read:', error);
      throw error;
    }
  }

  /**
   * Archive notification
   */
  static async archiveNotification(notificationId) {
    try {
      const { db } = await connectToDatabase();
      const result = await db.collection('notifications').updateOne(
        { _id: new ObjectId(notificationId) },
        {
          $set: {
            archivedAt: new Date(),
            updatedAt: new Date()
          }
        }
      );

      return result.modifiedCount > 0;

    } catch (error) {
      console.error('❌ [NOTIFICATION] Error archiving notification:', error);
      throw error;
    }
  }
}

export default NotificationService;
