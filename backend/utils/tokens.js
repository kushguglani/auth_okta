const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { getRedisClient } = require('../config/redis');

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TOKEN UTILITY
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Handles JWT token generation, verification, and refresh rotation
 * 
 * Features:
 * - Access token generation (15min)
 * - Refresh token generation with rotation (7 days)
 * - Token verification
 * - Token invalidation (logout)
 * - Theft detection
 * 
 * @file backend/utils/tokens.js
 * @phase Phase 3.4 - Token Refresh Rotation
 */

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GENERATE ACCESS TOKEN
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Creates short-lived access token for API requests
 * 
 * @param {Object} user - User document from database
 * @returns {String} - JWT access token
 * 
 * Usage:
 * const accessToken = generateAccessToken(user);
 * res.json({ accessToken });
 * 
 * Security:
 * - Short expiry (15 min) - limits damage if stolen
 * - Contains user info for authorization
 * - Type field prevents use as refresh token
 */

const generateAccessToken = (user) => {
  return jwt.sign(
    {
      userId: user._id,
      email: user.email,
      roles: user.roles,
      type: 'access' // Prevent misuse as refresh token
    },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m' }
  );
};

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GENERATE REFRESH TOKEN
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Creates long-lived refresh token for obtaining new access tokens
 * 
 * @param {Object} user - User document from database
 * @param {Object} deviceInfo - Optional device/session info
 * @returns {Promise<String>} - JWT refresh token
 * 
 * Flow:
 * 1. Generate unique tokenId
 * 2. Create JWT with tokenId
 * 3. Store token in Redis with metadata
 * 4. Return token to client
 * 
 * Security Features:
 * - Unique tokenId per token (enables rotation)
 * - Stored in Redis (can be invalidated)
 * - Device tracking (detect unusual activity)
 * - TTL matches JWT expiry (auto-cleanup)
 */

const generateRefreshToken = async (user, deviceInfo = {}) => {
  /**
   * Generate unique tokenId
   * ────────────────────────────────────────────────────────────────────────
   * Why unique tokenId?
   * - Track individual tokens
   * - Enable rotation (invalidate old, create new)
   * - Detect reuse attacks
   * - Allow logout from specific device
   */
  const tokenId = crypto.randomBytes(32).toString('hex');
  
  /**
   * Create JWT refresh token
   * ────────────────────────────────────────────────────────────────────────
   * Payload contains:
   * - userId: To identify user
   * - tokenId: To track this specific token
   * - type: To prevent misuse as access token
   */
  const refreshToken = jwt.sign(
    {
      userId: user._id,
      tokenId,
      type: 'refresh'
    },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
  );
  
  /**
   * Store in Redis
   * ────────────────────────────────────────────────────────────────────────
   * Why Redis?
   * - Fast lookup
   * - Automatic expiration (TTL)
   * - Easy invalidation (logout)
   * - Detect token reuse
   * 
   * Key format: refresh_token:userId:tokenId
   * Value: JSON with token metadata
   * TTL: 7 days (matches JWT expiry)
   */
  const redis = getRedisClient();
  const key = `refresh_token:${user._id}:${tokenId}`;
  
  await redis.set(
    key,
    JSON.stringify({
      token: refreshToken,
      deviceInfo: {
        userAgent: deviceInfo.userAgent || 'Unknown',
        ip: deviceInfo.ip || 'Unknown'
      },
      createdAt: Date.now(),
      lastUsed: Date.now()
    }),
    'EX',
    7 * 24 * 60 * 60 // 7 days in seconds
  );
  
  console.log(`🔑 Generated refresh token for user ${user._id} (tokenId: ${tokenId.substring(0, 8)}...)`);
  
  return refreshToken;
};

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * VERIFY REFRESH TOKEN
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Verifies refresh token and checks if it exists in Redis
 * 
 * @param {String} token - Refresh token from client
 * @returns {Promise<Object>} - Decoded token payload
 * @throws {Error} - If token invalid, expired, or reused
 * 
 * Security Checks:
 * 1. Verify JWT signature
 * 2. Check expiration
 * 3. Verify type is 'refresh'
 * 4. Check exists in Redis (not invalidated)
 * 5. Verify token matches stored token
 * 
 * Detects:
 * - Token reuse (possible theft)
 * - Expired tokens
 * - Invalid signatures
 * - Logged out tokens
 */

const verifyRefreshToken = async (token) => {
  try {
    // Step 1: Verify JWT signature and expiration
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    
    // Step 2: Check token type
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }
    
    // Step 3: Check if exists in Redis
    const redis = getRedisClient();
    const key = `refresh_token:${decoded.userId}:${decoded.tokenId}`;
    const stored = await redis.get(key);
    
    if (!stored) {
      /**
       * Token not in Redis
       * ────────────────────────────────────────────────────────────────────
       * Possible reasons:
       * 1. Already used (rotation)
       * 2. Expired and removed by TTL
       * 3. User logged out
       * 4. SECURITY: Possible token theft!
       * 
       * Action: Log security event
       */
      console.warn(`⚠️  Refresh token reuse detected for user ${decoded.userId}`);
      throw new Error('Refresh token invalid or expired. Please login again.');
    }
    
    // Step 4: Parse stored data
    const storedData = JSON.parse(stored);
    
    // Step 5: Verify token matches (extra security)
    if (storedData.token !== token) {
      throw new Error('Token mismatch');
    }
    
    // Step 6: Update last used timestamp
    storedData.lastUsed = Date.now();
    await redis.set(
      key,
      JSON.stringify(storedData),
      'EX',
      7 * 24 * 60 * 60
    );
    
    console.log(`✅ Refresh token verified for user ${decoded.userId}`);
    
    return decoded;
    
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Refresh token expired. Please login again.');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid refresh token');
    }
    throw error;
  }
};

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * INVALIDATE REFRESH TOKEN
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Invalidates a specific refresh token (logout from one device)
 * 
 * @param {String} userId - User ID
 * @param {String} tokenId - Token ID
 * @returns {Promise<void>}
 * 
 * Usage:
 * - Logout from specific device
 * - After token rotation (invalidate old token)
 */

const invalidateRefreshToken = async (userId, tokenId) => {
  const redis = getRedisClient();
  const key = `refresh_token:${userId}:${tokenId}`;
  await redis.del(key);
  
  console.log(`🗑️  Invalidated refresh token for user ${userId} (tokenId: ${tokenId.substring(0, 8)}...)`);
};

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * INVALIDATE ALL REFRESH TOKENS
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Invalidates all refresh tokens for a user (logout from all devices)
 * 
 * @param {String} userId - User ID
 * @returns {Promise<void>}
 * 
 * Usage:
 * - Password reset (security)
 * - Account compromised
 * - User requests logout from all devices
 * 
 * Pattern: refresh_token:userId:*
 */

const invalidateAllRefreshTokens = async (userId) => {
  const redis = getRedisClient();
  
  /**
   * Find all keys for this user
   * ────────────────────────────────────────────────────────────────────────
   * Pattern: refresh_token:userId:*
   * Example: refresh_token:abc123:tokenId1, refresh_token:abc123:tokenId2
   */
  const pattern = `refresh_token:${userId}:*`;
  const keys = await redis.keys(pattern);
  
  if (keys.length > 0) {
    await redis.del(...keys);
    console.log(`🗑️  Invalidated ${keys.length} refresh tokens for user ${userId}`);
  } else {
    console.log(`ℹ️  No refresh tokens found for user ${userId}`);
  }
  
  return keys.length;
};

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GET ALL ACTIVE SESSIONS
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Gets all active refresh tokens/sessions for a user
 * 
 * @param {String} userId - User ID
 * @returns {Promise<Array>} - Array of session objects
 * 
 * Usage:
 * - Show user active sessions
 * - Session management page
 * - Security audit
 */

const getActiveSessions = async (userId) => {
  const redis = getRedisClient();
  const pattern = `refresh_token:${userId}:*`;
  const keys = await redis.keys(pattern);
  
  const sessions = [];
  
  for (const key of keys) {
    const data = await redis.get(key);
    if (data) {
      const parsed = JSON.parse(data);
      const tokenId = key.split(':')[2];
      
      sessions.push({
        tokenId,
        deviceInfo: parsed.deviceInfo,
        createdAt: parsed.createdAt,
        lastUsed: parsed.lastUsed,
        isCurrentSession: false // Will be set by caller
      });
    }
  }
  
  // Sort by last used (most recent first)
  sessions.sort((a, b) => b.lastUsed - a.lastUsed);
  
  return sessions;
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  invalidateRefreshToken,
  invalidateAllRefreshTokens,
  getActiveSessions
};

