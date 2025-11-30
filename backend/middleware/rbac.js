const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { ROLES, PERMISSIONS } = require('../config/roles');

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * RBAC MIDDLEWARE
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Provides authentication and authorization middleware
 * 
 * @file backend/middleware/rbac.js
 * @phase Phase 3.3 - RBAC
 * 
 * Middleware:
 * - authenticate: Verify JWT and attach user to request
 * - requireRole: Check if user has required role
 * - requirePermission: Check if user has required permission
 * - requireAdmin: Shorthand for admin-only routes
 * - checkOwnership: Verify user owns resource OR has override permission
 */

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MIDDLEWARE: AUTHENTICATE
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Verifies JWT token and attaches user to request
 * 
 * Flow:
 * 1. Extract token from Authorization header
 * 2. Verify JWT signature and expiration
 * 3. Get user from database
 * 4. Attach user to req.user
 * 
 * Usage:
 * router.get('/profile', authenticate, (req, res) => {
 *   res.json(req.user); // User is available!
 * });
 */

const authenticate = async (req, res, next) => {
  try {
    // ─────────────────────────────────────────────────────────
    // 1. Get token from header
    // ─────────────────────────────────────────────────────────
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided. Please login.'
      });
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    // ─────────────────────────────────────────────────────────
    // 2. Verify token
    // ─────────────────────────────────────────────────────────
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    
    /**
     * Decoded token contains:
     * {
     *   userId: "abc123",
     *   email: "user@example.com",
     *   roles: ["user"],
     *   type: "access",
     *   iat: ...,
     *   exp: ...
     * }
     */
    
    // ─────────────────────────────────────────────────────────
    // 3. Get user from database (with roles & permissions)
    // ─────────────────────────────────────────────────────────
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found. Please login again.'
      });
    }
    
    // ─────────────────────────────────────────────────────────
    // 4. Attach user to request
    // ─────────────────────────────────────────────────────────
    /**
     * req.user is now available in all subsequent middleware/routes
     * Contains full user document with methods:
     * - user.hasPermission('delete:users')
     * - user.hasRole('admin')
     * - user.isAdmin()
     */
    req.user = user;
    next();
    
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired. Please login again.',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MIDDLEWARE: REQUIRE ROLE
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Checks if user has one of the required roles
 * 
 * @param {Array|String} roles - Required role(s)
 * @returns {Function} - Middleware function
 * 
 * Usage:
 * // Only admins
 * router.get('/admin/users', 
 *   authenticate, 
 *   requireRole(['admin']), 
 *   getUsers
 * );
 * 
 * // Admins or moderators
 * router.delete('/posts/:id', 
 *   authenticate, 
 *   requireRole(['admin', 'moderator']), 
 *   deletePost
 * );
 */

const requireRole = (roles) => {
  // Accept single role or array
  if (!Array.isArray(roles)) roles = [roles];
  
  return (req, res, next) => {
    /**
     * Check user has required role
     * ────────────────────────────────────────────────────────
     * req.user is set by authenticate middleware
     * Must call authenticate BEFORE requireRole
     */
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    // Check if user has any of the required roles
    const hasRole = req.user.hasAnyRole(roles);
    
    if (!hasRole) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(' or ')}`,
        requiredRoles: roles,
        userRoles: req.user.roles
      });
    }
    
    next();
  };
};

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MIDDLEWARE: REQUIRE PERMISSION
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Checks if user has one of the required permissions
 * 
 * @param {Array|String} permission - Required permission(s)
 * @returns {Function} - Middleware function
 * 
 * Usage:
 * // Require specific permission
 * router.delete('/users/:id', 
 *   authenticate, 
 *   requirePermission('delete:users'), 
 *   deleteUser
 * );
 * 
 * // Require any one of multiple permissions
 * router.post('/posts/:id/publish', 
 *   authenticate, 
 *   requirePermission(['update:any-post', 'manage:posts']), 
 *   publishPost
 * );
 * 
 * Benefits over requireRole:
 * - More fine-grained control
 * - Easier to understand intent
 * - Can grant specific permissions to specific users
 */

const requirePermission = (permission) => {
  // Accept single permission or array
  if (!Array.isArray(permission)) permission = [permission];
  
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    // Check if user has any of the required permissions
    const hasPermission = req.user.hasAnyPermission(permission);
    
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required permission: ${permission.join(' or ')}`,
        requiredPermissions: permission,
        userPermissions: req.user.getPermissions()
      });
    }
    
    next();
  };
};

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MIDDLEWARE: REQUIRE ADMIN
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Shorthand for admin-only routes
 * 
 * @returns {Function} - Middleware function
 * 
 * Usage:
 * router.get('/admin/dashboard', 
 *   authenticate, 
 *   requireAdmin(), 
 *   getDashboard
 * );
 * 
 * Equivalent to: requireRole(['admin'])
 */

const requireAdmin = () => {
  return requireRole([ROLES.ADMIN]);
};

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MIDDLEWARE: CHECK OWNERSHIP
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Verifies user owns the resource OR has override permission
 * 
 * @param {String} Model - Model name (e.g., 'Post', 'Comment')
 * @param {String} overridePermission - Permission that bypasses ownership check
 * @returns {Function} - Middleware function
 * 
 * Flow:
 * 1. Get resource ID from req.params.id
 * 2. Find resource in database
 * 3. Check if user owns resource (userId matches)
 * 4. OR check if user has override permission
 * 5. Attach resource to req.resource (optional)
 * 
 * Usage:
 * // User can update own post OR admin can update any
 * router.put('/posts/:id', 
 *   authenticate, 
 *   checkOwnership('Post', 'update:any-post'), 
 *   updatePost
 * );
 * 
 * // User can delete own comment OR moderator can delete any
 * router.delete('/comments/:id',
 *   authenticate,
 *   checkOwnership('Comment', 'delete:any-comment'),
 *   deleteComment
 * );
 */

const checkOwnership = (Model, overridePermission) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }
      
      // ─────────────────────────────────────────────────────────
      // 1. Get resource ID from params
      // ─────────────────────────────────────────────────────────
      const resourceId = req.params.id;
      
      if (!resourceId) {
        return res.status(400).json({
          success: false,
          message: 'Resource ID required'
        });
      }
      
      // ─────────────────────────────────────────────────────────
      // 2. Find resource
      // ─────────────────────────────────────────────────────────
      const ResourceModel = require(`../models/${Model}`);
      const resource = await ResourceModel.findById(resourceId);
      
      if (!resource) {
        return res.status(404).json({
          success: false,
          message: `${Model} not found`
        });
      }
      
      // ─────────────────────────────────────────────────────────
      // 3. Check ownership
      // ─────────────────────────────────────────────────────────
      /**
       * Resource ownership check
       * ────────────────────────────────────────────────────────
       * Assumes resource has userId or user field
       * Adjust based on your schema
       */
      const resourceUserId = resource.userId || resource.user;
      const isOwner = resourceUserId?.toString() === req.user._id.toString();
      
      // ─────────────────────────────────────────────────────────
      // 4. Check override permission
      // ─────────────────────────────────────────────────────────
      /**
       * Override permission allows action without ownership
       * Example: Admin can delete any post
       */
      const hasOverride = overridePermission 
        ? req.user.hasPermission(overridePermission)
        : false;
      
      // ─────────────────────────────────────────────────────────
      // 5. Allow if owner OR has override
      // ─────────────────────────────────────────────────────────
      if (!isOwner && !hasOverride) {
        return res.status(403).json({
          success: false,
          message: 'You can only modify your own resources',
          isOwner,
          hasOverride
        });
      }
      
      // ─────────────────────────────────────────────────────────
      // 6. Attach resource to request (optional)
      // ─────────────────────────────────────────────────────────
      /**
       * Avoid re-fetching resource in controller
       * Available as req.resource
       */
      req.resource = resource;
      req.isOwner = isOwner;
      req.hasOverride = hasOverride;
      
      next();
      
    } catch (error) {
      console.error('Ownership check error:', error);
      res.status(500).json({
        success: false,
        message: 'Error checking ownership'
      });
    }
  };
};

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * OPTIONAL: MIDDLEWARE - REQUIRE EMAIL VERIFIED
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Ensures user has verified their email
 * 
 * Usage:
 * router.post('/posts', 
 *   authenticate, 
 *   requireVerified(), 
 *   createPost
 * );
 */

const requireVerified = () => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    if (!req.user.isVerified) {
      return res.status(403).json({
        success: false,
        message: 'Email verification required. Please verify your email to continue.',
        code: 'EMAIL_NOT_VERIFIED'
      });
    }
    
    next();
  };
};

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EXPORTS
 * ═══════════════════════════════════════════════════════════════════════════
 */

module.exports = {
  authenticate,
  requireRole,
  requirePermission,
  requireAdmin,
  checkOwnership,
  requireVerified
};

