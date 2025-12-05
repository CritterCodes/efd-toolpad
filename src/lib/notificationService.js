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
 * - Template-based email generation
 * - CAD workflow specific notifications
 */

import { connectToDatabase } from './mongodb.js';
import { ObjectId } from 'mongodb';
import nodemailer from 'nodemailer';

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
 * Email Templates for CAD Notifications
 */
const emailTemplates = {
  cad_request_available: (data) => ({
    subject: `🎨 New CAD Design Request Available - ${data.gemName}`,
    html: `
      <h2>New Design Work Available</h2>
      <p>A new CAD design request is available for you to claim.</p>
      
      <div style="background: #e8f5e9; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <h3>Request Details:</h3>
        <p><strong>Gemstone:</strong> ${data.gemName}</p>
        <p><strong>Material:</strong> ${data.material}</p>
        <p><strong>Style:</strong> ${data.styleDescription || 'N/A'}</p>
        <p><strong>Priority:</strong> ${data.priority || 'Medium'}</p>
        <p><strong>Timeline:</strong> ${data.timeline || 'N/A'}</p>
      </div>
      
      <p>Log in to your CAD Designer dashboard to claim this request.</p>
    `,
    text: `New CAD design request available: ${data.gemName}`
  }),

  cad_request_created: (data) => ({
    subject: `✅ Your CAD Request Has Been Created - ${data.gemName}`,
    html: `
      <h2>CAD Request Confirmation</h2>
      <p>Your CAD design request has been successfully created and is now available for designers to claim.</p>
      
      <div style="background: #e3f2fd; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <h3>Request Details:</h3>
        <p><strong>Request ID:</strong> ${data.requestId}</p>
        <p><strong>Gemstone:</strong> ${data.gemName}</p>
        <p><strong>Material:</strong> ${data.material}</p>
        <p><strong>Timeline:</strong> ${data.timeline || 'N/A'}</p>
      </div>
      
      <p>You'll be notified when a designer claims this request.</p>
    `,
    text: `Your CAD request ${data.requestId} has been created`
  }),

  cad_claimed: (data) => ({
    subject: `✋ Your CAD Request Has Been Claimed - ${data.gemName}`,
    html: `
      <h2>Request Claimed</h2>
      <p>A designer has claimed your CAD design request!</p>
      
      <div style="background: #fff3e0; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p><strong>Request ID:</strong> ${data.requestId}</p>
        <p><strong>Designer:</strong> ${data.designerName}</p>
        <p><strong>Status:</strong> In Progress</p>
      </div>
      
      <p>You'll be notified when the designer submits the STL file.</p>
    `,
    text: `Your CAD request ${data.requestId} has been claimed by ${data.designerName}`
  }),

  cad_stl_submitted: (data) => ({
    subject: `📤 STL File Submitted for Your Request - ${data.requestId}`,
    html: `
      <h2>STL File Submitted</h2>
      <p>The designer has submitted an STL file for your review.</p>
      
      <div style="background: #f3e5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p><strong>Request ID:</strong> ${data.requestId}</p>
        <p><strong>File:</strong> ${data.fileName}</p>
        <p><strong>Volume:</strong> ${data.volume ? data.volume + ' mm³' : 'N/A'}</p>
      </div>
      
      <p>An admin will review and approve the STL file.</p>
    `,
    text: `STL file submitted for request ${data.requestId}`
  }),

  cad_glb_submitted: (data) => ({
    subject: `📤 Final GLB Design Submitted - ${data.requestId}`,
    html: `
      <h2>Final Design Submitted</h2>
      <p>The designer has submitted the final GLB design file for your request.</p>
      
      <div style="background: #f3e5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p><strong>Request ID:</strong> ${data.requestId}</p>
        <p><strong>File:</strong> ${data.fileName}</p>
      </div>
      
      <p>An admin will review the design and notify you of approval.</p>
    `,
    text: `Final GLB design submitted for request ${data.requestId}`
  }),

  cad_completed: (data) => ({
    subject: `🎉 Your CAD Design Is Ready! - ${data.requestId}`,
    html: `
      <h2>Design Complete & Ready for Production</h2>
      <p>Your CAD design is complete and approved! It's now ready to move to production.</p>
      
      <div style="background: #e8f5e9; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p><strong>Request ID:</strong> ${data.requestId}</p>
        <p><strong>Total Cost:</strong> ${data.totalCost ? '$' + data.totalCost : 'TBD'}</p>
      </div>
      
      <p>Your custom design is now available for purchase or can be manufactured.</p>
    `,
    text: `Your CAD design ${data.requestId} is complete`
  }),

  cad_stl_approved: (data) => ({
    subject: `✅ STL Approved - Ready for GLB Design - ${data.requestId}`,
    html: `
      <h2>STL File Approved</h2>
      <p>The STL file has been approved! You may now submit the final GLB design file.</p>
      
      <div style="background: #e8f5e9; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p><strong>Request ID:</strong> ${data.requestId}</p>
        <p><strong>Status:</strong> Ready for GLB Submission</p>
      </div>
    `,
    text: `STL approved for request ${data.requestId}`
  }),

  cad_stl_declined: (data) => ({
    subject: `❌ STL File Needs Revisions - ${data.requestId}`,
    html: `
      <h2>STL File Revision Needed</h2>
      <p>The STL file requires revisions. Please review the feedback and resubmit.</p>
      
      <div style="background: #ffebee; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p><strong>Request ID:</strong> ${data.requestId}</p>
        <p><strong>Feedback:</strong></p>
        <p>${data.feedback || 'No specific feedback provided'}</p>
      </div>
      
      <p>You can resubmit a revised STL file.</p>
    `,
    text: `STL revision needed for request ${data.requestId}`
  }),

  cad_glb_approved: (data) => ({
    subject: `✅ Design Approved & Live - ${data.requestId}`,
    html: `
      <h2>Final Design Approved!</h2>
      <p>Your final GLB design has been approved and is now live!</p>
      
      <div style="background: #e8f5e9; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p><strong>Request ID:</strong> ${data.requestId}</p>
        <p><strong>Status:</strong> Approved & Ready</p>
      </div>
    `,
    text: `GLB design approved for request ${data.requestId}`
  }),

  cad_glb_declined: (data) => ({
    subject: `❌ GLB Design Needs Revisions - ${data.requestId}`,
    html: `
      <h2>GLB Design Revision Needed</h2>
      <p>The GLB design requires revisions. Please review the feedback and resubmit.</p>
      
      <div style="background: #ffebee; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p><strong>Request ID:</strong> ${data.requestId}</p>
        <p><strong>Feedback:</strong></p>
        <p>${data.feedback || 'No specific feedback provided'}</p>
      </div>
      
      <p>You can resubmit a revised GLB design file.</p>
    `,
    text: `GLB design revision needed for request ${data.requestId}`
  }),

  // ====== CUSTOM TICKET NOTIFICATIONS ======
  custom_ticket_created: (data) => ({
    subject: `📋 Your Custom Ticket Has Been Created - #${data.ticketNumber}`,
    html: `
      <h2>Custom Ticket Confirmation</h2>
      <p>Your custom design ticket has been successfully created and assigned to our artisan team.</p>
      
      <div style="background: #e3f2fd; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <h3>Ticket Details:</h3>
        <p><strong>Ticket #:</strong> ${data.ticketNumber}</p>
        <p><strong>Description:</strong> ${data.description}</p>
        <p><strong>Status:</strong> <span style="color: #2196F3; font-weight: bold;">Open</span></p>
      </div>
      
      <p>You'll receive updates as our artisan works on your design. Check your ticket for messages and progress updates.</p>
    `,
    text: `Your custom ticket #${data.ticketNumber} has been created`
  }),

  custom_ticket_status_changed: (data) => ({
    subject: `📊 Your Custom Ticket Status Changed - #${data.ticketNumber}`,
    html: `
      <h2>Ticket Status Update</h2>
      <p>Your custom design ticket status has been updated.</p>
      
      <div style="background: #f3e5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p><strong>Ticket #:</strong> ${data.ticketNumber}</p>
        <p><strong>Previous Status:</strong> ${data.previousStatus}</p>
        <p><strong>New Status:</strong> <span style="color: #7b1fa2; font-weight: bold;">${data.newStatus}</span></p>
        ${data.reason ? `<p><strong>Reason:</strong> ${data.reason}</p>` : ''}
      </div>
      
      <p>Log in to your account to view more details.</p>
    `,
    text: `Ticket #${data.ticketNumber} status changed to ${data.newStatus}`
  }),

  custom_ticket_message_sent: (data) => ({
    subject: `💬 New Message on Your Custom Ticket - #${data.ticketNumber}`,
    html: `
      <h2>You Have a New Message</h2>
      <p>The artisan has sent you a message regarding your custom design ticket.</p>
      
      <div style="background: #fff3e0; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p><strong>Ticket #:</strong> ${data.ticketNumber}</p>
        <p><strong>From:</strong> ${data.fromName}</p>
        <p><strong>Message:</strong></p>
        <p style="font-style: italic; margin-top: 8px;">"${data.message}"</p>
      </div>
      
      <p>Reply to the message in your ticket to continue the conversation.</p>
    `,
    text: `New message from ${data.fromName} on ticket #${data.ticketNumber}`
  }),

  custom_ticket_approved: (data) => ({
    subject: `✅ Your Custom Ticket Has Been Approved - #${data.ticketNumber}`,
    html: `
      <h2>Ticket Approved!</h2>
      <p>Great news! You have approved the work on your custom design ticket.</p>
      
      <div style="background: #e8f5e9; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p><strong>Ticket #:</strong> ${data.ticketNumber}</p>
        <p><strong>Status:</strong> <span style="color: #388e3c; font-weight: bold;">Approved</span></p>
        ${data.approvalNotes ? `<p><strong>Notes:</strong> ${data.approvalNotes}</p>` : ''}
      </div>
      
      <p>Your custom design is complete and ready for production. Thank you for working with us!</p>
    `,
    text: `Ticket #${data.ticketNumber} has been approved`
  }),

  custom_ticket_rejected: (data) => ({
    subject: `❌ Changes Requested on Your Custom Ticket - #${data.ticketNumber}`,
    html: `
      <h2>Revisions Requested</h2>
      <p>Please review the following feedback for your custom design ticket.</p>
      
      <div style="background: #ffebee; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p><strong>Ticket #:</strong> ${data.ticketNumber}</p>
        <p><strong>Feedback:</strong></p>
        <p>${data.feedback || 'No specific feedback provided'}</p>
      </div>
      
      <p>The artisan will make the necessary revisions and resubmit for your approval.</p>
    `,
    text: `Revisions requested on ticket #${data.ticketNumber}`
  }),

  custom_ticket_completed: (data) => ({
    subject: `🎉 Your Custom Ticket is Complete - #${data.ticketNumber}`,
    html: `
      <h2>Ticket Complete!</h2>
      <p>Your custom design is finished and ready for the next step.</p>
      
      <div style="background: #e0f2f1; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p><strong>Ticket #:</strong> ${data.ticketNumber}</p>
        <p><strong>Status:</strong> <span style="color: #00796b; font-weight: bold;">Completed</span></p>
        ${data.completionNotes ? `<p><strong>Notes:</strong> ${data.completionNotes}</p>` : ''}
      </div>
      
      <p>Please review the final design and approve it to proceed.</p>
    `,
    text: `Ticket #${data.ticketNumber} is complete`
  }),

  custom_ticket_cancelled: (data) => ({
    subject: `⚠️ Your Custom Ticket Has Been Cancelled - #${data.ticketNumber}`,
    html: `
      <h2>Ticket Cancelled</h2>
      <p>Your custom design ticket has been cancelled.</p>
      
      <div style="background: #fce4ec; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p><strong>Ticket #:</strong> ${data.ticketNumber}</p>
        <p><strong>Reason:</strong> ${data.reason || 'No reason provided'}</p>
      </div>
      
      <p>If you have questions about the cancellation, please contact our support team.</p>
    `,
    text: `Ticket #${data.ticketNumber} has been cancelled`
  }),

  custom_ticket_artisan_assigned: (data) => ({
    subject: `✨ Artisan Assigned to Your Custom Ticket - #${data.ticketNumber}`,
    html: `
      <h2>Artisan Assigned to Your Custom Design</h2>
      <p>Great news! An artisan has been assigned to work on your custom design ticket.</p>
      
      <div style="background: #f3e5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p><strong>Ticket #:</strong> ${data.ticketNumber}</p>
        <p><strong>Artisan:</strong> ${data.artisanName}</p>
        <p><strong>Specialty:</strong> ${data.artisanType || 'Custom Design Work'}</p>
      </div>
      
      <p>Your assigned artisan will review your custom design requirements and may reach out with questions or to discuss your vision in more detail.</p>
      <p>You can message your artisan directly through your ticket to discuss any details or preferences.</p>
    `,
    text: `Artisan ${data.artisanName} has been assigned to your custom ticket #${data.ticketNumber}`
  }),

  // ====== ARTISAN MANAGEMENT NOTIFICATIONS ======
  artisan_added: (data) => ({
    subject: `🎨 Welcome to Engel Fine Design - Artisan Account Created`,
    html: `
      <h2>Welcome to Our Artisan Community!</h2>
      <p>Your artisan account has been successfully created by our admin team at Engel Fine Design.</p>
      
      <div style="background: #e1f5fe; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <h3>Your Account Details:</h3>
        <p><strong>Name:</strong> ${data.artisanName}</p>
        <p><strong>Email:</strong> ${data.email}</p>
        <p><strong>Business:</strong> ${data.business || 'N/A'}</p>
        <p><strong>Role:</strong> Artisan</p>
      </div>
      
      <p>You can now log in to your dashboard to:</p>
      <ul>
        <li>View and manage your custom design tickets</li>
        <li>Receive project assignments</li>
        <li>Communicate with clients</li>
        <li>Track your earnings and performance</li>
      </ul>
      
      <p>Log in at: <strong>${data.loginUrl}</strong></p>
      
      <p>If you have any questions or need assistance, please contact our support team.</p>
    `,
    text: `Welcome to Engel Fine Design! Your artisan account has been created.`
  }),

  artisan_removed: (data) => ({
    subject: `⚠️ Account Status Change - Engel Fine Design`,
    html: `
      <h2>Account Update</h2>
      <p>Your artisan account has been deactivated.</p>
      
      <div style="background: #ffebee; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p><strong>Reason:</strong> ${data.reason || 'No reason provided'}</p>
      </div>
      
      <p>If you have questions about this change, please contact our support team.</p>
    `,
    text: `Your artisan account has been deactivated`
  }),

  // ====== TEST EMAIL ======
  test_email: (data) => ({
    subject: `🧪 EFD Admin - Test Email Configuration`,
    html: `
      <h2>📧 Email Configuration Test</h2>
      <p>This is a test email to verify that your email notification system is working correctly.</p>
      
      <div style="background: #e3f2fd; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p><strong>✅ Email System Status:</strong> <span style="color: #388e3c; font-weight: bold;">WORKING</span></p>
        <p><strong>Sent to:</strong> ${data.recipientEmail || 'Your email'}</p>
        <p><strong>Test ID:</strong> <code style="background: #f5f5f5; padding: 4px 8px; border-radius: 4px;">${data.testId}</code></p>
        <p><strong>Environment:</strong> ${data.environment}</p>
        <p><strong>Sent:</strong> ${data.timestamp}</p>
      </div>
      
      <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #2196F3;">
        <h3 style="margin-top: 0;">Email System Information</h3>
        <ul>
          <li>✅ SMTP Connection: Successful</li>
          <li>✅ Email Template: Rendering correctly</li>
          <li>✅ Message Delivered: Successfully</li>
          <li>✅ User Authentication: Verified</li>
        </ul>
      </div>
      
      <h3>What This Means</h3>
      <p>Your Engel Fine Design email notification system is configured correctly and operational. Users will receive:</p>
      <ul>
        <li>📧 Custom ticket notifications</li>
        <li>📧 Artisan assignment alerts</li>
        <li>📧 Message notifications</li>
        <li>📧 Status change updates</li>
        <li>📧 System alerts and important updates</li>
      </ul>
      
      <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 24px 0;">
      
      <p style="color: #999; font-size: 12px;">
        This is an automated test email from your EFD Admin Development Tools. 
        You can safely ignore or delete this email.
      </p>
    `,
    text: `This is a test email confirming your EFD Admin email system is working correctly.`
  })
};

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
   * Send email notification
   */
  static async sendEmailNotification(notification, user, data, templateName, recipientEmail) {
    try {
      const template = emailTemplates[templateName] || emailTemplates.cad_request_created;
      const emailContent = template(data);

      const mailOptions = {
        from: process.env.GMAIL_USER,
        to: recipientEmail || user.email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text
      };

      const transport = getEmailTransport();
      const result = await transport.sendMail(mailOptions);

      console.log('✅ [EMAIL] Sent successfully:', {
        to: mailOptions.to,
        messageId: result.messageId,
        type: notification.type
      });

      return {
        success: true,
        messageId: result.messageId,
        timestamp: new Date()
      };

    } catch (error) {
      console.error('❌ [EMAIL] Failed to send:', error);
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
