#!/usr/bin/env node

/**
 * Email Configuration Test Script
 * 
 * Tests Nodemailer connection and sends a test email
 * Usage: node scripts/test-email.js
 */

import nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

async function testEmail() {
  console.log('🧪 Testing Email Configuration...\n');

  // Check environment variables
  console.log('📋 Checking environment variables:');
  console.log(`   GMAIL_USER: ${process.env.GMAIL_USER || '❌ MISSING'}`);
  console.log(`   GMAIL_APP_PASSWORD: ${process.env.GMAIL_APP_PASSWORD ? '✅ SET' : '❌ MISSING'}`);
  console.log(`   NEXT_PUBLIC_APP_URL: ${process.env.NEXT_PUBLIC_APP_URL || '❌ MISSING'}\n`);

  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.error('❌ Missing required environment variables!');
    console.error('   Add GMAIL_USER and GMAIL_APP_PASSWORD to .env.local');
    process.exit(1);
  }

  // Create transporter
  console.log('🔌 Creating Nodemailer transporter...');
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  // Test connection
  console.log('🌐 Testing SMTP connection...');
  try {
    const verified = await transporter.verify();
    if (verified) {
      console.log('✅ SMTP connection verified!\n');
    }
  } catch (error) {
    console.error('❌ SMTP connection failed:', error.message);
    process.exit(1);
  }

  // Send test email
  console.log('📧 Sending test email...\n');
  try {
    const testEmail = process.env.GMAIL_USER; // Send to self
    
    const mailOptions = {
      from: `"Engel Fine Design" <${process.env.GMAIL_USER}>`,
      to: testEmail,
      subject: '✅ Test Email - Engel Fine Design Admin Notification System',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Georgia, serif; }
              .container { max-width: 600px; margin: 0 auto; }
              .header { background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: white; padding: 30px; text-align: center; }
              .content { padding: 30px; background: #f9f5ff; }
              .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>✅ Email System Working!</h1>
              </div>
              <div class="content">
                <p>Great news! Your Nodemailer configuration is working correctly.</p>
                <p><strong>Sender:</strong> ${process.env.GMAIL_USER}</p>
                <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
                <p>Your admin notification system is ready to send emails for:</p>
                <ul>
                  <li>Custom ticket notifications</li>
                  <li>Artisan assignment notifications</li>
                  <li>Message notifications</li>
                  <li>System alerts</li>
                </ul>
              </div>
              <div class="footer">
                <p>Engel Fine Design Admin Notification System</p>
              </div>
            </div>
          </body>
        </html>
      `,
    };

    const result = await transporter.sendMail(mailOptions);
    
    console.log('✅ Email sent successfully!');
    console.log(`   Message ID: ${result.messageId}`);
    console.log(`   To: ${testEmail}\n`);
    console.log('📬 Check your email inbox (and spam folder) for the test message!\n');
    console.log('🎉 Your admin notification system is ready to go!');

  } catch (error) {
    console.error('❌ Failed to send email:', error.message);
    if (error.response) {
      console.error('   Response:', error.response);
    }
    process.exit(1);
  }

  process.exit(0);
}

testEmail().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
