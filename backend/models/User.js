const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * User Schema
 *
 * Represents a user in the system with authentication and authorization
 */

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [50, 'Name cannot exceed 50 characters']
  },

  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },

  password: {
    type: String,
    required: function() {
      // Password only required for local auth (not OAuth)
      return this.provider === 'local' || !this.provider;
    },
    minlength: [8, 'Password must be at least 8 characters'],
    select: false // Don't include password in queries by default
  },

  // ═══════════════════════════════════════════════════════════
  // ROLES & PERMISSIONS (RBAC - Phase 3.3)
  // ═══════════════════════════════════════════════════════════

  roles: [{
    type: String,
    enum: ['user', 'admin', 'moderator'],
    default: 'user'
    /**
     * Role Hierarchy:
     * - admin: Full access (all permissions)
     * - moderator: Content moderation (most permissions)
     * - user: Basic access (limited permissions)
     */
  }],

  permissions: [{
    type: String
    /**
     * Custom permissions for fine-grained access control
     * Format: "action:resource" (e.g., "delete:users", "view:analytics")
     *
     * Use cases:
     * - Grant special permission to specific user
     * - Revoke specific permission from role
     */
  }],

  // ═══════════════════════════════════════════════════════════
  // EMAIL VERIFICATION (Phase 3.1)
  // ═══════════════════════════════════════════════════════════

  isVerified: {
    type: Boolean,
    default: false
    /**
     * Email verification status
     * - false: User must verify email before certain actions
     * - true: Email verified (can reset password, receive notifications)
     */
  },

  verificationToken: {
    type: String,
    select: false
    /**
     * JWT token for email verification
     * - Generated on signup or resend request
     * - Expires in 24 hours
     * - One-time use (cleared after verification)
     */
  },

  verificationTokenExpires: {
    type: Date,
    select: false
    /**
     * Verification token expiration
     * - Set to 24 hours from creation
     * - Used for rate limiting resend requests
     */
  },

  // ═══════════════════════════════════════════════════════════
  // PASSWORD RESET (Phase 3.2)
  // ═══════════════════════════════════════════════════════════

  resetPasswordToken: {
    type: String,
    select: false
    /**
     * Hashed reset token (SHA256)
     * - Short expiry (1 hour) for security
     * - One-time use
     * - Stored as hash for extra security
     */
  },

  resetPasswordExpires: {
    type: Date,
    select: false
    /**
     * Reset token expiration
     * - 1 hour from creation (shorter than verification)
     * - More sensitive than email verification
     */
  },

  passwordResetAttempts: {
    type: Number,
    default: 0
    /**
     * Track reset requests
     * - Max 3 per hour (rate limiting)
     * - Prevents email bombing
     */
  },

  lastPasswordResetRequest: {
    type: Date
    /**
     * Timestamp of last reset request
     * - Used for rate limiting calculation
     * - Reset counter after 1 hour
     */
  },

  lastPasswordChange: {
    type: Date
    /**
     * Track when password was last changed
     * - Security audit trail
     * - Invalidate sessions created before this date
     */
  },

  // ═══════════════════════════════════════════════════════════
  // OAUTH / SSO (Phase 3.5)
  // ═══════════════════════════════════════════════════════════

  provider: {
    type: String,
    enum: ['local', 'google', 'github', 'microsoft', 'facebook'],
    default: 'local'
    /**
     * Authentication provider
     * - 'local': Email/password signup
     * - 'google': Google OAuth
     * - 'github': GitHub OAuth
     * - Others: Microsoft, Facebook, etc.
     */
  },

  providerId: {
    type: String
    /**
     * User ID from OAuth provider
     * - Google user ID, GitHub user ID, etc.
     * - Used to link accounts
     * - Unique per provider
     */
  },

  // ═══════════════════════════════════════════════════════════
  // SECURITY & ACCOUNT MANAGEMENT
  // ═══════════════════════════════════════════════════════════

  loginAttempts: {
    type: Number,
    default: 0
    /**
     * Failed login attempt counter
     * - Increments on failed login
     * - Locks account at 5 attempts
     * - Resets on successful login
     */
  },

  lockUntil: {
    type: Date
    /**
     * Account lock expiration
     * - Set after 5 failed login attempts
     * - Locks for 2 hours
     * - Auto-unlocks after expiry
     */
  },

  lastLogin: {
    type: Date
    /**
     * Last successful login timestamp
     * - Updated on each login
     * - Used for inactive account detection
     */
  },

  // ═══════════════════════════════════════════════════════════
  // PROFILE INFORMATION
  // ═══════════════════════════════════════════════════════════

  profilePicture: {
    type: String,
    default: ''
    /**
     * Profile picture URL
     * - Can be uploaded by user OR
     * - Auto-populated from OAuth provider
     */
  },

  bio: {
    type: String,
    maxlength: [500, 'Bio cannot exceed 500 characters'],
    default: ''
  }
}, {
  timestamps: true, // Adds createdAt and updatedAt automatically
  toJSON: {
    transform: function(doc, ret) {
      // Remove sensitive fields when converting to JSON
      delete ret.password;
      delete ret.verificationToken;
      delete ret.resetPasswordToken;
      delete ret.resetPasswordExpires;
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes for faster queries
// Note: email index is automatically created by 'unique: true' on the field
userSchema.index({ createdAt: -1 });

// Virtual for account locked status
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

/**
 * Pre-save hook to hash password
 * Only runs if password is modified
 */
userSchema.pre('save', async function() {
  // Only hash if password is modified
  if (!this.isModified('password')) {
    return;
  }

  // Generate salt and hash password
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

/**
 * Method to compare password for login
 * @param {String} candidatePassword - Password to compare
 * @returns {Boolean} - True if password matches
 */
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

/**
 * Method to increment login attempts
 * Locks account after 5 failed attempts
 */
userSchema.methods.incLoginAttempts = async function() {
  // If we have a previous lock that has expired, reset attempts
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 }
    });
  }

  const updates = { $inc: { loginAttempts: 1 } };

  // Lock account after 5 failed attempts for 2 hours
  const maxAttempts = 5;
  const lockTime = 2 * 60 * 60 * 1000; // 2 hours

  if (this.loginAttempts + 1 >= maxAttempts && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + lockTime };
  }

  return this.updateOne(updates);
};

/**
 * Method to reset login attempts after successful login
 */
userSchema.methods.resetLoginAttempts = async function() {
  return this.updateOne({
    $set: { loginAttempts: 0 },
    $unset: { lockUntil: 1 }
  });
};

/**
 * Static method to find user by credentials
 * @param {String} email - User email
 * @param {String} password - User password
 * @returns {Object} - User object if credentials are valid
 */
userSchema.statics.findByCredentials = async function(email, password) {
  const user = await this.findOne({ email }).select('+password');

  if (!user) {
    throw new Error('Invalid email or password');
  }

  // Check if account is locked
  if (user.isLocked) {
    throw new Error('Account locked due to too many failed login attempts. Try again later.');
  }

  const isMatch = await user.comparePassword(password);

  if (!isMatch) {
    // Increment login attempts
    await user.incLoginAttempts();
    throw new Error('Invalid email or password');
  }

  // Reset login attempts on successful login
  if (user.loginAttempts > 0) {
    await user.resetLoginAttempts();
  }

  // Update last login
  user.lastLogin = Date.now();
  await user.save();

  return user;
};

// ═══════════════════════════════════════════════════════════
// EMAIL VERIFICATION METHODS (Phase 3.1)
// ═══════════════════════════════════════════════════════════

/**
 * Generate email verification token
 * @returns {String} - JWT verification token
 */
userSchema.methods.generateVerificationToken = function() {
  const jwt = require('jsonwebtoken');

  /**
   * Create JWT token with:
   * - userId: To identify user
   * - email: For validation
   * - type: Prevent reuse for other purposes
   * - 24h expiry: Long enough to check email
   */
  const token = jwt.sign(
    {
      userId: this._id,
      email: this.email,
      type: 'verification'
    },
    process.env.JWT_VERIFICATION_SECRET || process.env.JWT_ACCESS_SECRET,
    { expiresIn: '24h' }
  );

  // Store token and expiry (optional - for single-use enforcement)
  this.verificationToken = token;
  this.verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000;

  return token;
};

/**
 * Verify email with token (static method)
 * @param {String} token - Verification token
 * @returns {Object} - User object if verification successful
 */
userSchema.statics.verifyEmailToken = async function(token) {
  const jwt = require('jsonwebtoken');

  try {
    // 1. Verify JWT signature and expiration
    const decoded = jwt.verify(
      token,
      process.env.JWT_VERIFICATION_SECRET || process.env.JWT_ACCESS_SECRET
    );

    // 2. Check token type
    if (decoded.type !== 'verification') {
      throw new Error('Invalid token type');
    }

    // 3. Find user
    const user = await this.findById(decoded.userId);
    if (!user) {
      throw new Error('User not found');
    }

    // 4. Check if already verified
    if (user.isVerified) {
      throw new Error('Email already verified');
    }

    // 5. Mark as verified
    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();

    return user;

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Verification link expired. Please request a new one.');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid verification link');
    }
    throw error;
  }
};

// ═══════════════════════════════════════════════════════════
// PASSWORD RESET METHODS (Phase 3.2)
// ═══════════════════════════════════════════════════════════

/**
 * Generate password reset token
 * @returns {String} - JWT reset token
 */
userSchema.methods.generatePasswordResetToken = function() {
  const jwt = require('jsonwebtoken');
  const crypto = require('crypto');

  /**
   * Two-layer security:
   * 1. JWT with short expiry (1 hour)
   * 2. Random component to prevent prediction
   */
  const randomString = crypto.randomBytes(32).toString('hex');

  const token = jwt.sign(
    {
      userId: this._id,
      email: this.email,
      type: 'password_reset',
      random: randomString
    },
    process.env.JWT_RESET_SECRET || process.env.JWT_ACCESS_SECRET,
    { expiresIn: '1h' }
  );

  // Store hashed version for extra security
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  this.resetPasswordToken = hashedToken;
  this.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
  this.passwordResetAttempts += 1;
  this.lastPasswordResetRequest = Date.now();

  return token; // Return unhashed token to send in email
};

/**
 * Verify password reset token
 * @param {String} token - Reset token from email
 * @returns {Boolean} - True if valid
 */
userSchema.methods.verifyPasswordResetToken = async function(token) {
  const crypto = require('crypto');

  // Hash incoming token
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  // Compare with stored hash
  if (this.resetPasswordToken !== hashedToken) {
    throw new Error('Invalid reset token');
  }

  // Check expiration
  if (this.resetPasswordExpires < Date.now()) {
    throw new Error('Reset token expired');
  }

  return true;
};

/**
 * Reset password
 * @param {String} newPassword - New password
 */
userSchema.methods.resetPassword = async function(newPassword) {
  const { getRedisClient } = require('../config/redis');

  /**
   * Password Reset Actions:
   * 1. Update password (will be hashed by pre-save hook)
   * 2. Clear reset token
   * 3. Update lastPasswordChange
   * 4. Reset login attempts
   * 5. Invalidate all refresh tokens (logout everywhere)
   */

  // 1. Update password
  this.password = newPassword;

  // 2. Clear reset fields
  this.resetPasswordToken = undefined;
  this.resetPasswordExpires = undefined;

  // 3. Update metadata
  this.lastPasswordChange = Date.now();

  // 4. Reset login attempts (fresh start)
  this.loginAttempts = 0;
  this.lockUntil = undefined;

  await this.save();

  // 5. Invalidate all refresh tokens (security - logout all devices)
  try {
    const redis = getRedisClient();
    const pattern = `refresh_token:${this._id}:*`;
    const keys = await redis.keys(pattern);

    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`🔒 Invalidated ${keys.length} tokens after password reset`);
    }
  } catch (error) {
    console.error('Error invalidating tokens:', error);
    // Continue even if Redis fails
  }
};

// ═══════════════════════════════════════════════════════════
// RBAC METHODS (Phase 3.3)
// ═══════════════════════════════════════════════════════════

/**
 * Get all permissions for this user
 * @returns {Array} - Array of permission strings
 */
userSchema.methods.getPermissions = function() {
  try {
    const { getPermissionsForRoles } = require('../config/roles');

    // Get permissions from roles
    let permissions = new Set(getPermissionsForRoles(this.roles));

    // Add custom granted permissions
    if (this.permissions && this.permissions.length > 0) {
      this.permissions.forEach(perm => permissions.add(perm));
    }

    return Array.from(permissions);
  } catch (error) {
    // If roles.js doesn't exist yet, return empty array
    return this.permissions || [];
  }
};

/**
 * Check if user has specific permission
 * @param {String} permission - Permission to check
 * @returns {Boolean}
 */
userSchema.methods.hasPermission = function(permission) {
  const permissions = this.getPermissions();
  return permissions.includes(permission);
};

/**
 * Check if user has any of the required permissions
 * @param {Array|String} requiredPermissions - Permissions to check
 * @returns {Boolean}
 */
userSchema.methods.hasAnyPermission = function(requiredPermissions) {
  if (!Array.isArray(requiredPermissions)) {
    requiredPermissions = [requiredPermissions];
  }

  const userPermissions = this.getPermissions();
  return requiredPermissions.some(perm => userPermissions.includes(perm));
};

/**
 * Check if user has all required permissions
 * @param {Array|String} requiredPermissions - Permissions to check
 * @returns {Boolean}
 */
userSchema.methods.hasAllPermissions = function(requiredPermissions) {
  if (!Array.isArray(requiredPermissions)) {
    requiredPermissions = [requiredPermissions];
  }

  const userPermissions = this.getPermissions();
  return requiredPermissions.every(perm => userPermissions.includes(perm));
};

/**
 * Check if user has specific role
 * @param {String} role - Role to check
 * @returns {Boolean}
 */
userSchema.methods.hasRole = function(role) {
  return this.roles.includes(role);
};

/**
 * Check if user has any of the required roles
 * @param {Array|String} roles - Roles to check
 * @returns {Boolean}
 */
userSchema.methods.hasAnyRole = function(roles) {
  if (!Array.isArray(roles)) roles = [roles];
  return this.roles.some(role => roles.includes(role));
};

/**
 * Check if user is admin
 * @returns {Boolean}
 */
userSchema.methods.isAdmin = function() {
  return this.roles.includes('admin');
};

/**
 * Check if user is moderator or admin
 * @returns {Boolean}
 */
userSchema.methods.isModerator = function() {
  return this.hasAnyRole(['moderator', 'admin']);
};

const User = mongoose.model('User', userSchema);

module.exports = User;

