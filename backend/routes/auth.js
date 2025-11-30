const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendVerificationEmail, sendPasswordResetEmail, sendPasswordChangedEmail } = require('../utils/email');
const { 
  generateAccessToken, 
  generateRefreshToken, 
  verifyRefreshToken,
  invalidateRefreshToken,
  invalidateAllRefreshTokens,
  getActiveSessions
} = require('../utils/tokens');
const { authenticate } = require('../middleware/rbac');

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * AUTH ROUTES (REST API)
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Complete authentication endpoints for Phase 1-3
 * 
 * Endpoints:
 * - POST   /signup                    - Register new user
 * - POST   /login                     - Login user
 * - GET    /verify/:token             - Verify email (Phase 3.1)
 * - POST   /verify/resend             - Resend verification (Phase 3.1)
 * - POST   /forgot-password           - Request password reset (Phase 3.2)
 * - GET    /reset-password/:token     - Verify reset token (Phase 3.2)
 * - POST   /reset-password/:token     - Reset password (Phase 3.2)
 * - POST   /refresh                   - Refresh access token (Phase 3.4)
 * - POST   /logout                    - Logout current device (Phase 3.4)
 * - POST   /logout-all                - Logout all devices (Phase 3.4)
 * - GET    /sessions                  - Get active sessions (Phase 3.4)
 * 
 * @file backend/routes/auth.js
 */

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * POST /api/auth/signup
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Register a new user + send verification email
 * 
 * @access Public
 * @phase Phase 1 + Phase 3.1
 */

router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // ─────────────────────────────────────────────────────────
    // 1. Validate Input
    // ─────────────────────────────────────────────────────────
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields (name, email, password)'
      });
    }

    // ─────────────────────────────────────────────────────────
    // 2. Check if User Exists
    // ─────────────────────────────────────────────────────────
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // ─────────────────────────────────────────────────────────
    // 3. Create User (password hashed by pre-save hook)
    // ─────────────────────────────────────────────────────────
    const user = await User.create({ 
      name, 
      email, 
      password,
      isVerified: false // Email not verified yet (Phase 3.1)
    });

    // ─────────────────────────────────────────────────────────
    // 4. Generate Verification Token (Phase 3.1)
    // ─────────────────────────────────────────────────────────
    const verificationToken = user.generateVerificationToken();
    await user.save();

    // ─────────────────────────────────────────────────────────
    // 5. Send Verification Email (Phase 3.1)
    // ─────────────────────────────────────────────────────────
    try {
      await sendVerificationEmail(user, verificationToken);
      console.log(`✅ Verification email sent to ${email}`);
    } catch (emailError) {
      console.error('❌ Email sending failed:', emailError);
      // Don't fail signup if email fails - user can resend later
    }

    // ─────────────────────────────────────────────────────────
    // 6. Generate Tokens (Phase 3.4)
    // ─────────────────────────────────────────────────────────
    const accessToken = generateAccessToken(user);
    const refreshToken = await generateRefreshToken(user, {
      userAgent: req.headers['user-agent'],
      ip: req.ip
    });

    // ─────────────────────────────────────────────────────────
    // 7. Return Success Response
    // ─────────────────────────────────────────────────────────
    res.status(201).json({
      success: true,
      message: 'Account created! Please check your email to verify your account.',
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        roles: user.roles,
        isVerified: user.isVerified
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Signup failed: ' + error.message
    });
  }
});

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * POST /api/auth/login
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Login user with email/password
 * 
 * @access Public
 * @phase Phase 1 + Phase 3.4
 */

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // ─────────────────────────────────────────────────────────
    // 1. Validate Input
    // ─────────────────────────────────────────────────────────
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // ─────────────────────────────────────────────────────────
    // 2. Find User & Verify Credentials
    // ─────────────────────────────────────────────────────────
    /**
     * findByCredentials does:
     * - Find user by email
     * - Check account not locked
     * - Verify password
     * - Increment/reset login attempts
     * - Update last login
     */
    const user = await User.findByCredentials(email, password);

    // ─────────────────────────────────────────────────────────
    // 3. Generate Tokens (Phase 3.4)
    // ─────────────────────────────────────────────────────────
    const accessToken = generateAccessToken(user);
    const refreshToken = await generateRefreshToken(user, {
      userAgent: req.headers['user-agent'],
      ip: req.ip
    });

    // ─────────────────────────────────────────────────────────
    // 4. Return Success Response
    // ─────────────────────────────────────────────────────────
    res.status(200).json({
      success: true,
      message: 'Login successful!',
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        roles: user.roles,
        isVerified: user.isVerified
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GET /api/auth/verify/:token
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Verify user's email address
 * 
 * @access Public
 * @phase Phase 3.1
 */

router.get('/verify/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    // Verify token and update user (static method)
    const user = await User.verifyEmailToken(token);
    
    res.json({
      success: true,
      message: 'Email verified successfully! You can now login.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isVerified: user.isVerified
      }
    });
    
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * POST /api/auth/verify/resend
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Resend verification email
 * 
 * @access Public
 * @phase Phase 3.1
 */

router.post('/verify/resend', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email address'
      });
    }
    
    // ─────────────────────────────────────────────────────────
    // 1. Find User
    // ─────────────────────────────────────────────────────────
    const user = await User.findOne({ email })
      .select('+verificationTokenExpires');
    
    if (!user) {
      // Security: Don't reveal if email exists
      return res.json({
        success: true,
        message: 'If that email exists, a verification email has been sent.'
      });
    }
    
    // ─────────────────────────────────────────────────────────
    // 2. Check if Already Verified
    // ─────────────────────────────────────────────────────────
    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email already verified'
      });
    }
    
    // ─────────────────────────────────────────────────────────
    // 3. Rate Limiting (max 3 per hour)
    // ─────────────────────────────────────────────────────────
    if (user.verificationTokenExpires) {
      const timeSinceLastSent = Date.now() - (user.verificationTokenExpires.getTime() - 24 * 60 * 60 * 1000);
      const oneHour = 60 * 60 * 1000;
      
      if (timeSinceLastSent < oneHour) {
        const minutesLeft = Math.ceil((oneHour - timeSinceLastSent) / (60 * 1000));
        return res.status(429).json({
          success: false,
          message: `Please wait ${minutesLeft} minutes before requesting another email`
        });
      }
    }
    
    // ─────────────────────────────────────────────────────────
    // 4. Generate New Token
    // ─────────────────────────────────────────────────────────
    const verificationToken = user.generateVerificationToken();
    await user.save();
    
    // ─────────────────────────────────────────────────────────
    // 5. Send Email
    // ─────────────────────────────────────────────────────────
    await sendVerificationEmail(user, verificationToken);
    
    res.json({
      success: true,
      message: 'Verification email sent! Please check your inbox.'
    });
    
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * POST /api/auth/forgot-password
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Request password reset email
 * 
 * @access Public
 * @phase Phase 3.2
 */

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your email address'
      });
    }
    
    // ─────────────────────────────────────────────────────────
    // 1. Find User
    // ─────────────────────────────────────────────────────────
    const user = await User.findOne({ email })
      .select('+passwordResetAttempts +lastPasswordResetRequest');
    
    /**
     * Security: Always return success (prevent email enumeration)
     * ────────────────────────────────────────────────────────
     * Don't reveal if email exists in database
     */
    if (!user) {
      return res.json({
        success: true,
        message: 'If that email exists, a password reset link has been sent.'
      });
    }
    
    // ─────────────────────────────────────────────────────────
    // 2. Check if Email Verified
    // ─────────────────────────────────────────────────────────
    if (!user.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'Please verify your email first before resetting password'
      });
    }
    
    // ─────────────────────────────────────────────────────────
    // 3. Rate Limiting (max 3 per hour)
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
    // 4. Generate Reset Token
    // ─────────────────────────────────────────────────────────
    const resetToken = user.generatePasswordResetToken();
    await user.save();
    
    // ─────────────────────────────────────────────────────────
    // 5. Send Email
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
 * ═══════════════════════════════════════════════════════════════════════════
 * GET /api/auth/reset-password/:token
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Verify reset token (before showing reset form)
 * 
 * @access Public
 * @phase Phase 3.2
 */

router.get('/reset-password/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    // Verify JWT token
    const decoded = jwt.verify(
      token, 
      process.env.JWT_RESET_SECRET || process.env.JWT_ACCESS_SECRET
    );
    
    if (decoded.type !== 'password_reset') {
      return res.status(400).json({
        success: false,
        message: 'Invalid reset token'
      });
    }
    
    // Find user
    const user = await User.findById(decoded.userId)
      .select('+resetPasswordToken +resetPasswordExpires');
    
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
      email: user.email
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
 * ═══════════════════════════════════════════════════════════════════════════
 * POST /api/auth/reset-password/:token
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Reset password with new password
 * 
 * @access Public
 * @phase Phase 3.2
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
    const decoded = jwt.verify(
      token, 
      process.env.JWT_RESET_SECRET || process.env.JWT_ACCESS_SECRET
    );
    
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
      .select('+password +resetPasswordToken +resetPasswordExpires');
    
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
    // 6. Reset Password (+ invalidate all sessions)
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

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * POST /api/auth/refresh
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Refresh access token using refresh token
 * 
 * @access Public
 * @phase Phase 3.4
 */

router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token required'
      });
    }
    
    // ─────────────────────────────────────────────────────────
    // 1. Verify Refresh Token
    // ─────────────────────────────────────────────────────────
    const decoded = await verifyRefreshToken(refreshToken);
    
    // ─────────────────────────────────────────────────────────
    // 2. Get User
    // ─────────────────────────────────────────────────────────
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // ─────────────────────────────────────────────────────────
    // 3. Generate NEW Tokens (ROTATION)
    // ─────────────────────────────────────────────────────────
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = await generateRefreshToken(user, {
      userAgent: req.headers['user-agent'],
      ip: req.ip
    });
    
    // ─────────────────────────────────────────────────────────
    // 4. Invalidate OLD Refresh Token (Security)
    // ─────────────────────────────────────────────────────────
    /**
     * Token Rotation:
     * - Old token becomes invalid
     * - If attacker uses stolen token, legitimate user's next refresh fails
     * - Both detect theft
     */
    await invalidateRefreshToken(decoded.userId, decoded.tokenId);
    
    res.json({
      success: true,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    });
    
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(401).json({
      success: false,
      message: error.message || 'Invalid refresh token'
    });
  }
});

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * POST /api/auth/logout
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Logout from current device
 * 
 * @access Private (requires authentication)
 * @phase Phase 3.4
 */

router.post('/logout', authenticate, async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (refreshToken) {
      // Decode to get tokenId
      const decoded = jwt.decode(refreshToken);
      if (decoded && decoded.tokenId) {
        await invalidateRefreshToken(req.user._id, decoded.tokenId);
      }
    }
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
});

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * POST /api/auth/logout-all
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Logout from all devices
 * 
 * @access Private (requires authentication)
 * @phase Phase 3.4
 */

router.post('/logout-all', authenticate, async (req, res) => {
  try {
    const count = await invalidateAllRefreshTokens(req.user._id);
    
    res.json({
      success: true,
      message: `Logged out from ${count} device(s)`
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
});

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GET /api/auth/sessions
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Get all active sessions for current user
 * 
 * @access Private (requires authentication)
 * @phase Phase 3.4
 */

router.get('/sessions', authenticate, async (req, res) => {
  try {
    const sessions = await getActiveSessions(req.user._id);
    
    res.json({
      success: true,
      sessions
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get sessions'
    });
  }
});

module.exports = router;
