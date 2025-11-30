const express = require('express');
const router = express.Router();
const passport = require('../config/passport');
const { generateAccessToken, generateRefreshToken } = require('../utils/tokens');

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * OAUTH ROUTES
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Social authentication endpoints using Passport.js
 * 
 * Supported Providers:
 * - Google OAuth 2.0
 * - GitHub OAuth 2.0
 * 
 * Flow:
 * 1. User clicks "Login with Google/GitHub" on frontend
 * 2. Frontend redirects to /api/auth/google or /api/auth/github
 * 3. Backend redirects to provider (Google/GitHub)
 * 4. User approves on provider's page
 * 5. Provider redirects to /callback with authorization code
 * 6. Backend exchanges code for user profile
 * 7. Backend creates/finds user
 * 8. Backend generates JWT tokens
 * 9. Backend redirects to frontend with tokens
 * 10. Frontend stores tokens and redirects to dashboard
 * 
 * @file backend/routes/oauth.js
 * @phase Phase 3.5 - OAuth/SSO
 */

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GOOGLE OAUTH ROUTES
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * GET /api/auth/google
 * ────────────────────────────────────────────────────────────────────────
 * Initiate Google OAuth flow
 * 
 * @access Public
 * 
 * When user clicks "Login with Google":
 * 1. Frontend: window.location.href = '/api/auth/google'
 * 2. Backend: Redirect to Google OAuth page
 * 3. User: Sees Google permission screen
 */

router.get('/google', 
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false // We're using JWT, not sessions
  })
);

/**
 * GET /api/auth/google/callback
 * ────────────────────────────────────────────────────────────────────────
 * Google OAuth callback
 * 
 * @access Public
 * 
 * Google redirects here after user approves:
 * 1. Google: Redirects with authorization code
 * 2. Passport: Exchanges code for access token
 * 3. Passport: Gets user profile from Google
 * 4. Strategy: Creates/finds user in database
 * 5. This handler: Generates JWT tokens
 * 6. Backend: Redirects to frontend with tokens
 */

router.get('/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=oauth_failed`
  }),
  async (req, res) => {
    try {
      /**
       * req.user is populated by Passport strategy
       * ────────────────────────────────────────────────────────
       * Contains user document from database
       * (created/found in Google strategy callback)
       */
      const user = req.user;
      
      // ─────────────────────────────────────────────────────────
      // Generate JWT Tokens
      // ─────────────────────────────────────────────────────────
      const accessToken = generateAccessToken(user);
      const refreshToken = await generateRefreshToken(user, {
        userAgent: req.headers['user-agent'],
        ip: req.ip
      });
      
      // ─────────────────────────────────────────────────────────
      // Redirect to Frontend with Tokens
      // ─────────────────────────────────────────────────────────
      /**
       * Pass tokens via URL query parameters
       * ────────────────────────────────────────────────────────
       * Frontend extracts tokens and stores them
       * 
       * Security Note:
       * - Tokens in URL are visible in browser history
       * - Alternative: Use POST message or httpOnly cookies
       * - For production, consider more secure method
       * 
       * Better Alternative (Phase 4):
       * - Store refreshToken in httpOnly cookie
       * - Only pass accessToken in URL
       */
      const redirectUrl = `${process.env.FRONTEND_URL}/auth/callback?` +
        `accessToken=${accessToken}&` +
        `refreshToken=${refreshToken}`;
      
      console.log(`✅ Google OAuth successful: Redirecting ${user.email} to frontend`);
      res.redirect(redirectUrl);
      
    } catch (error) {
      console.error('❌ OAuth callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
    }
  }
);

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GITHUB OAUTH ROUTES
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * GET /api/auth/github
 * ────────────────────────────────────────────────────────────────────────
 * Initiate GitHub OAuth flow
 * 
 * @access Public
 */

router.get('/github',
  passport.authenticate('github', {
    scope: ['user:email'],
    session: false
  })
);

/**
 * GET /api/auth/github/callback
 * ────────────────────────────────────────────────────────────────────────
 * GitHub OAuth callback
 * 
 * @access Public
 */

router.get('/github/callback',
  passport.authenticate('github', {
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=oauth_failed`
  }),
  async (req, res) => {
    try {
      const user = req.user;
      
      // Generate tokens
      const accessToken = generateAccessToken(user);
      const refreshToken = await generateRefreshToken(user, {
        userAgent: req.headers['user-agent'],
        ip: req.ip
      });
      
      // Redirect to frontend with tokens
      const redirectUrl = `${process.env.FRONTEND_URL}/auth/callback?` +
        `accessToken=${accessToken}&` +
        `refreshToken=${refreshToken}`;
      
      console.log(`✅ GitHub OAuth successful: Redirecting ${user.email} to frontend`);
      res.redirect(redirectUrl);
      
    } catch (error) {
      console.error('❌ OAuth callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
    }
  }
);

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FUTURE: Additional OAuth Providers
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * To add more providers:
 * 
 * 1. Install strategy:
 *    bun add passport-facebook
 *    bun add passport-microsoft
 * 
 * 2. Configure in passport.js:
 *    passport.use(new FacebookStrategy({ ... }))
 * 
 * 3. Add routes here:
 *    router.get('/facebook', passport.authenticate('facebook'))
 *    router.get('/facebook/callback', ...)
 * 
 * 4. Update User model:
 *    provider enum: ['local', 'google', 'github', 'facebook', 'microsoft']
 */

module.exports = router;

