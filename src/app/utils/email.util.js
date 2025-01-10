// src/app/api/auth/email.util.js
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    service: 'gmail', // Change this if using a different service (e.g., SendGrid, Outlook)
    auth: {
        user: process.env.EMAIL_USER, // Your email address from environment variables
        pass: process.env.EMAIL_PASS  // Your email app password from environment variables
    }
});

/**
 * ✅ Send a verification email to the user
 * @param {string} email - The user's email address
 * @param {string} token - The verification token
 */
export async function sendVerificationEmail(email, token) {
    const verificationLink = `${process.env.APP_URL}/verify-email?token=${token}`;

    const mailOptions = {
        from: `"Your App Name" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Verify Your Email Address',
        html: `
            <h2>Welcome to Our App!</h2>
            <p>Thank you for signing up. Please verify your email address by clicking the link below:</p>
            <a href="${verificationLink}" target="_blank">Verify Email</a>
            <p>If you did not sign up, you can safely ignore this message.</p>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
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
    const resetLink = `${process.env.APP_URL}/reset-password?token=${token}`;

    const mailOptions = {
        from: `"Your App Name" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Password Reset Request',
        html: `
            <h2>Password Reset Request</h2>
            <p>Click the link below to reset your password:</p>
            <a href="${resetLink}" target="_blank">Reset Password</a>
            <p>If you did not request a password reset, please ignore this message.</p>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
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
    const inviteLink = `${process.env.APP_URL}/complete-signup?token=${token}`;

    const mailOptions = {
        from: `"Your App Name" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'You’ve Been Invited to Join Our Platform!',
        html: `
            <h2>Hello ${firstName}!</h2>
            <p>You have been invited to join our platform. Click the link below to finish creating your account:</p>
            <a href="${inviteLink}" target="_blank">Complete Your Signup</a>
            <p>If you were not expecting this invitation, you can safely ignore this email.</p>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Invite email sent:', info.response);
    } catch (error) {
        console.error('Error sending invite email:', error);
        throw new Error('Failed to send invite email');
    }
}
