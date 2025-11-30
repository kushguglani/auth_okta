# 🔐 Phase 3.5: OAuth 2.0 & Single Sign-On (SSO)

> **Social Authentication with Google & GitHub**
> Industry-standard OAuth 2.0 implementation

**Last Updated:** Nov 29, 2025

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [What is OAuth 2.0?](#what-is-oauth-20)
3. [Google OAuth Implementation](#google-oauth-implementation)
4. [GitHub OAuth Implementation](#github-oauth-implementation)
5. [Account Linking](#account-linking)
6. [Security Considerations](#security-considerations)
7. [Interview Questions](#interview-questions)

---

## 🎯 Overview

**OAuth 2.0** is an authorization framework that enables third-party applications to obtain limited access to user accounts. **SSO (Single Sign-On)** allows users to login with existing accounts (Google, GitHub, etc.) without creating new passwords.

**What We're Building:**
- Login with Google
- Login with GitHub
- Link social accounts to existing accounts
- Profile picture from OAuth provider
- Secure OAuth flow with state validation

**Why OAuth/SSO?**
```
Benefits:
✅ No password to remember
✅ Trusted auth providers (Google, GitHub)
✅ Faster signup (1 click vs form)
✅ Auto-filled profile data
✅ Industry standard
✅ Better security (2FA from provider)
```

---

## 🤔 What is OAuth 2.0?

### **OAuth vs Authentication**

**Authentication:** "Who are you?"
**Authorization:** "What can you access?"

**OAuth 2.0** is technically an **authorization** protocol, but we use it for **authentication** (login).

---

### **OAuth 2.0 Flow (Authorization Code)**

```
┌─────────────────────────────────────────────────────────────┐
│           OAUTH 2.0 AUTHORIZATION CODE FLOW                  │
└─────────────────────────────────────────────────────────────┘

Step 1: User Clicks "Login with Google"
────────────────────────────────────────
Frontend: Show button
<button onClick={loginWithGoogle}>
  🔐 Login with Google
</button>
    ↓
Redirect to Google OAuth URL:
https://accounts.google.com/o/oauth2/v2/auth?
  client_id=YOUR_CLIENT_ID
  redirect_uri=http://localhost:5000/api/auth/google/callback
  response_type=code
  scope=profile email
  state=RANDOM_STRING  ← CSRF protection


Step 2: Google Authorization Page
─────────────────────────────────
User sees Google's permission screen:
┌──────────────────────────────────────────────┐
│  YourApp wants to:                            │
│  ✓ View your email address                   │
│  ✓ View your basic profile info              │
│                                               │
│  [Cancel]  [Allow]                            │
└──────────────────────────────────────────────┘
    ↓
User clicks "Allow"


Step 3: Google Redirects Back
─────────────────────────────
Google redirects to:
http://localhost:5000/api/auth/google/callback?
  code=AUTHORIZATION_CODE  ← Use this to get token
  state=RANDOM_STRING      ← Verify matches original
    ↓
Backend receives request


Step 4: Exchange Code for Token
───────────────────────────────
Backend makes server-to-server request:
POST https://oauth2.googleapis.com/token
{
  code: AUTHORIZATION_CODE,
  client_id: YOUR_CLIENT_ID,
  client_secret: YOUR_CLIENT_SECRET,
  redirect_uri: http://localhost:5000/api/auth/google/callback,
  grant_type: authorization_code
}
    ↓
Google returns:
{
  access_token: "ya29.a0AfH6SMB...",  ← Use to call Google APIs
  expires_in: 3600,
  token_type: "Bearer",
  scope: "profile email",
  id_token: "eyJhbGci..."  ← JWT with user info
}


Step 5: Get User Profile
────────────────────────
Backend calls Google API:
GET https://www.googleapis.com/oauth2/v1/userinfo?
  access_token=ya29.a0AfH6SMB...
    ↓
Google returns user data:
{
  id: "1234567890",         ← Google user ID
  email: "user@gmail.com",
  verified_email: true,
  name: "John Doe",
  picture: "https://lh3.googleusercontent.com/..."
}


Step 6: Create/Login User
─────────────────────────
Check if user exists:

IF user exists with this Google ID:
  → Login user
  → Generate JWT tokens
  → Return tokens

ELSE IF user exists with same email:
  → Link Google account to existing user
  → Update user with Google ID
  → Generate JWT tokens
  → Return tokens

ELSE:
  → Create new user
  → Set provider: 'google'
  → Set providerId: Google ID
  → Set isVerified: true (email already verified by Google)
  → Set profilePicture from Google
  → Generate JWT tokens
  → Return tokens


Step 7: Frontend Receives Tokens
────────────────────────────────
Backend redirects to frontend:
http://localhost:3000/auth/callback?
  accessToken=eyJhbGci...
  refreshToken=eyJhbGci...
    ↓
Frontend:
- Extract tokens from URL
- Store in localStorage
- Redirect to dashboard
- User is logged in! ✅
```

---

## 🛠️ Google OAuth Implementation

### **Step 1: Setup Google OAuth App**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project: "KTA Auth"
3. Enable "Google+ API"
4. Create OAuth 2.0 credentials:
   - **Application type:** Web application
   - **Name:** KTA Auth
   - **Authorized redirect URIs:**
     - `http://localhost:5000/api/auth/google/callback` (dev)
     - `https://yourapp.com/api/auth/google/callback` (prod)
5. Copy **Client ID** and **Client Secret**

---

### **Step 2: Install Passport.js**

```bash
cd backend
bun add passport passport-google-oauth20
```

**Why Passport.js?**
- Handles OAuth complexity
- Support for 500+ strategies (Google, GitHub, Facebook, etc.)
- Battle-tested
- Industry standard

---

### **Step 3: Configure Passport Strategy**

**File:** `backend/config/passport.js`

```javascript
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

/**
 * ═══════════════════════════════════════════════════════════
 * GOOGLE OAUTH STRATEGY
 * ═══════════════════════════════════════════════════════════
 */

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback',
    scope: ['profile', 'email']
  },
  async (accessToken, refreshToken, profile, done) => {
    /**
     * This callback runs after user approves
     * ────────────────────────────────────────────────────────
     * profile contains:
     * {
     *   id: "1234567890",
     *   displayName: "John Doe",
     *   emails: [{ value: "john@gmail.com", verified: true }],
     *   photos: [{ value: "https://..." }],
     *   provider: "google"
     * }
     */
    
    try {
      const email = profile.emails[0].value;
      const googleId = profile.id;
      
      // ─────────────────────────────────────────────────────
      // Case 1: User already logged in with Google
      // ─────────────────────────────────────────────────────
      let user = await User.findOne({ 
        provider: 'google', 
        providerId: googleId 
      });
      
      if (user) {
        // Update profile picture if changed
        if (profile.photos && profile.photos[0]) {
          user.profilePicture = profile.photos[0].value;
          await user.save();
        }
        
        return done(null, user);
      }
      
      // ─────────────────────────────────────────────────────
      // Case 2: User exists with same email (link accounts)
      // ─────────────────────────────────────────────────────
      user = await User.findOne({ email });
      
      if (user) {
        // Link Google account to existing user
        user.provider = 'google';
        user.providerId = googleId;
        user.isVerified = true;  // Email verified by Google
        
        if (profile.photos && profile.photos[0]) {
          user.profilePicture = profile.photos[0].value;
        }
        
        await user.save();
        return done(null, user);
      }
      
      // ─────────────────────────────────────────────────────
      // Case 3: New user - Create account
      // ─────────────────────────────────────────────────────
      user = await User.create({
        name: profile.displayName,
        email,
        provider: 'google',
        providerId: googleId,
        profilePicture: profile.photos?.[0]?.value || '',
        isVerified: true,  // Email already verified by Google
        roles: ['user']
      });
      
      return done(null, user);
      
    } catch (error) {
      return done(error, null);
    }
  }
));

/**
 * ═══════════════════════════════════════════════════════════
 * SERIALIZE/DESERIALIZE (for session-based auth)
 * ═══════════════════════════════════════════════════════════
 * We're using JWT, so we can skip this
 */

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;
```

---

### **Step 4: Create OAuth Routes**

**File:** `backend/routes/oauth.js`

```javascript
const router = require('express').Router();
const passport = require('../config/passport');
const { generateAccessToken, generateRefreshToken } = require('../utils/tokens');

/**
 * ═══════════════════════════════════════════════════════════
 * GET /api/auth/google
 * ═══════════════════════════════════════════════════════════
 * Initiate Google OAuth flow
 */

router.get('/google', 
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false  // We're using JWT, not sessions
  })
);

/**
 * ═══════════════════════════════════════════════════════════
 * GET /api/auth/google/callback
 * ═══════════════════════════════════════════════════════════
 * Google redirects here after user approval
 */

router.get('/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=oauth_failed`
  }),
  async (req, res) => {
    try {
      /**
       * req.user is populated by Passport
       * ────────────────────────────────────────────────────
       * Contains user from database (created/found in strategy)
       */
      const user = req.user;
      
      // Generate JWT tokens
      const accessToken = generateAccessToken(user);
      const refreshToken = await generateRefreshToken(user, {
        userAgent: req.headers['user-agent'],
        ip: req.ip
      });
      
      /**
       * Redirect to frontend with tokens
       * ────────────────────────────────────────────────────
       * Frontend extracts tokens from URL and stores them
       */
      const redirectUrl = `${process.env.FRONTEND_URL}/auth/callback?` +
        `accessToken=${accessToken}&` +
        `refreshToken=${refreshToken}`;
      
      res.redirect(redirectUrl);
      
    } catch (error) {
      console.error('OAuth callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
    }
  }
);

module.exports = router;
```

---

### **Step 5: Update Server**

**File:** `backend/server.js`

```javascript
const passport = require('./config/passport');
const oauthRoutes = require('./routes/oauth');

// Initialize Passport
app.use(passport.initialize());

// Mount OAuth routes
app.use('/api/auth', oauthRoutes);
```

---

### **Step 6: Frontend - Login Button**

**File:** `frontend/src/components/SocialLogin.js`

```javascript
import React from 'react';
import './SocialLogin.css';

const SocialLogin = () => {
  const handleGoogleLogin = () => {
    /**
     * Redirect to backend OAuth endpoint
     * Backend will redirect to Google
     * Google will redirect back to backend
     * Backend will redirect to frontend with tokens
     */
    window.location.href = 'http://localhost:5000/api/auth/google';
  };
  
  const handleGitHubLogin = () => {
    window.location.href = 'http://localhost:5000/api/auth/github';
  };
  
  return (
    <div className="social-login">
      <div className="divider">
        <span>Or continue with</span>
      </div>
      
      <button className="social-btn google-btn" onClick={handleGoogleLogin}>
        <img src="/icons/google.svg" alt="Google" />
        Login with Google
      </button>
      
      <button className="social-btn github-btn" onClick={handleGitHubLogin}>
        <img src="/icons/github.svg" alt="GitHub" />
        Login with GitHub
      </button>
    </div>
  );
};

export default SocialLogin;
```

---

### **Step 7: Frontend - OAuth Callback Handler**

**File:** `frontend/src/pages/OAuthCallback.js`

```javascript
import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const OAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setUser, setTokens } = useAuth();
  
  useEffect(() => {
    // Extract tokens from URL
    const accessToken = searchParams.get('accessToken');
    const refreshToken = searchParams.get('refreshToken');
    const error = searchParams.get('error');
    
    if (error) {
      alert('OAuth login failed: ' + error);
      navigate('/login');
      return;
    }
    
    if (accessToken && refreshToken) {
      // Store tokens
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      
      // Update auth context
      setTokens(accessToken, refreshToken);
      
      // Redirect to dashboard
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  }, [searchParams, navigate, setTokens]);
  
  return (
    <div className="oauth-callback">
      <h2>Logging you in...</h2>
      <p>Please wait while we complete the authentication.</p>
    </div>
  );
};

export default OAuthCallback;
```

---

## 🛠️ GitHub OAuth Implementation

### **Step 1: Create GitHub OAuth App**

1. Go to GitHub Settings → Developer Settings → OAuth Apps
2. Click "New OAuth App"
3. Fill in:
   - **Application name:** KTA Auth
   - **Homepage URL:** `http://localhost:3000`
   - **Authorization callback URL:** `http://localhost:5000/api/auth/github/callback`
4. Copy **Client ID** and **Client Secret**

---

### **Step 2: Add GitHub Strategy**

```bash
bun add passport-github2
```

**File:** `backend/config/passport.js` (add to existing)

```javascript
const GitHubStrategy = require('passport-github2').Strategy;

passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: process.env.GITHUB_CALLBACK_URL || 'http://localhost:5000/api/auth/github/callback',
    scope: ['user:email']
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails?.[0]?.value;
      
      if (!email) {
        return done(new Error('No email from GitHub'), null);
      }
      
      const githubId = profile.id;
      
      // Check if user exists with GitHub
      let user = await User.findOne({
        provider: 'github',
        providerId: githubId
      });
      
      if (user) {
        return done(null, user);
      }
      
      // Check if email exists (link accounts)
      user = await User.findOne({ email });
      
      if (user) {
        user.provider = 'github';
        user.providerId = githubId;
        user.isVerified = true;
        user.profilePicture = profile.photos?.[0]?.value || '';
        await user.save();
        return done(null, user);
      }
      
      // Create new user
      user = await User.create({
        name: profile.displayName || profile.username,
        email,
        provider: 'github',
        providerId: githubId,
        profilePicture: profile.photos?.[0]?.value || '',
        isVerified: true,
        roles: ['user']
      });
      
      return done(null, user);
      
    } catch (error) {
      return done(error, null);
    }
  }
));
```

---

### **Step 3: Add GitHub Routes**

**File:** `backend/routes/oauth.js` (add to existing)

```javascript
// Initiate GitHub OAuth
router.get('/github',
  passport.authenticate('github', {
    scope: ['user:email'],
    session: false
  })
);

// GitHub callback
router.get('/github/callback',
  passport.authenticate('github', {
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=oauth_failed`
  }),
  async (req, res) => {
    // Same token generation logic as Google
    const user = req.user;
    const accessToken = generateAccessToken(user);
    const refreshToken = await generateRefreshToken(user);
    
    const redirectUrl = `${process.env.FRONTEND_URL}/auth/callback?` +
      `accessToken=${accessToken}&` +
      `refreshToken=${refreshToken}`;
    
    res.redirect(redirectUrl);
  }
);
```

---

## 🔗 Account Linking

### **Scenario: User Signs Up with Email, Later Links Google**

```javascript
// User exists: { email: "john@gmail.com", provider: "local" }

// User clicks "Login with Google"
// Google returns: { email: "john@gmail.com", id: "123" }

// Strategy callback:
const email = profile.emails[0].value;  // "john@gmail.com"
const user = await User.findOne({ email });

if (user) {
  // User exists with same email
  // Link Google account
  user.provider = 'google';  // or keep 'local' and add 'linkedAccounts'
  user.providerId = profile.id;
  user.profilePicture = profile.photos[0].value;
  await user.save();
  
  // Now user can login with email/password OR Google
}
```

### **Better Approach: Multiple Providers**

```javascript
// User Model
const userSchema = new mongoose.Schema({
  email: String,
  password: String,  // For local auth
  
  linkedAccounts: [{
    provider: String,  // 'google', 'github', 'facebook'
    providerId: String,
    linkedAt: Date
  }]
});

// Strategy
if (user) {
  // Add to linked accounts
  if (!user.linkedAccounts.find(a => a.provider === 'google')) {
    user.linkedAccounts.push({
      provider: 'google',
      providerId: googleId,
      linkedAt: new Date()
    });
    await user.save();
  }
}
```

---

## 🔐 Security Considerations

### **1. State Parameter (CSRF Protection)**

```javascript
// Generate random state
const state = crypto.randomBytes(32).toString('hex');

// Store in session/Redis
await redis.set(`oauth_state:${state}`, userId, 'EX', 600);  // 10 min

// Add to OAuth URL
const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
  `client_id=${clientId}&` +
  `redirect_uri=${callbackUrl}&` +
  `state=${state}`;

// On callback, verify state matches
const returnedState = req.query.state;
const storedUserId = await redis.get(`oauth_state:${returnedState}`);

if (!storedUserId) {
  throw new Error('Invalid state - CSRF attack?');
}
```

**Why?**
- Prevents CSRF attacks
- Ensures callback comes from legitimate OAuth flow
- Industry best practice

---

### **2. Never Expose Client Secret**

```javascript
// ❌ BAD: Expose secret in frontend
const clientSecret = 'abc123';  // In frontend code

// ✅ GOOD: Keep secret on backend
// backend/.env
GOOGLE_CLIENT_SECRET=abc123

// Only backend knows secret
// Frontend never sees it
```

---

### **3. Validate Email from Provider**

```javascript
// Some providers don't verify emails
const email = profile.emails?.[0]?.value;
const emailVerified = profile.emails?.[0]?.verified;

if (!emailVerified) {
  // Send verification email even for OAuth users
  user.isVerified = false;
  const token = user.generateVerificationToken();
  await sendVerificationEmail(user, token);
}
```

---

## 🎓 Interview Questions

### **Q1: Explain the OAuth 2.0 authorization code flow**

**Answer:**
> "The flow has 6 steps:
1. User clicks 'Login with Google' → redirected to Google
2. User approves permissions on Google's page
3. Google redirects back with authorization CODE
4. Backend exchanges CODE for ACCESS TOKEN (server-to-server)
5. Backend uses ACCESS TOKEN to fetch user profile from Google
6. Backend creates/finds user, generates JWT tokens, returns to frontend

The authorization code is important because it's exchanged on the backend, keeping the client secret secure."

---

### **Q2: What's the difference between OAuth and OpenID Connect?**

**Answer:**
> "OAuth 2.0 is for authorization ('what can you access?'). OpenID Connect (OIDC) is built on top of OAuth for authentication ('who are you?'). OIDC adds an ID token (JWT) that contains user identity information. When you 'Login with Google,' you're actually using OpenID Connect, not pure OAuth."

---

### **Q3: How do you handle account linking with OAuth?**

**Answer:**
> "When a user signs in with Google, I check if an account with that email already exists. If yes, I link the Google account to the existing account by storing the Google ID. This allows users to login with either email/password OR Google. I store linked accounts in an array so users can have multiple OAuth providers linked (Google, GitHub, Facebook)."

---

### **Q4: What security measures are important for OAuth?**

**Answer:**
> "Key security measures:
1. **State parameter:** Random string to prevent CSRF
2. **HTTPS only:** OAuth must use HTTPS in production
3. **Validate redirect URI:** Whitelist allowed callback URLs
4. **Secure client secret:** Never expose in frontend code
5. **Short-lived codes:** Authorization codes expire quickly
6. **Verify email:** Don't automatically trust OAuth provider's email verification"

---

**🎉 Phase 3 Documentation Complete!**

