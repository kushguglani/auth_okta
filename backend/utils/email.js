const nodemailer = require('nodemailer');

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EMAIL UTILITY
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Handles all email sending for the application
 *
 * Features:
 * - Verification emails
 * - Password reset emails
 * - Password change confirmation
 * - HTML + text templates
 * - Configurable SMTP
 *
 * @file backend/utils/email.js
 * @requires nodemailer
 */

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EMAIL TRANSPORTER CONFIGURATION
 * ═══════════════════════════════════════════════════════════════════════════
 */

const createTransporter = () => {
  /**
   * Development: Gmail
   * ────────────────────────────────────────────────────────────────────────
   * Steps to setup:
   * 1. Enable 2FA on Gmail
   * 2. Generate App Password: https://myaccount.google.com/apppasswords
   * 3. Use app password (NOT your Gmail password)
   * 4. Add to .env: SMTP_USER=your-email@gmail.com SMTP_PASSWORD=app-password
   */

  if (process.env.NODE_ENV === 'development' || !process.env.SMTP_HOST) {
    return nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    });
  }

  /**
   * Production: Custom SMTP (SendGrid, Mailgun, AWS SES)
   * ────────────────────────────────────────────────────────────────────────
   */
  return nodemailer.createTransporter({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD
    }
  });
};

const transporter = createTransporter();

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SEND VERIFICATION EMAIL
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Sends email with verification link
 *
 * @param {Object} user - User object { name, email }
 * @param {String} token - Verification JWT token
 * @returns {Promise<Boolean>} - Success status
 */

const sendVerificationEmail = async (user, token) => {
  const verificationUrl = `${process.env.FRONTEND_URL}/verify/${token}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 30px;
          text-align: center;
          border-radius: 8px 8px 0 0;
        }
        .content {
          background: #f9f9f9;
          padding: 40px;
          border: 1px solid #ddd;
        }
        .button {
          display: inline-block;
          padding: 15px 30px;
          background: #667eea;
          color: white !important;
          text-decoration: none;
          border-radius: 5px;
          font-weight: bold;
          margin: 20px 0;
        }
        .footer {
          text-align: center;
          padding: 20px;
          font-size: 12px;
          color: #666;
          border-top: 1px solid #ddd;
        }
        .warning {
          background: #fff3cd;
          border-left: 4px solid #ffc107;
          padding: 15px;
          margin: 20px 0;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Welcome to ${process.env.APP_NAME || 'Our App'}!</h1>
      </div>

      <div class="content">
        <h2>Hi ${user.name},</h2>

        <p>Thanks for signing up! We're excited to have you on board.</p>

        <p>To get started, please verify your email address by clicking the button below:</p>

        <center>
          <a href="${verificationUrl}" class="button">
            Verify Email Address
          </a>
        </center>

        <p style="color: #666; font-size: 14px;">
          Or copy and paste this link into your browser:<br>
          <a href="${verificationUrl}">${verificationUrl}</a>
        </p>

        <div class="warning">
          <strong>⏰ This link expires in 24 hours</strong><br>
          If you didn't create an account, please ignore this email.
        </div>

        <p>
          Need help? Reply to this email or contact our support team.
        </p>

        <p>
          Best regards,<br>
          <strong>The ${process.env.APP_NAME || 'Our'} Team</strong>
        </p>
      </div>

      <div class="footer">
        <p>
          You received this email because you signed up for ${process.env.APP_NAME || 'our service'}.<br>
          If you didn't sign up, you can safely ignore this email.
        </p>
        <p>
          &copy; ${new Date().getFullYear()} ${process.env.APP_NAME || 'Our App'}. All rights reserved.
        </p>
      </div>
    </body>
    </html>
  `;

  const textContent = `
Hi ${user.name},

Thanks for signing up for ${process.env.APP_NAME || 'our app'}!

To verify your email address, please visit this link:
${verificationUrl}

This link expires in 24 hours.

If you didn't create an account, please ignore this email.

Best regards,
The ${process.env.APP_NAME || 'Our'} Team
  `;

  try {
    await transporter.sendMail({
      from: `"${process.env.APP_NAME || 'Our App'}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to: user.email,
      subject: `Verify your email address - ${process.env.APP_NAME || 'Our App'}`,
      text: textContent,
      html: htmlContent
    });

    console.log(`📧 Verification email sent to ${user.email}`);
    return true;

  } catch (error) {
    console.error('❌ Email sending failed:', error);
    throw new Error('Failed to send verification email. Please try again later.');
  }
};

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SEND PASSWORD RESET EMAIL
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Sends email with password reset link
 *
 * @param {Object} user - User object { name, email }
 * @param {String} token - Reset JWT token
 * @returns {Promise<Boolean>} - Success status
 */

const sendPasswordResetEmail = async (user, token) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 30px;
          text-align: center;
          border-radius: 8px 8px 0 0;
        }
        .content {
          background: #f9f9f9;
          padding: 40px;
          border: 1px solid #ddd;
        }
        .button {
          display: inline-block;
          padding: 15px 30px;
          background: #667eea;
          color: white !important;
          text-decoration: none;
          border-radius: 5px;
          font-weight: bold;
          margin: 20px 0;
        }
        .alert {
          background: #ffe6e6;
          border-left: 4px solid #ff4444;
          padding: 15px;
          margin: 20px 0;
        }
        .info {
          background: #e6f3ff;
          border-left: 4px solid #4a90e2;
          padding: 15px;
          margin: 20px 0;
        }
        .footer {
          text-align: center;
          padding: 20px;
          font-size: 12px;
          color: #666;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🔐 Password Reset Request</h1>
      </div>

      <div class="content">
        <h2>Hi ${user.name},</h2>

        <p>We received a request to reset your password for your ${process.env.APP_NAME || 'account'}.</p>

        <p>Click the button below to reset your password:</p>

        <center>
          <a href="${resetUrl}" class="button">
            Reset My Password
          </a>
        </center>

        <p style="color: #666; font-size: 14px;">
          Or copy and paste this link into your browser:<br>
          <a href="${resetUrl}">${resetUrl}</a>
        </p>

        <div class="info">
          <strong>⏰ This link expires in 1 hour</strong><br>
          For your security, password reset links are only valid for a short time.
        </div>

        <div class="alert">
          <strong>⚠️ Didn't request a password reset?</strong><br>
          If you didn't make this request, please ignore this email. Your password will remain unchanged.
          You may want to change your password if you're concerned about account security.
        </div>

        <p>
          <strong>Security Tips:</strong><br>
          • Use a strong, unique password<br>
          • Don't share your password with anyone<br>
          • Enable two-factor authentication (coming soon!)
        </p>

        <p>
          Need help? Reply to this email or contact our support team.
        </p>

        <p>
          Best regards,<br>
          <strong>The ${process.env.APP_NAME || 'Our'} Team</strong>
        </p>
      </div>

      <div class="footer">
        <p>
          You received this email because someone requested a password reset for this email address.<br>
          If it wasn't you, please secure your account immediately.
        </p>
        <p>
          &copy; ${new Date().getFullYear()} ${process.env.APP_NAME || 'Our App'}. All rights reserved.
        </p>
      </div>
    </body>
    </html>
  `;

  const textContent = `
Hi ${user.name},

We received a request to reset your password.

To reset your password, please visit this link:
${resetUrl}

⏰ This link expires in 1 hour.

⚠️ If you didn't request a password reset, please ignore this email.
Your password will remain unchanged.

Best regards,
The ${process.env.APP_NAME || 'Our'} Team
  `;

  try {
    await transporter.sendMail({
      from: `"${process.env.APP_NAME || 'Our App'}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to: user.email,
      subject: `Reset your password - ${process.env.APP_NAME || 'Our App'}`,
      text: textContent,
      html: htmlContent
    });

    console.log(`📧 Password reset email sent to ${user.email}`);
    return true;

  } catch (error) {
    console.error('❌ Email sending failed:', error);
    throw new Error('Failed to send reset email. Please try again later.');
  }
};

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SEND PASSWORD CHANGE CONFIRMATION
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Sends confirmation email after password change
 *
 * @param {Object} user - User object { name, email }
 * @returns {Promise<Boolean>} - Success status
 */

const sendPasswordChangedEmail = async (user) => {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #f0f0f0; padding: 30px; border-radius: 8px;">
        <h1 style="color: #667eea;">✅ Password Changed Successfully</h1>

        <p>Hi ${user.name},</p>

        <p>This confirms that your password was changed on <strong>${new Date().toLocaleString()}</strong>.</p>

        <div style="background: #e6f3ff; border-left: 4px solid #4a90e2; padding: 15px; margin: 20px 0;">
          <strong>📱 Security Notice:</strong><br>
          You've been logged out of all devices for your security.
          Please login again with your new password.
        </div>

        <div style="background: #ffe6e6; border-left: 4px solid #ff4444; padding: 15px; margin: 20px 0;">
          <strong>⚠️ Didn't change your password?</strong><br>
          If you didn't make this change, your account may be compromised.
          Please contact support immediately: ${process.env.SMTP_FROM || 'support@yourapp.com'}
        </div>

        <p>
          For your security, we recommend:<br>
          • Use a unique password for each account<br>
          • Enable two-factor authentication<br>
          • Never share your password
        </p>

        <p>
          Best regards,<br>
          The ${process.env.APP_NAME || 'Our'} Team
        </p>
      </div>
    </body>
    </html>
  `;

  const textContent = `
Hi ${user.name},

This confirms that your password was changed on ${new Date().toLocaleString()}.

📱 You've been logged out of all devices for your security.
Please login again with your new password.

⚠️ If you didn't make this change, please contact support immediately.

Best regards,
The ${process.env.APP_NAME || 'Our'} Team
  `;

  try {
    await transporter.sendMail({
      from: `"${process.env.APP_NAME}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to: user.email,
      subject: `Your password was changed - ${process.env.APP_NAME}`,
      text: textContent,
      html: htmlContent
    });

    console.log(`📧 Password changed confirmation sent to ${user.email}`);
    return true;

  } catch (error) {
    console.error('❌ Email sending failed:', error);
    // Don't throw - password was already changed
    return false;
  }
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail
};

