// lib/emailService.js
// Email notification service for artisan applications

/**
 * Send application status notification email
 * @param {Object} application - Application data
 * @param {string} status - New status (approved/rejected)
 * @param {string} reviewNotes - Optional review notes
 */
export async function sendApplicationStatusEmail(application, status, reviewNotes = '') {
  // TODO: Implement email sending logic using your preferred service
  // (SendGrid, Nodemailer, AWS SES, etc.)
  
  console.log(`📧 Email notification would be sent to ${application.email}:`);
  console.log(`Status: ${status}`);
  console.log(`Application ID: ${application.applicationId}`);
  if (reviewNotes) {
    console.log(`Notes: ${reviewNotes}`);
  }
  
  // For now, just return success
  // In production, replace this with actual email sending logic
  return { success: true };
}

/**
 * Send welcome email to approved artisans
 * @param {Object} application - Application data
 */
export async function sendWelcomeEmail(application) {
  console.log(`📧 Welcome email would be sent to ${application.email}`);
  console.log(`Welcome to the artisan partnership program, ${application.firstName}!`);
  
  return { success: true };
}

/**
 * Generate email templates
 */
export const emailTemplates = {
  approved: (application, reviewNotes) => ({
    subject: `🎉 Your Artisan Application Has Been Approved - ${application.applicationId}`,
    html: `
      <h2>Congratulations ${application.firstName}!</h2>
      <p>We're excited to inform you that your artisan partnership application has been <strong>approved</strong>!</p>
      
      <div style="background: #f0f9ff; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <h3>Application Details:</h3>
        <p><strong>Application ID:</strong> ${application.applicationId}</p>
        <p><strong>Business Name:</strong> ${application.businessName || 'N/A'}</p>
        <p><strong>Artisan Type:</strong> ${application.artisanType}</p>
      </div>
      
      ${reviewNotes ? `
        <div style="background: #f0f9ff; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <h3>Review Notes:</h3>
          <p>${reviewNotes}</p>
        </div>
      ` : ''}
      
      <p>Next steps:</p>
      <ul>
        <li>We'll be in touch shortly with onboarding information</li>
        <li>You'll receive access to our artisan portal</li>
        <li>Partnership agreement details will be sent separately</li>
      </ul>
      
      <p>Welcome to the Engel Fine Design artisan network!</p>
      
      <p>Best regards,<br>The Engel Fine Design Team</p>
    `,
    text: `
      Congratulations ${application.firstName}!
      
      Your artisan partnership application (${application.applicationId}) has been approved!
      
      We'll be in touch shortly with next steps and onboarding information.
      
      Welcome to the Engel Fine Design artisan network!
      
      Best regards,
      The Engel Fine Design Team
    `
  }),
  
  rejected: (application, reviewNotes) => ({
    subject: `Artisan Application Update - ${application.applicationId}`,
    html: `
      <h2>Thank you for your interest, ${application.firstName}</h2>
      <p>Thank you for taking the time to apply for our artisan partnership program.</p>
      
      <p>After careful review, we've decided not to move forward with your application at this time.</p>
      
      <div style="background: #f0f9ff; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <h3>Application Details:</h3>
        <p><strong>Application ID:</strong> ${application.applicationId}</p>
        <p><strong>Submitted:</strong> ${new Date(application.submittedAt).toLocaleDateString()}</p>
      </div>
      
      ${reviewNotes ? `
        <div style="background: #fef3c7; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <h3>Feedback:</h3>
          <p>${reviewNotes}</p>
        </div>
      ` : ''}
      
      <p>We encourage you to continue developing your craft and consider reapplying in the future.</p>
      
      <p>Thank you again for your interest in partnering with us.</p>
      
      <p>Best regards,<br>The Engel Fine Design Team</p>
    `,
    text: `
      Thank you for your interest, ${application.firstName}
      
      After careful review of your application (${application.applicationId}), we've decided not to move forward at this time.
      
      ${reviewNotes ? `Feedback: ${reviewNotes}` : ''}
      
      We encourage you to continue developing your craft and consider reapplying in the future.
      
      Best regards,
      The Engel Fine Design Team
    `
  })
};