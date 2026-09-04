// src/app/api/auth/email.util.js
import nodemailer from 'nodemailer';
import { resolveMailCredentials } from '../../../lib/email.js';
import { adminBase, shopBase } from '../../../lib/appUrls.js';

// The From header. EMAIL_USER is not set in production (GMAIL_USER is), so the
// old literal 'Your App Name <undefined>' went out on every auth email. The
// resolver is the single source of the authenticated sender.
function fromHeader() {
    const { user } = resolveMailCredentials();
    return `"Engel Fine Design" <${user}>`;
}

// ONE resolver for both mail modules. This file read EMAIL_PASS while lib/email.js read
// EMAIL_PASSWORD, and production has neither — it has GMAIL_USER / GMAIL_APP_PASSWORD. Two modules
// with two guesses at the same secret is how a whole subsystem stayed dead without anyone noticing.
//
// Built LAZILY: this module used to create the transport at import time, so a missing credential threw
// while the module was loading rather than when an email was sent, taking the importing route with it.
let transporter = null;
function getTransporter() {
    if (transporter) return transporter;
    const { user, pass } = resolveMailCredentials();
    transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass }
    });
    return transporter;
}

// The SAME branded card every other EFD email uses (emails/generic-notification.hbs). Auth emails
// can't go through lib/email.js — its .hbs loading assumes the notification pipeline — so the
// skeleton is inlined here as a string builder. These used to be bare unstyled HTML that opened
// with "Welcome to Our App!" — a customer's very first email from a fine jewelry brand.
function brandedEmailHtml({ title, greeting = '', message, actionUrl, actionLabel, footnote = '' }) {
    const supportEmail = process.env.SUPPORT_EMAIL || 'critter@engelfinedesign.com';
    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>${title}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#18181b;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e4e4e7;">
          <tr>
            <td style="background:#0a0a0a;padding:20px 28px;">
              <span style="color:#D4AF37;font-size:18px;font-weight:600;letter-spacing:0.5px;">Engel Fine Design</span>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              ${greeting ? `<p style="margin:0 0 16px;font-size:15px;">${greeting}</p>` : ''}
              <h1 style="margin:0 0 12px;font-size:20px;font-weight:600;color:#18181b;">${title}</h1>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#3f3f46;">${message}</p>
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:8px;background:#0a0a0a;">
                    <a href="${actionUrl}" target="_blank" style="display:inline-block;padding:12px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">${actionLabel}</a>
                  </td>
                </tr>
              </table>
              ${footnote ? `<p style="margin:24px 0 0;font-size:14px;line-height:1.6;color:#71717a;">${footnote}</p>` : ''}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 28px;border-top:1px solid #e4e4e7;background:#fafafa;">
              <p style="margin:0;font-size:12px;color:#a1a1aa;">Engel Fine Design &middot; <a href="${shopBase()}" style="color:#a1a1aa;">Shop</a> &middot; Questions? <a href="mailto:${supportEmail}" style="color:#a1a1aa;">${supportEmail}</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * ✅ Send a verification email to the user
 * @param {string} email - The user's email address
 * @param {string} token - The verification token
 */
export async function sendVerificationEmail(email, token) {
    const verificationLink = `${process.env.NEXT_PUBLIC_URL}/verify-email?token=${token}`;

    const mailOptions = {
        from: fromHeader(),
        to: email,
        subject: 'Verify Your Email Address',
        html: brandedEmailHtml({
            title: 'Welcome to Engel Fine Design',
            message: 'Thank you for signing up. Please verify your email address by clicking the button below.',
            actionUrl: verificationLink,
            actionLabel: 'Verify Email',
            footnote: 'If you did not sign up, you can safely ignore this message.',
        })
    };

    try {
        const info = await getTransporter().sendMail(mailOptions);
        console.log('Verification email sent:', info.response);
    } catch (error) {
        console.error('Error sending verification email:', error);
        throw new Error('Failed to send verification email');
    }
}

/**
 * ✅ Send a password reset email to the user
 * @param {string} email - The user's email address
 * @param {string} token - The password reset token
 */
export async function sendPasswordResetEmail(email, token) {
    // adminBase() is the URL helper every WORKING prod email already uses;
    // NEXT_PUBLIC_URL is unverified in the deployment env. The page lives at
    // /auth/reset-password -- the old /reset-password link 404'd.
    const resetLink = `${adminBase()}/auth/reset-password?token=${token}`;

    const mailOptions = {
        from: fromHeader(),
        to: email,
        subject: 'Password Reset Request',
        html: brandedEmailHtml({
            title: 'Reset your password',
            message: 'We received a request to reset your password. Click the button below to choose a new one.',
            actionUrl: resetLink,
            actionLabel: 'Reset Password',
            footnote: 'If you did not request a password reset, please ignore this message.',
        })
    };

    try {
        const info = await getTransporter().sendMail(mailOptions);
        console.log('Password reset email sent:', info.response);
    } catch (error) {
        console.error('Error sending password reset email:', error);
        throw new Error('Failed to send password reset email');
    }
}

/**
 * ✅ Send an invite email for admin-created clients
 * @param {string} email - The invited user's email address
 * @param {string} token - The invitation token
 * @param {string} firstName - The invited user's first name
 */
export async function sendInviteEmail(email, token, firstName) {
    const inviteLink = `${process.env.NEXT_PUBLIC_URL}/complete-signup?token=${token}`;

    const mailOptions = {
        from: fromHeader(),
        to: email,
        subject: 'You’ve Been Invited to Engel Fine Design',
        html: brandedEmailHtml({
            title: 'You’ve been invited',
            greeting: firstName ? `Hello ${firstName},` : '',
            message: 'You have been invited to join Engel Fine Design. Click the button below to finish creating your account.',
            actionUrl: inviteLink,
            actionLabel: 'Complete Your Signup',
            footnote: 'If you were not expecting this invitation, you can safely ignore this email.',
        })
    };

    try {
        const info = await getTransporter().sendMail(mailOptions);
        console.log('Invite email sent:', info.response);
    } catch (error) {
        console.error('Error sending invite email:', error);
        throw new Error('Failed to send invite email');
    }
}
