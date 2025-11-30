const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const User = require('../models/User');

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PASSPORT.JS CONFIGURATION
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * OAuth 2.0 strategies for social authentication
 * 
 * Supported Providers:
 * - Google OAuth 2.0
 * - GitHub OAuth 2.0
 * 
 * @file backend/config/passport.js
 * @phase Phase 3.5 - OAuth/SSO
 * 
 * Setup Steps:
 * 1. Create OAuth apps on Google Cloud Console & GitHub
 * 2. Add credentials to .env
 * 3. Configure callback URLs
 * 4. Test OAuth flow
 */

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GOOGLE OAUTH STRATEGY
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Google OAuth 2.0 Setup:
 * ────────────────────────────────────────────────────────────────────────
 * 1. Go to: https://console.cloud.google.com/
 * 2. Create new project or select existing
 * 3. Enable "Google+ API"
 * 4. Create OAuth 2.0 credentials:
 *    - Application type: Web application
 *    - Authorized redirect URIs:
 *      http://localhost:5000/api/auth/google/callback (dev)
 *      https://yourapp.com/api/auth/google/callback (prod)
 * 5. Copy Client ID and Client Secret to .env
 * 
 * Profile Data Received:
 * ────────────────────────────────────────────────────────────────────────
 * - id: Google user ID (unique identifier)
 * - displayName: User's full name
 * - emails: Array of email objects
 * - photos: Array of profile picture URLs
 * - provider: 'google'
 */

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback',
    scope: ['profile', 'email']
  },
  async (accessToken, refreshToken, profile, done) => {
    /**
     * OAuth Callback Function
     * ────────────────────────────────────────────────────────────────────
     * Called after user approves permissions on Google
     * 
     * Parameters:
     * - accessToken: Token to call Google APIs
     * - refreshToken: Token to refresh access token
     * - profile: User profile from Google
     * - done: Callback function
     * 
     * Flow:
     * 1. Extract email and Google ID from profile
     * 2. Check if user exists with this Google ID
     * 3. If yes → Login user
     * 4. If no → Check if email exists (account linking)
     * 5. If email exists → Link Google to existing account
     * 6. If no → Create new user
     */
    
    try {
      const email = profile.emails[0].value;
      const googleId = profile.id;
      
      // ─────────────────────────────────────────────────────────
      // Case 1: User already logged in with Google
      // ─────────────────────────────────────────────────────────
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
        
        console.log(`✅ Google OAuth: Existing user logged in - ${email}`);
        return done(null, user);
      }
      
      // ─────────────────────────────────────────────────────────
      // Case 2: User exists with same email (link accounts)
      // ─────────────────────────────────────────────────────────
      /**
       * Account Linking:
       * ────────────────────────────────────────────────────────
       * User signed up with email/password
       * Now logging in with Google (same email)
       * → Link Google account to existing account
       */
      user = await User.findOne({ email });
      
      if (user) {
        // Link Google account
        user.provider = 'google';
        user.providerId = googleId;
        user.isVerified = true; // Email verified by Google
        
        if (profile.photos && profile.photos[0]) {
          user.profilePicture = profile.photos[0].value;
        }
        
        await user.save();
        
        console.log(`✅ Google OAuth: Linked to existing account - ${email}`);
        return done(null, user);
      }
      
      // ─────────────────────────────────────────────────────────
      // Case 3: New user - Create account
      // ─────────────────────────────────────────────────────────
      user = await User.create({
        name: profile.displayName,
        email,
        provider: 'google',
        providerId: googleId,
        profilePicture: profile.photos?.[0]?.value || '',
        isVerified: true, // Email already verified by Google
        roles: ['user']
      });
      
      console.log(`✅ Google OAuth: New user created - ${email}`);
      return done(null, user);
      
    } catch (error) {
      console.error('❌ Google OAuth error:', error);
      return done(error, null);
    }
  }
));

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GITHUB OAUTH STRATEGY
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * GitHub OAuth Setup:
 * ────────────────────────────────────────────────────────────────────────
 * 1. Go to: GitHub Settings → Developer Settings → OAuth Apps
 * 2. Create new OAuth App
 * 3. Fill in:
 *    - Application name: Your App Name
 *    - Homepage URL: http://localhost:3000 (dev) or https://yourapp.com
 *    - Authorization callback URL:
 *      http://localhost:5000/api/auth/github/callback (dev)
 *      https://yourapp.com/api/auth/github/callback (prod)
 * 4. Copy Client ID and Client Secret to .env
 * 
 * Profile Data Received:
 * ────────────────────────────────────────────────────────────────────────
 * - id: GitHub user ID
 * - username: GitHub username
 * - displayName: User's display name
 * - emails: Array of email objects
 * - photos: Array of avatar URLs
 * - provider: 'github'
 */

passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: process.env.GITHUB_CALLBACK_URL || 'http://localhost:5000/api/auth/github/callback',
    scope: ['user:email']
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      /**
       * GitHub Email Handling
       * ────────────────────────────────────────────────────────────────────
       * GitHub can have multiple emails
       * We need the primary/verified email
       */
      const email = profile.emails?.[0]?.value;
      
      if (!email) {
        return done(new Error('No email from GitHub. Please make your email public in GitHub settings.'), null);
      }
      
      const githubId = profile.id;
      
      // ─────────────────────────────────────────────────────────
      // Case 1: User already logged in with GitHub
      // ─────────────────────────────────────────────────────────
      let user = await User.findOne({
        provider: 'github',
        providerId: githubId
      });
      
      if (user) {
        // Update profile picture if changed
        if (profile.photos && profile.photos[0]) {
          user.profilePicture = profile.photos[0].value;
          await user.save();
        }
        
        console.log(`✅ GitHub OAuth: Existing user logged in - ${email}`);
        return done(null, user);
      }
      
      // ─────────────────────────────────────────────────────────
      // Case 2: User exists with same email (link accounts)
      // ─────────────────────────────────────────────────────────
      user = await User.findOne({ email });
      
      if (user) {
        // Link GitHub account
        user.provider = 'github';
        user.providerId = githubId;
        user.isVerified = true; // Email verified by GitHub
        user.profilePicture = profile.photos?.[0]?.value || user.profilePicture;
        await user.save();
        
        console.log(`✅ GitHub OAuth: Linked to existing account - ${email}`);
        return done(null, user);
      }
      
      // ─────────────────────────────────────────────────────────
      // Case 3: New user - Create account
      // ─────────────────────────────────────────────────────────
      user = await User.create({
        name: profile.displayName || profile.username,
        email,
        provider: 'github',
        providerId: githubId,
        profilePicture: profile.photos?.[0]?.value || '',
        isVerified: true, // Email verified by GitHub
        roles: ['user']
      });
      
      console.log(`✅ GitHub OAuth: New user created - ${email}`);
      return done(null, user);
      
    } catch (error) {
      console.error('❌ GitHub OAuth error:', error);
      return done(error, null);
    }
  }
));

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SERIALIZE/DESERIALIZE USER
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Session-based authentication (optional)
 * ────────────────────────────────────────────────────────────────────────
 * We're using JWT, so we don't need sessions
 * But Passport requires these functions
 * 
 * If you want to use sessions instead of JWT:
 * 1. Install express-session
 * 2. Configure session middleware
 * 3. Use these serialize/deserialize functions
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

