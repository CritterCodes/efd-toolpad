import nodemailer from 'nodemailer';
import Handlebars from 'handlebars/dist/cjs/handlebars.js';
import fs from 'fs';
import path from 'path';
import { adminBase, shopBase } from './appUrls.js';

/**
 * Email Service Configuration
 * Uses Gmail SMTP with NodeMailer
 */

let transporter = null;

/**
 * Initialize email transporter
 */
/**
 * Resolve the mail credentials from either supported key name. PURE and exported so it can be tested
 * without opening an SMTP connection.
 *
 * EMAIL_PASS is the name actually deployed, so it must keep working; EMAIL_PASSWORD is preferred so the
 * two mail modules can converge later without another silent outage. The error names both, because the
 * old message named only EMAIL_PASSWORD and sent whoever read it looking for a secret that was already
 * configured under the other key.
 */
export function resolveMailCredentials(env = process.env) {
  const user = env.EMAIL_USER;
  const pass = env.EMAIL_PASSWORD || env.EMAIL_PASS;
  if (!user || !pass) {
    const missing = [!user && 'EMAIL_USER', !pass && 'EMAIL_PASSWORD (or EMAIL_PASS)'].filter(Boolean);
    throw new Error(`${missing.join(' and ')} environment variable${missing.length > 1 ? 's are' : ' is'} required`);
  }
  return { user, pass };
}

function initializeTransporter() {
  if (transporter) return transporter;

  // ACCEPTS EITHER KEY NAME, and this is why no email has ever sent from production.
  //
  // The app grew two mail modules with two different names for the same secret:
  // src/app/utils/email.util.js reads EMAIL_PASS, this file read EMAIL_PASSWORD. Production has
  // EMAIL_PASS set, so the util worked and every notification — quotes, invoices, receipts, artisan
  // mail — died here on a credential that was configured all along, under the other name.
  //
  // Nothing gave that away: the failure was swallowed into `{ success: false }` and recorded as
  // `email.sent: true` (see lib/notificationService.js), so the error text "EMAIL_PASSWORD ... is
  // required" only ever appeared in Vercel runtime logs nobody was reading.
  //
  // EMAIL_PASS is the name that is actually deployed, so it has to keep working; EMAIL_PASSWORD is
  // preferred so the two modules can converge on one name later without another silent outage.
  const { user, pass } = resolveMailCredentials(process.env);

  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass }
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

    // PRE-RENDERED HTML BYPASSES THE TEMPLATE. Custom-order invoices and receipts are built by the same
    // pure renderer the printed copy uses, so the emailed and printed documents cannot drift. Passing
    // the html straight through also keeps those two off the .hbs filesystem path entirely.
    const html = data.__html || loadTemplate(template)(data);

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
  // Application review outcomes. Unregistered, these fell through to `generic-notification`, whose
  // CTA reads "View Details" unless `actionLabel` is passed — so the one email that has to say
  // "sign in at a DIFFERENT site with your shop password" said nothing of the kind.
  'artisan-approved': {
    subject: "You're approved — welcome to the Engel Fine Design artisan network",
    templateName: 'artisan-approved'
  },
  'artisan-rejected': {
    subject: 'Update on your artisan application',
    templateName: 'artisan-rejected'
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
  // Fall back to a generic template (driven by the notification's title/message) for any
  // type without a bespoke template — so every notification type can still send email.
  const template = emailTemplates[notificationType] || {
    subject: data.title || 'Notification from Engel Fine Design',
    templateName: 'generic-notification',
  };

  try {
    return await sendEmailWithRetry({
      to: recipientEmail,
      subject: template.subject,
      template: template.templateName,
      data: {
        ...data,
        // These three used to fall back to "engel**s**finedesign.com" — an extra "s", a domain EFD
        // does not own — and since none of the env vars is set in production, that fallback is what
        // every email actually rendered: a dead support address and dead links. URL resolution now
        // lives in lib/appUrls.js (absolute or nothing).
        supportEmail: process.env.SUPPORT_EMAIL || 'critter@engelfinedesign.com',
        dashboardUrl: adminBase(),
        shopUrl: shopBase()
      }
    });
  } catch (error) {
    console.error(`❌ Failed to send ${notificationType} email to ${recipientEmail}:`, error.message);
    return { success: false, reason: error.message };
  }
}
