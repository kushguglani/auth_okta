# 🔄 Phase 3.4: Token Refresh Rotation

> **Seamless Token Refresh with Security**
> Auto-refresh access tokens without re-login, with rotation for security

**Last Updated:** Nov 29, 2025

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Why Token Refresh?](#why-token-refresh)
3. [Architecture & Flow](#architecture--flow)
4. [Implementation](#implementation)
5. [Security: Token Rotation](#security-token-rotation)
6. [Interview Questions](#interview-questions)

---

## 🎯 Overview

**Token Refresh** allows users to get new access tokens without logging in again. This provides seamless UX while maintaining security through short-lived access tokens.

**What We're Building:**
- Automatic token refresh on expiry
- Refresh token rotation (security)
- Detect stolen tokens
- Logout from all devices

---

## 🤔 Why Token Refresh?

### **The Problem: Short-Lived Tokens**

```javascript
// Access token expires in 15 minutes
JWT_ACCESS_EXPIRY=15m

// Problem:
User logs in → Gets token → Uses app
After 15 minutes → Token expired → User kicked out ❌

// Bad UX:
User has to login every 15 minutes!
```

### **The Solution: Refresh Tokens**

```javascript
// Two-token system:
1. Access Token: 15 min (short-lived, used for API calls)
2. Refresh Token: 7 days (long-lived, stored securely)

// Flow:
User logs in → Gets both tokens
After 15 min → Access token expires
Frontend detects → Uses refresh token → Gets new access token
User continues using app → No re-login needed ✅

// Security:
- Access token: Short-lived (less damage if stolen)
- Refresh token: Stored securely, rotated on use
```

---

## 🏗️ Architecture & Flow

### **Complete Token Refresh Flow**

```
┌─────────────────────────────────────────────────────────────┐
│                   TOKEN LIFECYCLE                            │
└─────────────────────────────────────────────────────────────┘

Step 1: Login
──────────────
POST /api/auth/login
{ email, password }
    ↓
Verify credentials ✅
    ↓
Generate TWO tokens:
┌──────────────────────────────────────────────┐
│ Access Token (15 min)                         │
│ {                                             │
│   userId: "abc123",                           │
│   email: "user@example.com",                  │
│   roles: ["user"],                            │
│   type: "access",                             │
│   exp: now + 15min                            │
│ }                                             │
└──────────────────────────────────────────────┘
┌──────────────────────────────────────────────┐
│ Refresh Token (7 days)                        │
│ {                                             │
│   userId: "abc123",                           │
│   tokenId: "unique-id",  ← For rotation       │
│   type: "refresh",                            │
│   exp: now + 7days                            │
│ }                                             │
└──────────────────────────────────────────────┘
    ↓
Store refresh token in Redis:
Key: refresh_token:abc123:unique-id
Value: { token, deviceInfo, createdAt }
TTL: 7 days
    ↓
Return to client:
{
  accessToken: "eyJhbGci...",
  refreshToken: "eyJhbGci...",  // Store in httpOnly cookie (Phase 3)
  user: { id, name, email }
}


Step 2: Using Access Token
──────────────────────────
GET /api/posts
Authorization: Bearer ACCESS_TOKEN
    ↓
Verify access token ✅
    ↓
Return data


Step 3: Access Token Expires
────────────────────────────
GET /api/posts
Authorization: Bearer EXPIRED_TOKEN
    ↓
Verify token → Expired! ❌
    ↓
Return 401: { message: "Token expired" }
    ↓
Frontend detects 401


Step 4: Auto-Refresh (Frontend)
───────────────────────────────
Axios interceptor catches 401
    ↓
POST /api/auth/refresh
{
  refreshToken: "eyJhbGci..."
}
    ↓
Backend: Verify refresh token
    ↓
┌──────────────────────────────────────────────┐
│ Refresh Token Validation                     │
│ 1. Verify JWT signature ✅                   │
│ 2. Check expiration (7 days) ✅              │
│ 3. Check type === 'refresh' ✅               │
│ 4. Check exists in Redis ✅                  │
│ 5. Check not blacklisted ✅                  │
└──────────────────────────────────────────────┘
    ↓
All checks pass ✅
    ↓
Generate NEW access token + NEW refresh token  ← ROTATION
    ↓
Delete old refresh token from Redis
Store new refresh token in Redis
    ↓
Return:
{
  accessToken: "NEW_TOKEN",
  refreshToken: "NEW_REFRESH_TOKEN"
}
    ↓
Frontend: Store new tokens
Retry original request with new access token
    ↓
GET /api/posts
Authorization: Bearer NEW_ACCESS_TOKEN
    ↓
Success! User continues using app ✅
```

---

## 🛠️ Implementation

### **Step 1: Update Token Generation**

**File:** `backend/utils/tokens.js` (create new file)

```javascript
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { getRedisClient } = require('../config/redis');

/**
 * ═══════════════════════════════════════════════════════════
 * GENERATE ACCESS TOKEN
 * ═══════════════════════════════════════════════════════════
 */

const generateAccessToken = (user) => {
  return jwt.sign(
    {
      userId: user._id,
      email: user.email,
      roles: user.roles,
      type: 'access'  // Prevent use as refresh token
    },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m' }
  );
};

/**
 * ═══════════════════════════════════════════════════════════
 * GENERATE REFRESH TOKEN
 * ═══════════════════════════════════════════════════════════
 */

const generateRefreshToken = async (user, deviceInfo = {}) => {
  /**
   * Why unique tokenId?
   * ────────────────────────────────────────────────────────
   * - Track individual refresh tokens
   * - Enable rotation (invalidate old, create new)
   * - Detect reuse attacks
   * - Allow logout from specific device
   */
  const tokenId = crypto.randomBytes(32).toString('hex');
  
  const refreshToken = jwt.sign(
    {
      userId: user._id,
      tokenId,  // Unique identifier for this token
      type: 'refresh'
    },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
  );
  
  /**
   * Store in Redis
   * ────────────────────────────────────────────────────────
   * Key: refresh_token:userId:tokenId
   * Value: JSON({ token, deviceInfo, createdAt, lastUsed })
   * TTL: 7 days (same as JWT expiry)
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
    7 * 24 * 60 * 60  // 7 days in seconds
  );
  
  return refreshToken;
};

/**
 * ═══════════════════════════════════════════════════════════
 * VERIFY REFRESH TOKEN
 * ═══════════════════════════════════════════════════════════
 */

const verifyRefreshToken = async (token) => {
  try {
    // 1. Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    
    // 2. Check type
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }
    
    // 3. Check if exists in Redis
    const redis = getRedisClient();
    const key = `refresh_token:${decoded.userId}:${decoded.tokenId}`;
    const stored = await redis.get(key);
    
    if (!stored) {
      /**
       * Token not in Redis
       * ────────────────────────────────────────────────────
       * Possible reasons:
       * 1. Already used (rotation)
       * 2. Expired
       * 3. User logged out
       * 4. SECURITY: Possible token theft!
       */
      throw new Error('Refresh token invalid or expired');
    }
    
    // 4. Parse stored data
    const storedData = JSON.parse(stored);
    
    // 5. Verify token matches
    if (storedData.token !== token) {
      throw new Error('Token mismatch');
    }
    
    return decoded;
    
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Refresh token expired. Please login again.');
    }
    throw error;
  }
};

/**
 * ═══════════════════════════════════════════════════════════
 * INVALIDATE REFRESH TOKEN
 * ═══════════════════════════════════════════════════════════
 */

const invalidateRefreshToken = async (userId, tokenId) => {
  const redis = getRedisClient();
  const key = `refresh_token:${userId}:${tokenId}`;
  await redis.del(key);
};

/**
 * ═══════════════════════════════════════════════════════════
 * INVALIDATE ALL REFRESH TOKENS (Logout all devices)
 * ═══════════════════════════════════════════════════════════
 */

const invalidateAllRefreshTokens = async (userId) => {
  const redis = getRedisClient();
  
  /**
   * Find all keys for this user
   * Pattern: refresh_token:userId:*
   */
  const pattern = `refresh_token:${userId}:*`;
  const keys = await redis.keys(pattern);
  
  if (keys.length > 0) {
    await redis.del(...keys);
  }
  
  console.log(`Invalidated ${keys.length} refresh tokens for user ${userId}`);
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  invalidateRefreshToken,
  invalidateAllRefreshTokens
};
```

---

### **Step 2: Update Login to Return Both Tokens**

**File:** `backend/routes/auth.js`

```javascript
const { generateAccessToken, generateRefreshToken } = require('../utils/tokens');

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = await generateRefreshToken(user, {
      userAgent: req.headers['user-agent'],
      ip: req.ip
    });
    
    res.json({
      success: true,
      message: 'Login successful',
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        roles: user.roles
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
});
```

---

### **Step 3: Create Refresh Endpoint**

**File:** `backend/routes/auth.js`

```javascript
const { 
  generateAccessToken, 
  generateRefreshToken,
  verifyRefreshToken,
  invalidateRefreshToken 
} = require('../utils/tokens');

/**
 * ═══════════════════════════════════════════════════════════
 * POST /api/auth/refresh
 * ═══════════════════════════════════════════════════════════
 * Refresh access token using refresh token
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
    // 4. Invalidate OLD Refresh Token
    // ─────────────────────────────────────────────────────────
    /**
     * Why invalidate old token? (ROTATION)
     * ────────────────────────────────────────────────────────
     * Security: If attacker steals refresh token and uses it,
     * the legitimate user's next refresh will fail.
     * Both tokens become invalid → Alert user → Re-login required
     * 
     * This is called "Refresh Token Rotation"
     */
    await invalidateRefreshToken(decoded.userId, decoded.tokenId);
    
    // ─────────────────────────────────────────────────────────
    // 5. Return New Tokens
    // ─────────────────────────────────────────────────────────
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
```

---

### **Step 4: Frontend Auto-Refresh (Axios Interceptor)**

**File:** `frontend/src/utils/axiosInterceptor.js`

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api'
});

/**
 * ═══════════════════════════════════════════════════════════
 * REQUEST INTERCEPTOR
 * ═══════════════════════════════════════════════════════════
 * Add access token to every request
 */

api.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem('accessToken');
    
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * ═══════════════════════════════════════════════════════════
 * RESPONSE INTERCEPTOR
 * ═══════════════════════════════════════════════════════════
 * Auto-refresh on 401 Unauthorized
 */

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    /**
     * If 401 and haven't retried yet → Try refresh
     * ────────────────────────────────────────────────────────
     */
    if (error.response?.status === 401 && !originalRequest._retry) {
      /**
       * Prevent multiple refresh requests
       * ────────────────────────────────────────────────────
       * If multiple requests fail simultaneously,
       * queue them and refresh once
       */
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch(err => {
            return Promise.reject(err);
          });
      }
      
      originalRequest._retry = true;
      isRefreshing = true;
      
      const refreshToken = localStorage.getItem('refreshToken');
      
      if (!refreshToken) {
        // No refresh token → Redirect to login
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(error);
      }
      
      try {
        // Call refresh endpoint
        const response = await axios.post(
          'http://localhost:5000/api/auth/refresh',
          { refreshToken }
        );
        
        const { accessToken, refreshToken: newRefreshToken } = response.data;
        
        // Store new tokens
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);
        
        // Update original request header
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        
        // Process queued requests
        processQueue(null, accessToken);
        
        // Retry original request
        return api(originalRequest);
        
      } catch (refreshError) {
        // Refresh failed → Logout
        processQueue(refreshError, null);
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
```

---

## 🔐 Security: Token Rotation

### **What is Token Rotation?**

**Without Rotation:**
```
User gets refresh token → Uses it many times
Attacker steals token → Can use it forever ❌

Timeline:
Day 1: User refreshes → Uses same refresh token
Day 2: User refreshes → Uses same refresh token
Day 3: Attacker steals token
Day 4: Attacker refreshes → Uses stolen token ❌
Day 5: User refreshes → Uses same token (doesn't know about attack)
```

**With Rotation:**
```
User gets refresh token → Uses it ONCE
Each refresh generates NEW token, old becomes invalid ✅

Timeline:
Day 1: User refreshes → Gets NEW token, old invalid
Day 2: User refreshes → Gets NEW token, old invalid
Day 3: Attacker steals token
Day 4: Attacker refreshes → Gets NEW token
Day 5: User tries to refresh → OLD token invalid → Detect attack! ✅
       → Invalidate ALL tokens → Force re-login → Account secure
```

---

### **Implementation**

```javascript
// On refresh:
router.post('/refresh', async (req, res) => {
  const decoded = await verifyRefreshToken(refreshToken);
  
  // Generate NEW refresh token
  const newRefreshToken = await generateRefreshToken(user);
  
  // Invalidate OLD refresh token
  await invalidateRefreshToken(decoded.userId, decoded.tokenId);
  
  // Return both new tokens
  res.json({
    accessToken: newAccessToken,
    refreshToken: newRefreshToken  // ← Client must use this next time
  });
});
```

---

### **Detecting Token Theft**

```javascript
// Scenario: Token reuse detected

const verifyRefreshToken = async (token) => {
  const decoded = jwt.verify(token, SECRET);
  
  // Check if exists in Redis
  const stored = await redis.get(`refresh_token:${decoded.userId}:${decoded.tokenId}`);
  
  if (!stored) {
    /**
     * Token not found
     * ────────────────────────────────────────────────────────
     * Either:
     * 1. Already used (rotated)
     * 2. Expired
     * 3. User logged out
     * 
     * If recently rotated → Possible theft!
     */
    
    // Log security event
    await logSecurityEvent({
      userId: decoded.userId,
      event: 'REFRESH_TOKEN_REUSE',
      severity: 'HIGH',
      message: 'Refresh token reuse detected - possible theft'
    });
    
    // Invalidate ALL tokens for this user
    await invalidateAllRefreshTokens(decoded.userId);
    
    // Email user
    await sendSecurityAlert(decoded.userId, 'Token theft suspected');
    
    throw new Error('Security alert: Please login again');
  }
  
  return decoded;
};
```

---

## 🎓 Interview Questions

### **Q1: Why use both access and refresh tokens?**

**Answer:**
> "Access tokens are short-lived (15 min) for security - if stolen, damage is limited. Refresh tokens are long-lived (7 days) for UX - users don't re-login constantly. We store refresh tokens securely (httpOnly cookies or Redis) while access tokens are in memory. This balances security and user experience."

---

### **Q2: What is refresh token rotation and why is it important?**

**Answer:**
> "Refresh token rotation means each time you refresh, you get a NEW refresh token and the old one becomes invalid. This prevents token reuse attacks. If an attacker steals a refresh token and uses it, the legitimate user's next refresh will fail because the token was already used. The system detects this, invalidates all tokens, and requires re-login. Without rotation, a stolen token could be used indefinitely."

---

### **Q3: Where should you store refresh tokens on the frontend?**

**Answer:**
> "The most secure option is httpOnly cookies - JavaScript can't access them, preventing XSS attacks. localStorage is easier but vulnerable to XSS. Never store in regular cookies (CSRF risk) or sessionStorage (lost on tab close). For production, I'd use httpOnly cookies with SameSite=Strict and Secure flags."

**Code:**
```javascript
// Backend sets httpOnly cookie
res.cookie('refreshToken', token, {
  httpOnly: true,      // Can't access via JavaScript
  secure: true,        // HTTPS only
  sameSite: 'strict',  // CSRF protection
  maxAge: 7 * 24 * 60 * 60 * 1000  // 7 days
});

// Frontend: Cookie sent automatically
// No manual token management needed!
```

---

**Next:** [Phase 3.5: OAuth/SSO](./21-phase3-oauth-sso.md)

