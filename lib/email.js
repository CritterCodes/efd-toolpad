import nodemailer from 'nodemailer';
import Handlebars from 'handlebars/dist/cjs/handlebars.js';
import fs from 'fs';
import path from 'path';

/**
 * Email Service Configuration
 * Uses Gmail SMTP with NodeMailer
 */

let transporter = null;

/**
 * Initialize email transporter
 */
function initializeTransporter() {
  if (transporter) return transporter;

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    throw new Error('EMAIL_USER and EMAIL_PASSWORD environment variables are required');
  }

  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });

  return transporter;
}

/**
 * Load and compile Handlebars template
 */
function loadTemplate(templateName) {
  const templatePath = path.join(process.cwd(), 'emails', `${templateName}.hbs`);
  
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template not found: ${templateName}`);
  }

  const templateContent = fs.readFileSync(templatePath, 'utf-8');
  return Handlebars.compile(templateContent);
}

/**
 * Send email
 */
export async function sendEmail({
  to,
  subject,
  template,
  data = {},
  cc = [],
  replyTo = null
}) {
  try {
    const transport = initializeTransporter();

    // Load and compile template
    const compiledTemplate = loadTemplate(template);
    const html = compiledTemplate(data);

    // Send email
    const mailOptions = {
      from: process.env.EMAIL_FROM || `"Engel Fine Design" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
      cc,
      replyTo: replyTo || process.env.EMAIL_USER
    };

    const result = await transport.sendMail(mailOptions);

    console.log(`✅ Email sent to ${to}: ${result.messageId}`);

    return {
      success: true,
      messageId: result.messageId,
      timestamp: new Date()
    };
  } catch (error) {
    console.error(`❌ Error sending email to ${to}:`, error);
    throw error;
  }
}

/**
 * Send email with retry logic
 */
export async function sendEmailWithRetry({
  to,
  subject,
  template,
  data = {},
  cc = [],
  replyTo = null,
  maxRetries = 3,
  retryDelay = 5000
}) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await sendEmail({
        to,
        subject,
        template,
        data,
        cc,
        replyTo
      });
    } catch (error) {
      lastError = error;
      console.log(`⚠️ Email send attempt ${attempt} failed for ${to}. Retrying...`);
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }

  throw lastError;
}

/**
 * Verify email configuration
 */
export async function verifyEmailConfiguration() {
  try {
    const transport = initializeTransporter();
    await transport.verify();
    console.log('✅ Email service configured correctly');
    return true;
  } catch (error) {
    console.error('❌ Email configuration error:', error);
    return false;
  }
}

/**
 * Common email templates and their subjects
 */
export const emailTemplates = {
  'product-approved': {
    subject: 'Your Product Has Been Approved! 🎉',
    templateName: 'product-approved'
  },
  'product-rejected': {
    subject: 'Product Review - Not Approved',
    templateName: 'product-rejected'
  },
  'product-revision-requested': {
    subject: 'Product Revision Requested',
    templateName: 'product-revision-request'
  },
  'product-published': {
    subject: 'Your Product is Live! 🚀',
    templateName: 'product-published'
  },
  'cad-request-new': {
    subject: 'New CAD Request Available',
    templateName: 'cad-request-new'
  },
  'cad-design-submitted': {
    subject: 'Design Submitted for Review',
    templateName: 'cad-design-submitted'
  },
  'cad-design-approved': {
    subject: 'Your Design Has Been Approved! ✓',
    templateName: 'cad-design-approved'
  },
  'cad-design-declined': {
    subject: 'Design Feedback',
    templateName: 'cad-design-declined'
  },
  'drop-request-new': {
    subject: 'New Drop Request - Submit Your Work!',
    templateName: 'drop-request-new'
  },
  'artisan-selected-for-drop': {
    subject: 'Congratulations! You\'re In The Drop 🌟',
    templateName: 'artisan-selected'
  },
  'artisan-not-selected': {
    subject: 'Drop Results',
    templateName: 'artisan-not-selected'
  },
  'custom-ticket-created': {
    subject: 'Your Custom Design Ticket Has Been Created',
    templateName: 'custom-ticket-created'
  },
  'custom-ticket-status-changed': {
    subject: 'Custom Ticket Status Update',
    templateName: 'custom-ticket-status-changed'
  },
  'custom-ticket-message-sent': {
    subject: 'New Message on Your Custom Ticket',
    templateName: 'custom-ticket-message-sent'
  },
  'custom-ticket-artisan-assigned': {
    subject: 'You Have Been Assigned to a Custom Ticket',
    templateName: 'custom-ticket-artisan-assigned'
  },
  'custom-ticket-artisan-assigned-client': {
    subject: 'An Artisan Has Been Assigned to Your Custom Design',
    templateName: 'custom-ticket-artisan-assigned-client'
  },
  'artisan-added': {
    subject: 'Welcome to Engel Fine Design!',
    templateName: 'artisan-added'
  },
  'invoice-created': {
    subject: 'New Invoice for Your Custom Design Project',
    templateName: 'invoice-created'
  },
  'payment-received': {
    subject: 'Payment Received — Thank You!',
    templateName: 'payment-received'
  },
  'payment-threshold-reached': {
    subject: 'Payment Threshold Reached — Production Ready',
    templateName: 'payment-threshold-reached'
  }
};

/**
 * Send templated email for specific notification types
 */
export async function sendNotificationEmail({
  recipientEmail,
  notificationType,
  data = {}
}) {
  const template = emailTemplates[notificationType];

  if (!template) {
    console.warn(`⚠️ No email template configured for notification type: ${notificationType}`);
    return { success: false, reason: 'no-template' };
  }

  try {
    return await sendEmailWithRetry({
      to: recipientEmail,
      subject: template.subject,
      template: template.templateName,
      data: {
        ...data,
        supportEmail: process.env.SUPPORT_EMAIL || 'support@engelsfinedesign.com',
        dashboardUrl: process.env.NEXT_PUBLIC_ADMIN_URL || 'https://admin.engelsfinedesign.com',
        shopUrl: process.env.NEXT_PUBLIC_SHOP_URL || 'https://shop.engelsfinedesign.com'
      }
    });
  } catch (error) {
    console.error(`❌ Failed to send ${notificationType} email to ${recipientEmail}:`, error.message);
    return { success: false, reason: error.message };
  }
}
