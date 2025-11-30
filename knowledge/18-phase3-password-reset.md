# 🔑 Phase 3.2: Password Reset - Complete Implementation

> **Secure Password Reset System**
> Forgot password flow with email verification and security best practices

**Last Updated:** Nov 29, 2025

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Why Password Reset?](#why-password-reset)
3. [Architecture & Flow](#architecture--flow)
4. [Implementation Step-by-Step](#implementation-step-by-step)
5. [Security Considerations](#security-considerations)
6. [Attack Vectors & Prevention](#attack-vectors--prevention)
7. [Interview Questions](#interview-questions)

---

## 🎯 Overview

Password reset allows users to securely recover their account when they forget their password. This is a critical feature for user experience and security.

**What We're Building:**
- Forgot password request (email entry)
- Email with reset link (1-hour expiry)
- Reset password page (new password form)
- Invalidate old sessions after reset

**User Experience:**
```
User forgets password
    ↓
Clicks "Forgot Password"
    ↓
Enters email → Receives reset link
    ↓
Clicks link → Sets new password
    ↓
Can login with new password ✅
```

---

## 🤔 Why Password Reset?

### **The Problem**

```
User: "I forgot my password"

Bad Solutions:
❌ Send password in email (passwords should NEVER be in plain text)
❌ "Contact support" (slow, poor UX)
❌ Create new account (loses data, duplicate accounts)
❌ Security questions (easily guessable, outdated)

Good Solution:
✅ Email with secure reset link
✅ User proves email ownership
✅ User sets NEW password
✅ All existing sessions invalidated
```

### **Real-World Example**

**Google's Password Reset:**
1. Click "Forgot password"
2. Enter email
3. Receive email: "Reset your password"
4. Click link → Set new password
5. All devices logged out (security)
6. Login with new password

**This is what we're implementing!**

---

## 🏗️ Architecture & Flow

### **Complete Flow Diagram**

```
┌─────────────────────────────────────────────────────────────┐
│                  FORGOT PASSWORD FLOW                        │
└─────────────────────────────────────────────────────────────┘

Frontend: User clicks "Forgot Password"
    ↓
Show email input form
    ↓
POST /api/auth/forgot-password
{
  email: "john@example.com"
}
    ↓
Backend: Validate email
    ↓
Check if user exists
    ↓
┌──────────────────────────────────────────────┐
│ Security Check                                │
│ - User exists? ✅                             │
│ - Email verified? ✅                          │
│ - Rate limit (3 per hour)? ✅                 │
│ - Recent reset request? Check timestamp       │
└──────────────────────────────────────────────┘
    ↓
Generate Reset Token (JWT)
    ↓
┌──────────────────────────────────────────────┐
│ JWT Token Structure                           │
│ {                                             │
│   userId: "674a1b2c...",                      │
│   email: "john@example.com",                  │
│   type: "password_reset",                     │
│   iat: 1732880400,                            │
│   exp: 1732884000  ← 1 hour only!             │
│ }                                             │
└──────────────────────────────────────────────┘
    ↓
Store token in database
    ↓
┌──────────────────────────────────────────────┐
│ User Model Update                             │
│ {                                             │
│   passwordResetToken: "JWT",                  │
│   passwordResetExpires: Date + 1 hour,        │
│   passwordResetAttempts: increment,           │
│   lastPasswordResetRequest: now               │
│ }                                             │
└──────────────────────────────────────────────┘
    ↓
Send Email
    ↓
┌──────────────────────────────────────────────┐
│ Email Content                                 │
│ Subject: Reset your password                  │
│                                               │
│ Hi John,                                      │
│                                               │
│ Click to reset your password:                 │
│ https://yourapp.com/reset-password/JWT       │
│                                               │
│ ⚠️ This link expires in 1 hour                │
│                                               │
│ If you didn't request this, ignore it.        │
└──────────────────────────────────────────────┘
    ↓
User receives email
    ↓
User clicks reset link
    ↓
GET /api/auth/reset-password/:token
    ↓
Backend: Verify token (same as email verification)
    ↓
Frontend: Show "Set New Password" form
    ↓
POST /api/auth/reset-password/:token
{
  password: "NewSecurePass456"
}
    ↓
Backend: Validate new password
    ↓
┌──────────────────────────────────────────────┐
│ Password Reset Actions                        │
│ 1. Hash new password (bcrypt)                │
│ 2. Update user.password                       │
│ 3. Clear reset token                          │
│ 4. Update lastPasswordChange                  │
│ 5. Invalidate all sessions (logout all)      │
│ 6. Send confirmation email                    │
└──────────────────────────────────────────────┘
    ↓
Response:
{
  "success": true,
  "message": "Password reset successfully! Please login."
}
    ↓
Frontend: Redirect to login
    ↓
User logs in with new password ✅
```

---

## 🛠️ Implementation Step-by-Step

### **Step 1: Add Reset Fields to User Model**

**File:** `backend/models/User.js`

```javascript
const userSchema = new mongoose.Schema({
  // ... existing fields ...
  
  // ═══════════════════════════════════════════════════════════
  // PASSWORD RESET
  // ═══════════════════════════════════════════════════════════
  
  passwordResetToken: {
    type: String,
    select: false
    /**
     * Why select: false?
     * ────────────────────────────────────────────────────────
     * - Security: Don't expose token in queries
     * - Only fetch when specifically needed
     * - Same pattern as password field
     */
  },
  
  passwordResetExpires: {
    type: Date,
    select: false
    /**
     * Short expiration (1 hour)
     * ────────────────────────────────────────────────────────
     * Why 1 hour vs 24 hours (verification)?
     * 
     * Password reset is MORE sensitive:
     * - Grants access to existing account (with data)
     * - Email verification only confirms ownership
     * 
     * Shorter window = more secure
     */
  },
  
  passwordResetAttempts: {
    type: Number,
    default: 0
    /**
     * Track reset requests
     * ────────────────────────────────────────────────────────
     * Rate limit: Max 3 per hour
     * 
     * Prevents:
     * - Email bombing (spam user's inbox)
     * - DoS attack (overwhelm email server)
     * - Account enumeration (checking if email exists)
     */
  },
  
  lastPasswordResetRequest: {
    type: Date
    /**
     * Timestamp of last reset request
     * Used for rate limiting calculation
     */
  },
  
  lastPasswordChange: {
    type: Date
    /**
     * Why track password changes?
     * ────────────────────────────────────────────────────────
     * 1. Security audit trail
     * 2. Force password change policies (e.g., every 90 days)
     * 3. Invalidate sessions created before password change
     * 4. Detect compromised accounts (frequent changes)
     */
  }
});

// ─────────────────────────────────────────────────────────
// METHOD: Generate Password Reset Token
// ─────────────────────────────────────────────────────────

userSchema.methods.generatePasswordResetToken = function() {
  const jwt = require('jsonwebtoken');
  const crypto = require('crypto');
  
  /**
   * Two-Token Approach (Extra Security)
   * ────────────────────────────────────────────────────────
   * Token 1 (JWT): Sent in email, expires in 1 hour
   * Token 2 (Hash): Stored in database, compared on reset
   * 
   * Why?
   * - Even if database leaked, attackers can't use hashed token
   * - JWT ensures expiration
   * - Hash ensures one-time use
   */
  
  // Generate random string (for extra security)
  const randomString = crypto.randomBytes(32).toString('hex');
  
  // Create JWT token
  const token = jwt.sign(
    {
      userId: this._id,
      email: this.email,
      type: 'password_reset',
      random: randomString  // Prevents token prediction
    },
    process.env.JWT_RESET_SECRET,  // Different secret!
    { expiresIn: '1h' }
  );
  
  // Store hashed version in database
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
  
  this.passwordResetToken = hashedToken;
  this.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1 hour
  this.passwordResetAttempts += 1;
  this.lastPasswordResetRequest = Date.now();
  
  return token;  // Send this in email
};

// ─────────────────────────────────────────────────────────
// METHOD: Verify Password Reset Token
// ─────────────────────────────────────────────────────────

userSchema.methods.verifyPasswordResetToken = async function(token) {
  const crypto = require('crypto');
  
  // Hash incoming token
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
  
  // Compare with stored hash
  if (this.passwordResetToken !== hashedToken) {
    throw new Error('Invalid reset token');
  }
  
  // Check expiration
  if (this.passwordResetExpires < Date.now()) {
    throw new Error('Reset token expired');
  }
  
  return true;
};

// ─────────────────────────────────────────────────────────
// METHOD: Reset Password
// ─────────────────────────────────────────────────────────

userSchema.methods.resetPassword = async function(newPassword) {
  const { getRedisClient } = require('../config/redis');
  
  /**
   * Password Reset Actions
   * ────────────────────────────────────────────────────────
   * 1. Update password
   * 2. Clear reset token
   * 3. Update lastPasswordChange
   * 4. Reset login attempts
   * 5. Invalidate all refresh tokens (logout everywhere)
   */
  
  // 1. Update password (will be hashed by pre-save hook)
  this.password = newPassword;
  
  // 2. Clear reset fields
  this.passwordResetToken = undefined;
  this.passwordResetExpires = undefined;
  
  // 3. Update metadata
  this.lastPasswordChange = Date.now();
  
  // 4. Reset login attempts (fresh start)
  this.loginAttempts = 0;
  this.lockUntil = undefined;
  
  await this.save();
  
  // 5. Invalidate all refresh tokens (security)
  try {
    const redis = getRedisClient();
    // Delete all refresh tokens for this user
    await redis.del(`refresh_token:${this._id}`);
    
    /**
     * Why invalidate all sessions?
     * ────────────────────────────────────────────────────
     * Scenario: Your password was compromised
     * - Attacker might be logged in on their device
     * - Changing password should kick them out
     * - User regains control of account
     * 
     * Trade-off:
     * - User logged out on all devices (phone, tablet, etc.)
     * - But security > convenience
     */
  } catch (error) {
    console.error('Error invalidating tokens:', error);
    // Continue even if Redis fails
  }
};
```

---

### **Step 2: Create Password Reset Email Template**

**File:** `backend/utils/email.js` (add to existing file)

```javascript
/**
 * ═══════════════════════════════════════════════════════════
 * SEND PASSWORD RESET EMAIL
 * ═══════════════════════════════════════════════════════════
 */

const sendPasswordResetEmail = async (user, token) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`;
  
  /**
   * Email Template Design Principles
   * ────────────────────────────────────────────────────────
   * 1. URGENCY: Short expiration (1 hour)
   * 2. CLARITY: Big reset button, clear instructions
   * 3. SECURITY: Warning if user didn't request
   * 4. ACCESSIBILITY: Plain text link as backup
   */
  
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
 * ═══════════════════════════════════════════════════════════
 * SEND PASSWORD CHANGE CONFIRMATION EMAIL
 * ═══════════════════════════════════════════════════════════
 */

const sendPasswordChangedEmail = async (user) => {
  /**
   * Why send confirmation email?
   * ────────────────────────────────────────────────────────
   * - Notify user of security change
   * - Alert if unauthorized password change
   * - Provide support contact
   * - Industry best practice (Google, Facebook, etc.)
   */
  
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
          Please contact support immediately: support@yourapp.com
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
  
  await transporter.sendMail({
    from: `"${process.env.APP_NAME}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to: user.email,
    subject: `Your password was changed - ${process.env.APP_NAME}`,
    html: htmlContent
  });
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail
};
```

---

### **Step 3: Create Reset Endpoints**

**File:** `backend/routes/auth.js` (add to existing)

```javascript
const { sendPasswordResetEmail, sendPasswordChangedEmail } = require('../utils/email');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

/**
 * ═══════════════════════════════════════════════════════════
 * POST /api/auth/forgot-password
 * ═══════════════════════════════════════════════════════════
 * Request password reset email
 */

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    // ─────────────────────────────────────────────────────────
    // 1. Validate Input
    // ─────────────────────────────────────────────────────────
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your email address'
      });
    }
    
    // ─────────────────────────────────────────────────────────
    // 2. Find User
    // ─────────────────────────────────────────────────────────
    const user = await User.findOne({ email }).select('+passwordResetAttempts +lastPasswordResetRequest');
    
    /**
     * Security: Always return success (prevent email enumeration)
     * ────────────────────────────────────────────────────────
     * Bad: "Email not found" → Attacker knows email doesn't exist
     * Good: "If email exists, reset link sent" → No information leaked
     */
    if (!user) {
      return res.json({
        success: true,
        message: 'If that email exists, a password reset link has been sent.'
      });
    }
    
    // ─────────────────────────────────────────────────────────
    // 3. Check if Email Verified
    // ─────────────────────────────────────────────────────────
    if (!user.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'Please verify your email first before resetting password'
      });
    }
    
    // ─────────────────────────────────────────────────────────
    // 4. Rate Limiting Check
    // ─────────────────────────────────────────────────────────
    const maxAttempts = 3;
    const oneHour = 60 * 60 * 1000;
    
    if (user.lastPasswordResetRequest) {
      const timeSinceLastRequest = Date.now() - user.lastPasswordResetRequest.getTime();
      
      if (timeSinceLastRequest < oneHour && user.passwordResetAttempts >= maxAttempts) {
        const minutesLeft = Math.ceil((oneHour - timeSinceLastRequest) / (60 * 1000));
        return res.status(429).json({
          success: false,
          message: `Too many reset requests. Please try again in ${minutesLeft} minutes.`
        });
      }
      
      // Reset counter if more than 1 hour passed
      if (timeSinceLastRequest >= oneHour) {
        user.passwordResetAttempts = 0;
      }
    }
    
    // ─────────────────────────────────────────────────────────
    // 5. Generate Reset Token
    // ─────────────────────────────────────────────────────────
    const resetToken = user.generatePasswordResetToken();
    await user.save();
    
    // ─────────────────────────────────────────────────────────
    // 6. Send Email
    // ─────────────────────────────────────────────────────────
    try {
      await sendPasswordResetEmail(user, resetToken);
    } catch (emailError) {
      console.error('Email error:', emailError);
      return res.status(500).json({
        success: false,
        message: 'Failed to send reset email. Please try again later.'
      });
    }
    
    // ─────────────────────────────────────────────────────────
    // 7. Return Success
    // ─────────────────────────────────────────────────────────
    res.json({
      success: true,
      message: 'Password reset link sent to your email. Check your inbox!'
    });
    
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again.'
    });
  }
});

/**
 * ═══════════════════════════════════════════════════════════
 * GET /api/auth/reset-password/:token
 * ═══════════════════════════════════════════════════════════
 * Verify reset token (before showing reset form)
 */

router.get('/reset-password/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_RESET_SECRET);
    
    if (decoded.type !== 'password_reset') {
      return res.status(400).json({
        success: false,
        message: 'Invalid reset token'
      });
    }
    
    // Find user
    const user = await User.findById(decoded.userId).select('+passwordResetToken +passwordResetExpires');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Verify token matches database
    await user.verifyPasswordResetToken(token);
    
    res.json({
      success: true,
      message: 'Token valid. You can reset your password.',
      email: user.email  // Show on frontend for user confirmation
    });
    
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(400).json({
        success: false,
        message: 'Reset link expired. Please request a new one.'
      });
    }
    
    res.status(400).json({
      success: false,
      message: error.message || 'Invalid or expired reset link'
    });
  }
});

/**
 * ═══════════════════════════════════════════════════════════
 * POST /api/auth/reset-password/:token
 * ═══════════════════════════════════════════════════════════
 * Reset password with new password
 */

router.post('/reset-password/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    
    // ─────────────────────────────────────────────────────────
    // 1. Validate New Password
    // ─────────────────────────────────────────────────────────
    if (!password || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters'
      });
    }
    
    // ─────────────────────────────────────────────────────────
    // 2. Verify Token
    // ─────────────────────────────────────────────────────────
    const decoded = jwt.verify(token, process.env.JWT_RESET_SECRET);
    
    if (decoded.type !== 'password_reset') {
      return res.status(400).json({
        success: false,
        message: 'Invalid reset token'
      });
    }
    
    // ─────────────────────────────────────────────────────────
    // 3. Find User
    // ─────────────────────────────────────────────────────────
    const user = await User.findById(decoded.userId)
      .select('+password +passwordResetToken +passwordResetExpires');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // ─────────────────────────────────────────────────────────
    // 4. Verify Token Matches Database
    // ─────────────────────────────────────────────────────────
    await user.verifyPasswordResetToken(token);
    
    // ─────────────────────────────────────────────────────────
    // 5. Check: New Password != Old Password
    // ─────────────────────────────────────────────────────────
    const isSamePassword = await user.comparePassword(password);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: 'New password must be different from old password'
      });
    }
    
    // ─────────────────────────────────────────────────────────
    // 6. Reset Password
    // ─────────────────────────────────────────────────────────
    await user.resetPassword(password);
    
    // ─────────────────────────────────────────────────────────
    // 7. Send Confirmation Email
    // ─────────────────────────────────────────────────────────
    try {
      await sendPasswordChangedEmail(user);
    } catch (emailError) {
      console.error('Confirmation email error:', emailError);
      // Don't fail if confirmation email fails
    }
    
    // ─────────────────────────────────────────────────────────
    // 8. Return Success
    // ─────────────────────────────────────────────────────────
    res.json({
      success: true,
      message: 'Password reset successfully! You can now login with your new password.'
    });
    
  } catch (error) {
    console.error('Reset password error:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(400).json({
        success: false,
        message: 'Reset link expired. Please request a new one.'
      });
    }
    
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to reset password'
    });
  }
});

module.exports = router;
```

---

## 🔐 Security Considerations

### **1. Token Security**

**✅ Best Practices:**

```javascript
// Different secret for reset tokens
JWT_RESET_SECRET !== JWT_ACCESS_SECRET

// Short expiration (1 hour)
{ expiresIn: '1h' }

// Add random component (prevent prediction)
const randomString = crypto.randomBytes(32).toString('hex');

// Hash token before storing
const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
```

**Why Different Secrets?**
```
If attacker gets JWT_ACCESS_SECRET:
- ❌ Can create fake access tokens
- ✅ CANNOT create reset tokens (different secret)

If attacker gets JWT_RESET_SECRET:
- ❌ Can create reset tokens
- ✅ CANNOT create access tokens

Separation = defense in depth
```

---

### **2. Rate Limiting**

**Why Needed:**

```javascript
// Attack: Email bombing
for (let i = 0; i < 1000; i++) {
  POST /api/auth/forgot-password
  { email: "victim@example.com" }
}
// Result: Victim gets 1000 emails! ❌

// Protection:
if (attempts >= 3 && timeSinceLastRequest < 1hour) {
  throw new Error('Too many requests');
}
```

**Implementation:**
```javascript
// Check attempts
if (user.passwordResetAttempts >= 3) {
  const timeSinceLastRequest = Date.now() - user.lastPasswordResetRequest;
  if (timeSinceLastRequest < 60 * 60 * 1000) {
    return res.status(429).json({
      message: 'Too many requests. Try again in 1 hour.'
    });
  }
}

// Reset counter after 1 hour
if (timeSinceLastRequest >= 60 * 60 * 1000) {
  user.passwordResetAttempts = 0;
}
```

---

### **3. Email Enumeration Prevention**

**Bad Approach (Leaks Information):**
```javascript
// ❌ Attacker can check if email exists
if (!user) {
  return res.status(404).json({
    message: 'Email not found'  // ❌ Information leak!
  });
}

return res.json({
  message: 'Reset email sent'
});
```

**Good Approach (No Information Leak):**
```javascript
// ✅ Same response whether email exists or not
if (!user) {
  return res.json({
    success: true,
    message: 'If that email exists, a reset link has been sent.'
  });
}

// Send email silently
await sendPasswordResetEmail(user, token);

return res.json({
  success: true,
  message: 'If that email exists, a reset link has been sent.'
});
```

**Why?**
- Prevents attackers from checking if emails are registered
- Privacy protection
- Industry standard (Gmail, Facebook do this)

---

## ⚔️ Attack Vectors & Prevention

### **Attack 1: Token Reuse**

**Attack:**
```
1. User requests reset → Gets token
2. User resets password with token
3. Attacker tries to reuse same token
```

**Prevention:**
```javascript
// Clear token after use
user.passwordResetToken = undefined;
user.passwordResetExpires = undefined;
await user.save();

// Or check 'used' flag
if (user.resetTokenUsed) {
  throw new Error('Token already used');
}
```

---

### **Attack 2: Token Prediction**

**Attack:**
```javascript
// Predictable tokens
const token = userId + timestamp;  // ❌ Attacker can guess!
```

**Prevention:**
```javascript
// Use cryptographically secure random
const crypto = require('crypto');
const randomString = crypto.randomBytes(32).toString('hex');

// Include in JWT
const token = jwt.sign({
  userId,
  random: randomString  // ✅ Unpredictable!
}, SECRET);
```

---

### **Attack 3: Email Bombing**

**Attack:**
```
// Attacker spams forgot-password with victim's email
for (let i = 0; i < 1000; i++) {
  POST /forgot-password { email: "victim@example.com" }
}
// Victim's inbox flooded! ❌
```

**Prevention:**
```javascript
// Rate limiting (already shown above)
// Max 3 requests per hour per email
if (attempts >= 3 && timeSinceLastRequest < 1hour) {
  return res.status(429).json({
    message: 'Too many requests'
  });
}
```

---

### **Attack 4: Timing Attacks**

**Attack:**
```javascript
// Measure response time to check if email exists
const start = Date.now();
await POST /forgot-password { email: "test@example.com" }
const duration = Date.now() - start;

// If email exists: 200ms (database lookup + email send)
// If email doesn't exist: 50ms (quick response)
// ❌ Attacker can enumerate emails!
```

**Prevention:**
```javascript
// Constant-time response
if (!user) {
  // Simulate same processing time
  await new Promise(resolve => setTimeout(resolve, 200));
  return res.json({ message: 'Email sent' });
}

// Or always send response after fixed delay
await sendEmail(user);
await new Promise(resolve => setTimeout(resolve, 1000));
return res.json({ message: 'Email sent' });
```

---

## 🎓 Interview Questions

### **Q1: Walk me through your password reset implementation**

**Answer:**
> "When a user forgets their password, they enter their email on the forgot password page. The backend checks if the email exists and is verified, then generates a JWT token with 1-hour expiration and a random component for security. The token is hashed and stored in the database, then sent via email. When the user clicks the link, the backend verifies the token hasn't expired and matches the database hash. Once verified, the user sets a new password. The new password is hashed with bcrypt, all existing sessions are invalidated for security, and a confirmation email is sent. Finally, the user can login with the new password."

---

### **Q2: Why use JWT for reset tokens instead of random strings?**

**Answer:**
> "JWT tokens provide built-in expiration handling and signature verification without database lookups. They're stateless - I can verify the token is valid just by checking the signature. However, I also hash and store the token in the database for one-time use enforcement. This hybrid approach gives me the benefits of JWT (expiration, verification) plus database tracking (one-time use)."

---

### **Q3: How do you prevent password reset abuse?**

**Answer:**
> "I implement multiple protections:
1. **Rate Limiting:** Maximum 3 reset requests per hour per email
2. **Short Expiration:** Tokens expire in 1 hour (vs 24 hours for verification)
3. **Email Enumeration Prevention:** Same response whether email exists or not
4. **Require Email Verification:** Can't reset password on unverified accounts
5. **One-Time Use:** Tokens are cleared after successful reset
6. **Session Invalidation:** All devices logged out after password change

These prevent email bombing, brute force attacks, and account enumeration."

---

### **Q4: What's the difference between password reset and password change?**

**Answer:**
> "Password reset is for users who FORGOT their password - they prove ownership via email. Password change is for logged-in users who REMEMBER their password - they provide the current password. Reset is more critical because it grants account access without knowing the password, so it needs stronger security (email verification, shorter token expiry, rate limiting)."

**Code:**
```javascript
// Password Reset (forgot password)
POST /forgot-password { email }
→ Email with token → Set new password
→ No current password needed

// Password Change (user logged in)
POST /change-password { currentPassword, newPassword }
→ Verify current password → Update to new password
→ Must know current password
```

---

### **Q5: Why invalidate all sessions after password reset?**

**Answer:**
> "If a user is resetting their password, there's a chance their account was compromised. An attacker might already be logged in on their device. By invalidating all refresh tokens and sessions, we ensure the attacker is kicked out immediately. The legitimate user can log back in with the new password, regaining full control. Security takes priority over convenience - yes, the user loses sessions on all devices, but it's necessary to protect the account."

---

### **Q6: How would you handle password reset at scale (millions of users)?**

**Answer:**
> "For scalability:
1. **Queue Email Sending:** Use message queue (RabbitMQ, AWS SQS) instead of sending inline
2. **Distributed Rate Limiting:** Use Redis instead of database counters
3. **Email Service:** Use dedicated service (SendGrid, AWS SES) instead of SMTP
4. **Caching:** Cache user verification status in Redis
5. **Horizontal Scaling:** Multiple backend instances with load balancer
6. **Monitoring:** Track reset request rates, detect abuse patterns

This ensures password reset doesn't become a bottleneck and can handle traffic spikes."

---

**Next:** [Phase 3.3: Role-Based Access Control (RBAC)](./19-phase3-rbac.md)

