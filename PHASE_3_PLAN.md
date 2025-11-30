# 🚀 Phase 3: Advanced Features - Implementation Plan

> **Production-Ready Authentication System**
> Email Verification, Password Reset, Role-Based Access Control, Single Sign-On

**Last Updated:** Nov 29, 2025

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Features to Implement](#features-to-implement)
3. [Implementation Order](#implementation-order)
4. [File Structure](#file-structure)
5. [Dependencies Required](#dependencies-required)
6. [Database Schema Updates](#database-schema-updates)
7. [API Endpoints](#api-endpoints)
8. [Security Considerations](#security-considerations)

---

## 🎯 Overview

Phase 3 transforms our basic authentication system into a **production-ready, enterprise-level** solution with advanced features used by companies like Okta, Auth0, and Google.

**What We're Building:**
- ✅ Email verification (secure account creation)
- ✅ Password reset flow (forgot password)
- ✅ Role-Based Access Control (RBAC)
- ✅ Single Sign-On (SSO) with OAuth 2.0
- ✅ Token refresh rotation
- ✅ Account security features
- ✅ Audit logging

**Learning Goals:**
- Production authentication patterns
- Email-based workflows
- Permission systems
- OAuth 2.0 / OpenID Connect
- Security best practices

---

## 🎯 Features to Implement

### **1. Email Verification** ⭐️ Priority 1

**What:**
- Send verification email after signup
- User clicks link to verify email
- Account activated only after verification

**Why:**
- Prevent fake accounts
- Verify email ownership
- Reduce spam signups
- Industry standard

**Implementation:**
```
User signs up
    ↓
Create user (isVerified: false)
    ↓
Generate verification token (JWT, 24h expiry)
    ↓
Send email with verification link
    ↓
User clicks link → Verify token → Mark user verified
```

**Files to Create/Update:**
- ✅ `backend/utils/email.js` - Email templates
- ✅ `backend/routes/auth.js` - Add `/verify/:token` endpoint
- ✅ `backend/models/User.js` - Add `verificationToken` field
- ✅ `frontend/pages/VerifyEmail.js` - Verification page

---

### **2. Password Reset** ⭐️ Priority 1

**What:**
- Forgot password flow
- Email with reset link
- User sets new password

**Why:**
- Users forget passwords
- Secure password recovery
- Better UX than "contact support"

**Implementation:**
```
User clicks "Forgot Password"
    ↓
Enter email → Generate reset token (1 hour expiry)
    ↓
Send email with reset link
    ↓
User clicks link → Verify token → Set new password
    ↓
Invalidate old tokens → User can login with new password
```

**Files to Create/Update:**
- ✅ `backend/routes/auth.js` - `/forgot-password`, `/reset-password/:token`
- ✅ `backend/models/User.js` - Add `passwordResetToken`, `passwordResetExpires`
- ✅ `frontend/pages/ForgotPassword.js`
- ✅ `frontend/pages/ResetPassword.js`

---

### **3. Role-Based Access Control (RBAC)** ⭐️ Priority 2

**What:**
- Assign roles to users (user, admin, moderator)
- Restrict routes based on roles
- Permission system

**Why:**
- Different user capabilities
- Admin panel access
- Content moderation
- Essential for enterprise apps

**Implementation:**
```
User Schema:
  roles: ['user', 'admin', 'moderator']
  permissions: ['read:posts', 'write:posts', 'delete:users']

Middleware:
  requireRole(['admin']) → Check if user has role
  requirePermission('delete:users') → Check if user has permission

Routes:
  GET /api/admin/users → requireRole(['admin'])
  DELETE /api/users/:id → requirePermission('delete:users')
```

**Files to Create/Update:**
- ✅ `backend/middleware/rbac.js` - Role checking middleware
- ✅ `backend/models/User.js` - Update roles/permissions
- ✅ `backend/routes/admin.js` - Admin routes
- ✅ `frontend/components/AdminPanel.js`

---

### **4. Single Sign-On (SSO)** ⭐️ Priority 3

**What:**
- Login with Google, GitHub, Facebook
- OAuth 2.0 implementation
- Social authentication

**Why:**
- Easier for users (no password to remember)
- Trusted authentication providers
- Industry standard
- Required for modern apps

**Implementation:**
```
OAuth 2.0 Flow (Example: Google):

User clicks "Login with Google"
    ↓
Redirect to Google OAuth:
  https://accounts.google.com/o/oauth2/v2/auth?
    client_id=YOUR_CLIENT_ID
    redirect_uri=http://localhost:5000/api/auth/google/callback
    response_type=code
    scope=profile email
    ↓
User approves → Google redirects back with code
    ↓
Backend exchanges code for access token
    ↓
Fetch user profile from Google
    ↓
Check if user exists:
  - YES: Login user
  - NO: Create user account
    ↓
Generate JWT tokens → Return to frontend
```

**Providers to Support:**
1. Google OAuth 2.0
2. GitHub OAuth
3. (Optional) Microsoft, Facebook

**Files to Create/Update:**
- ✅ `backend/routes/oauth.js` - OAuth routes
- ✅ `backend/config/passport.js` - Passport strategies
- ✅ `backend/models/User.js` - Add OAuth fields
- ✅ `frontend/components/SocialLogin.js`

---

### **5. Token Refresh Rotation** ⭐️ Priority 2

**What:**
- Automatic access token refresh
- Rotate refresh tokens
- Detect token theft

**Why:**
- Better security (short-lived tokens)
- Seamless UX (no re-login)
- Detect compromised tokens

**Implementation:**
```
Access token expires (15 min)
    ↓
Frontend detects 401 error
    ↓
Send refresh token to /api/auth/refresh
    ↓
Backend validates refresh token:
  - Check Redis for token
  - Verify signature
  - Check not blacklisted
    ↓
Generate NEW access token + NEW refresh token
Invalidate old refresh token (rotation)
    ↓
Return new tokens to frontend
```

**Files to Create/Update:**
- ✅ `backend/routes/auth.js` - `/refresh` endpoint
- ✅ `backend/middleware/refreshToken.js`
- ✅ `frontend/utils/axiosInterceptor.js` - Auto-refresh

---

### **6. Additional Security Features** ⭐️ Priority 3

**A. Account Lockout** (Already partially implemented)
- Lock account after 5 failed login attempts
- Auto-unlock after 2 hours
- Email notification

**B. Session Management**
- View active sessions
- Logout from all devices
- Logout from specific device

**C. Two-Factor Authentication (2FA)**
- TOTP (Time-based One-Time Password)
- QR code setup
- Backup codes

**D. Audit Logging**
- Log all auth events
- Track IP addresses
- Login history

---

## 📂 File Structure (Phase 3)

```
backend/
├── config/
│   ├── database.js
│   ├── redis.js
│   ├── passport.js           ← NEW: OAuth strategies
│   └── errorHandlers.js
│
├── middleware/
│   ├── rbac.js                ← NEW: Role-based access control
│   ├── auth.js                ← NEW: JWT verification middleware
│   └── validation.js          ← NEW: Input validation
│
├── models/
│   ├── User.js                ← UPDATE: Add verification, reset, OAuth fields
│   ├── Session.js             ← NEW: Active sessions
│   └── AuditLog.js            ← NEW: Audit logging
│
├── routes/
│   ├── index.js
│   ├── auth.js                ← UPDATE: Add verify, reset, refresh
│   ├── oauth.js               ← NEW: OAuth routes
│   ├── admin.js               ← NEW: Admin routes
│   └── user.js                ← NEW: User profile routes
│
├── utils/
│   ├── email.js               ← NEW: Email sending
│   ├── tokens.js              ← NEW: Token generation/verification
│   └── logger.js              ← NEW: Audit logging
│
├── graphql/
│   ├── typeDefs.js            ← UPDATE: Add new mutations
│   ├── resolvers.js           ← UPDATE: Add new resolvers
│   └── apolloServer.js
│
└── server.js                  ← UPDATE: Add new middleware

frontend/
├── pages/
│   ├── VerifyEmail.js         ← NEW
│   ├── ForgotPassword.js      ← NEW
│   ├── ResetPassword.js       ← NEW
│   └── AdminPanel.js          ← NEW
│
├── components/
│   ├── SocialLogin.js         ← NEW
│   ├── RequireRole.js         ← NEW
│   └── SessionManager.js      ← NEW
│
└── utils/
    └── axiosInterceptor.js    ← NEW: Auto-refresh tokens
```

---

## 📦 Dependencies Required

### **Backend - Additional Packages**

```bash
# Email
npm install nodemailer      # Already installed

# OAuth
npm install passport passport-google-oauth20 passport-github2

# Validation (already installed)
npm install express-validator

# Rate limiting (already installed)
npm install express-rate-limit

# 2FA (optional)
npm install speakeasy qrcode

# UUID for tokens
npm install uuid

# Cookie parser (already installed)
npm install cookie-parser
```

### **Frontend - Additional Packages**

```bash
# Axios for HTTP requests
npm install axios

# Form handling
npm install react-hook-form

# QR code (for 2FA)
npm install qrcode.react
```

---

## 🗄️ Database Schema Updates

### **User Model Updates**

```javascript
const userSchema = new mongoose.Schema({
  // Existing fields
  name: String,
  email: String,
  password: String,
  roles: [String],
  
  // ========== EMAIL VERIFICATION ==========
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: String,
  verificationTokenExpires: Date,
  
  // ========== PASSWORD RESET ==========
  passwordResetToken: String,
  passwordResetExpires: Date,
  passwordResetAttempts: {
    type: Number,
    default: 0
  },
  
  // ========== OAUTH / SSO ==========
  provider: {
    type: String,
    enum: ['local', 'google', 'github', 'microsoft'],
    default: 'local'
  },
  providerId: String,           // OAuth provider user ID
  profilePicture: String,        // From OAuth provider
  
  // ========== SECURITY ==========
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorSecret: String,
  backupCodes: [String],
  
  // ========== SESSIONS ==========
  activeSessions: [{
    token: String,
    deviceInfo: String,
    ipAddress: String,
    lastActive: Date,
    expiresAt: Date
  }],
  
  // ========== AUDIT ==========
  lastPasswordChange: Date,
  lastLoginAttempt: Date,
  successfulLogins: {
    type: Number,
    default: 0
  },
  
  // Existing timestamps
}, {
  timestamps: true
});
```

### **New Models**

**Session Model:**
```javascript
const sessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  refreshToken: String,
  deviceInfo: String,
  ipAddress: String,
  userAgent: String,
  createdAt: Date,
  expiresAt: Date,
  isActive: Boolean
});
```

**AuditLog Model:**
```javascript
const auditLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action: String,           // 'login', 'logout', 'password_reset', etc.
  ipAddress: String,
  userAgent: String,
  success: Boolean,
  errorMessage: String,
  timestamp: { type: Date, default: Date.now }
});
```

---

## 🔗 API Endpoints

### **Email Verification**

```
POST   /api/auth/verify/resend          Resend verification email
GET    /api/auth/verify/:token          Verify email with token
```

### **Password Reset**

```
POST   /api/auth/forgot-password        Request password reset
GET    /api/auth/reset-password/:token  Verify reset token
POST   /api/auth/reset-password/:token  Set new password
```

### **OAuth / SSO**

```
GET    /api/auth/google                 Initiate Google OAuth
GET    /api/auth/google/callback        Google OAuth callback
GET    /api/auth/github                 Initiate GitHub OAuth
GET    /api/auth/github/callback        GitHub OAuth callback
```

### **Token Management**

```
POST   /api/auth/refresh                Refresh access token
POST   /api/auth/logout-all             Logout from all devices
GET    /api/auth/sessions               Get active sessions
DELETE /api/auth/sessions/:id           Revoke specific session
```

### **Admin Routes**

```
GET    /api/admin/users                 Get all users (admin only)
PUT    /api/admin/users/:id/role        Update user role
DELETE /api/admin/users/:id             Delete user
GET    /api/admin/audit-logs            View audit logs
```

### **User Profile**

```
GET    /api/user/profile                Get current user profile
PUT    /api/user/profile                Update profile
POST   /api/user/change-password        Change password
POST   /api/user/enable-2fa             Enable 2FA
POST   /api/user/verify-2fa             Verify 2FA code
```

---

## 🔐 Security Considerations

### **Email Verification**

✅ **DO:**
- Use cryptographically secure tokens
- Set expiration (24 hours)
- One-time use tokens
- Rate limit resend requests

❌ **DON'T:**
- Use predictable tokens (userId, timestamp)
- Allow unlimited resends
- Store tokens in plain text

### **Password Reset**

✅ **DO:**
- Short expiration (1 hour)
- Invalidate all sessions after reset
- Notify user via email
- Rate limit requests

❌ **DON'T:**
- Send password in email
- Allow reuse of reset tokens
- Skip email verification

### **OAuth / SSO**

✅ **DO:**
- Validate state parameter (CSRF protection)
- Use HTTPS redirect URIs
- Store OAuth tokens securely
- Handle errors gracefully

❌ **DON'T:**
- Trust OAuth data without validation
- Expose client secrets
- Skip email verification from OAuth

### **RBAC**

✅ **DO:**
- Check permissions on backend
- Use middleware consistently
- Audit role changes
- Principle of least privilege

❌ **DON'T:**
- Trust frontend role checks
- Hardcode permissions
- Give admin to all users

---

## 📝 Implementation Checklist

### **Phase 3.1: Email Verification** (Week 1)
- [ ] Update User model with verification fields
- [ ] Create email utility with templates
- [ ] Add verification endpoints
- [ ] Update signup to send email
- [ ] Create frontend verification page
- [ ] Test email flow end-to-end

### **Phase 3.2: Password Reset** (Week 1)
- [ ] Update User model with reset fields
- [ ] Create reset endpoints
- [ ] Create email templates
- [ ] Create frontend reset pages
- [ ] Test reset flow end-to-end
- [ ] Add rate limiting

### **Phase 3.3: RBAC** (Week 2)
- [ ] Create RBAC middleware
- [ ] Update User model with roles
- [ ] Create admin routes
- [ ] Create frontend admin panel
- [ ] Add permission checks
- [ ] Test role-based access

### **Phase 3.4: Token Refresh** (Week 2)
- [ ] Create refresh endpoint
- [ ] Implement rotation logic
- [ ] Add frontend interceptor
- [ ] Test auto-refresh
- [ ] Handle edge cases

### **Phase 3.5: OAuth/SSO** (Week 3)
- [ ] Setup Passport.js
- [ ] Configure Google OAuth
- [ ] Configure GitHub OAuth
- [ ] Create OAuth routes
- [ ] Create social login UI
- [ ] Test OAuth flow
- [ ] Handle account linking

### **Phase 3.6: Additional Security** (Week 4)
- [ ] Improve account lockout
- [ ] Add session management
- [ ] Add 2FA (optional)
- [ ] Add audit logging
- [ ] Security testing

---

## 🎓 Interview Preparation

### **Key Concepts to Master**

1. **Email Verification**
   - Why it's important
   - Token generation
   - Security considerations
   - User experience

2. **Password Reset**
   - Security best practices
   - Token expiration
   - Attack vectors
   - Email templates

3. **RBAC**
   - Roles vs Permissions
   - Middleware patterns
   - Scalability
   - Real-world examples

4. **OAuth 2.0**
   - Authorization code flow
   - State parameter (CSRF)
   - Token exchange
   - Provider comparison

5. **Token Management**
   - Access vs Refresh tokens
   - Rotation strategy
   - Revocation
   - Security trade-offs

---

## 🚀 Next Steps

1. **Start with Email Verification** (foundational)
2. **Add Password Reset** (complements verification)
3. **Implement RBAC** (admin functionality)
4. **Add Token Refresh** (better UX)
5. **Integrate OAuth** (modern auth)

**Ready to start Phase 3.1: Email Verification!** 🎯

