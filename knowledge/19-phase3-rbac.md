# 👑 Phase 3.3: Role-Based Access Control (RBAC)

> **Production-Ready Authorization System**
> Roles, Permissions, and Secure Access Control Patterns

**Last Updated:** Nov 29, 2025

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Roles vs Permissions](#roles-vs-permissions)
3. [Architecture & Design](#architecture--design)
4. [Implementation Step-by-Step](#implementation-step-by-step)
5. [Advanced Patterns](#advanced-patterns)
6. [Interview Questions](#interview-questions)

---

## 🎯 Overview

**RBAC** (Role-Based Access Control) restricts system access based on user roles. Instead of giving each user individual permissions, we assign roles (admin, moderator, user) that come with predefined permissions.

**What We're Building:**
- User roles (user, admin, moderator)
- Fine-grained permissions
- Middleware for route protection
- Admin dashboard
- Role management API

**Why RBAC?**
```
Without RBAC:
- Everyone can access everything ❌
- Or manually check permissions everywhere ❌
- Hard to manage as app grows ❌

With RBAC:
- Clear role definitions ✅
- Centralized permission logic ✅
- Scalable and maintainable ✅
```

---

## 🤔 Roles vs Permissions

### **Roles**

**Definition:** A collection of permissions assigned to users

```javascript
const ROLES = {
  USER: 'user',        // Regular user
  MODERATOR: 'moderator', // Can moderate content
  ADMIN: 'admin'       // Full access
};
```

**Example:**
```
User: John Doe
Role: moderator
Can do:
  - View posts ✅
  - Create posts ✅
  - Delete other users' posts ✅
  - Delete users ❌ (admin only)
```

---

### **Permissions**

**Definition:** Specific actions users can perform

```javascript
const PERMISSIONS = {
  // Posts
  'read:posts': 'View posts',
  'create:posts': 'Create posts',
  'update:posts': 'Edit posts',
  'delete:posts': 'Delete posts',
  'delete:any-post': 'Delete any user\'s post',
  
  // Users
  'read:users': 'View user list',
  'update:users': 'Edit users',
  'delete:users': 'Delete users',
  
  // Roles
  'manage:roles': 'Assign/remove roles',
  
  // Admin
  'access:admin-panel': 'Access admin dashboard',
  'view:analytics': 'View analytics',
  'view:logs': 'View audit logs'
};
```

---

### **Roles → Permissions Mapping**

```javascript
const ROLE_PERMISSIONS = {
  user: [
    'read:posts',
    'create:posts',
    'update:posts',  // Own posts only
    'delete:posts'   // Own posts only
  ],
  
  moderator: [
    'read:posts',
    'create:posts',
    'update:posts',
    'delete:posts',
    'delete:any-post',  // Can delete any post
    'read:users',
    'access:admin-panel'
  ],
  
  admin: [
    // All moderator permissions
    ...ROLE_PERMISSIONS.moderator,
    // Plus admin-only permissions
    'update:users',
    'delete:users',
    'manage:roles',
    'view:analytics',
    'view:logs'
  ]
};
```

**Hierarchy:**
```
admin > moderator > user

admin:
  - All permissions ✅

moderator:
  - Most permissions ✅
  - Cannot manage users ❌
  - Cannot assign roles ❌

user:
  - Basic permissions ✅
  - Own content only
```

---

## 🏗️ Architecture & Design

### **Complete RBAC Flow**

```
┌─────────────────────────────────────────────────────────────┐
│                    REQUEST FLOW                              │
└─────────────────────────────────────────────────────────────┘

User sends request:
DELETE /api/posts/123
Authorization: Bearer JWT_TOKEN
    ↓
Middleware 1: Authenticate (verify JWT)
    ↓
Extract user from token:
{
  userId: "abc123",
  email: "john@example.com",
  roles: ["moderator"]  ← User's roles
}
    ↓
Middleware 2: Authorize (check permissions)
    ↓
┌──────────────────────────────────────────────┐
│ Authorization Check                           │
│                                               │
│ Required: 'delete:any-post' permission        │
│                                               │
│ User roles: ["moderator"]                     │
│ ↓                                             │
│ Get moderator permissions:                    │
│ ["read:posts", "delete:any-post", ...]        │
│ ↓                                             │
│ Check if 'delete:any-post' in permissions     │
│ ✅ YES → Allow request                        │
└──────────────────────────────────────────────┘
    ↓
Controller: Delete post
    ↓
Response: { success: true }
```

---

### **Database Schema**

**User Model:**
```javascript
{
  _id: "abc123",
  name: "John Doe",
  email: "john@example.com",
  roles: ["moderator"],  // Array of roles
  
  // Optional: Custom permissions
  customPermissions: {
    granted: ["special:permission"],  // Extra permissions
    denied: ["delete:any-post"]       // Override role permissions
  },
  
  createdAt: "2025-01-01",
  updatedAt: "2025-11-29"
}
```

---

## 🛠️ Implementation Step-by-Step

### **Step 1: Define Roles & Permissions**

**File:** `backend/config/roles.js`

```javascript
/**
 * ═══════════════════════════════════════════════════════════
 * ROLE DEFINITIONS
 * ═══════════════════════════════════════════════════════════
 */

const ROLES = {
  USER: 'user',
  MODERATOR: 'moderator',
  ADMIN: 'admin'
};

/**
 * ═══════════════════════════════════════════════════════════
 * PERMISSION DEFINITIONS
 * ═══════════════════════════════════════════════════════════
 * 
 * Format: "action:resource"
 * 
 * Actions: read, create, update, delete, manage, access, view
 * Resources: posts, users, roles, logs, analytics, admin-panel
 */

const PERMISSIONS = {
  // ─────────────── Posts ───────────────
  READ_POSTS: 'read:posts',
  CREATE_POSTS: 'create:posts',
  UPDATE_OWN_POSTS: 'update:own-posts',
  UPDATE_ANY_POST: 'update:any-post',
  DELETE_OWN_POSTS: 'delete:own-posts',
  DELETE_ANY_POST: 'delete:any-post',
  
  // ─────────────── Users ───────────────
  READ_USERS: 'read:users',
  UPDATE_USERS: 'update:users',
  DELETE_USERS: 'delete:users',
  BAN_USERS: 'ban:users',
  
  // ─────────────── Roles ───────────────
  VIEW_ROLES: 'view:roles',
  ASSIGN_ROLES: 'assign:roles',
  MANAGE_ROLES: 'manage:roles',
  
  // ─────────────── Admin ───────────────
  ACCESS_ADMIN: 'access:admin-panel',
  VIEW_ANALYTICS: 'view:analytics',
  VIEW_LOGS: 'view:logs',
  MANAGE_SETTINGS: 'manage:settings'
};

/**
 * ═══════════════════════════════════════════════════════════
 * ROLE → PERMISSIONS MAPPING
 * ═══════════════════════════════════════════════════════════
 */

const ROLE_PERMISSIONS = {
  [ROLES.USER]: [
    PERMISSIONS.READ_POSTS,
    PERMISSIONS.CREATE_POSTS,
    PERMISSIONS.UPDATE_OWN_POSTS,
    PERMISSIONS.DELETE_OWN_POSTS
  ],
  
  [ROLES.MODERATOR]: [
    // All user permissions
    ...ROLE_PERMISSIONS[ROLES.USER],
    // Plus moderator permissions
    PERMISSIONS.UPDATE_ANY_POST,
    PERMISSIONS.DELETE_ANY_POST,
    PERMISSIONS.READ_USERS,
    PERMISSIONS.BAN_USERS,
    PERMISSIONS.ACCESS_ADMIN
  ],
  
  [ROLES.ADMIN]: [
    // All moderator permissions
    ...ROLE_PERMISSIONS[ROLES.MODERATOR],
    // Plus admin-only permissions
    PERMISSIONS.UPDATE_USERS,
    PERMISSIONS.DELETE_USERS,
    PERMISSIONS.VIEW_ROLES,
    PERMISSIONS.ASSIGN_ROLES,
    PERMISSIONS.MANAGE_ROLES,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.VIEW_LOGS,
    PERMISSIONS.MANAGE_SETTINGS
  ]
};

/**
 * ═══════════════════════════════════════════════════════════
 * HELPER FUNCTIONS
 * ═══════════════════════════════════════════════════════════
 */

/**
 * Get all permissions for a role
 */
const getRolePermissions = (role) => {
  return ROLE_PERMISSIONS[role] || [];
};

/**
 * Get all permissions for multiple roles
 */
const getPermissionsForRoles = (roles) => {
  if (!Array.isArray(roles)) roles = [roles];
  
  const permissions = new Set();
  
  roles.forEach(role => {
    const rolePerms = getRolePermissions(role);
    rolePerms.forEach(perm => permissions.add(perm));
  });
  
  return Array.from(permissions);
};

/**
 * Check if role has permission
 */
const roleHasPermission = (role, permission) => {
  const permissions = getRolePermissions(role);
  return permissions.includes(permission);
};

/**
 * Check if any of the roles have permission
 */
const hasPermission = (roles, permission) => {
  if (!Array.isArray(roles)) roles = [roles];
  
  return roles.some(role => roleHasPermission(role, permission));
};

module.exports = {
  ROLES,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  getRolePermissions,
  getPermissionsForRoles,
  roleHasPermission,
  hasPermission
};
```

---

### **Step 2: Update User Model**

**File:** `backend/models/User.js`

```javascript
const { ROLES } = require('../config/roles');

const userSchema = new mongoose.Schema({
  // ... existing fields ...
  
  // ═══════════════════════════════════════════════════════════
  // ROLES & PERMISSIONS
  // ═══════════════════════════════════════════════════════════
  
  roles: [{
    type: String,
    enum: Object.values(ROLES),  // ['user', 'moderator', 'admin']
    default: [ROLES.USER]
    /**
     * Why array?
     * ────────────────────────────────────────────────────────
     * - Users can have multiple roles
     * - Example: ['user', 'moderator']
     * - Flexible for complex systems
     * 
     * Common pattern:
     * - Single role systems: role: 'user'
     * - Multi-role systems: roles: ['user', 'moderator']
     */
  }],
  
  customPermissions: {
    /**
     * Optional: Override role permissions
     * ────────────────────────────────────────────────────────
     * Use cases:
     * - Grant special permission to specific user
     * - Revoke specific permission from role
     * 
     * Example:
     * User is 'moderator' but can't delete posts:
     * {
     *   denied: ['delete:any-post']
     * }
     * 
     * User is 'user' but can view analytics:
     * {
     *   granted: ['view:analytics']
     * }
     */
    granted: [{
      type: String
    }],
    denied: [{
      type: String
    }]
  }
});

// ─────────────────────────────────────────────────────────
// METHODS: Permission Checking
// ─────────────────────────────────────────────────────────

/**
 * Get all permissions for this user
 */
userSchema.methods.getPermissions = function() {
  const { getPermissionsForRoles } = require('../config/roles');
  
  // Get permissions from roles
  let permissions = new Set(getPermissionsForRoles(this.roles));
  
  // Add custom granted permissions
  if (this.customPermissions?.granted) {
    this.customPermissions.granted.forEach(perm => 
      permissions.add(perm)
    );
  }
  
  // Remove custom denied permissions
  if (this.customPermissions?.denied) {
    this.customPermissions.denied.forEach(perm => 
      permissions.delete(perm)
    );
  }
  
  return Array.from(permissions);
};

/**
 * Check if user has specific permission
 */
userSchema.methods.hasPermission = function(permission) {
  const permissions = this.getPermissions();
  return permissions.includes(permission);
};

/**
 * Check if user has any of the required permissions
 */
userSchema.methods.hasAnyPermission = function(requiredPermissions) {
  if (!Array.isArray(requiredPermissions)) {
    requiredPermissions = [requiredPermissions];
  }
  
  const userPermissions = this.getPermissions();
  return requiredPermissions.some(perm => 
    userPermissions.includes(perm)
  );
};

/**
 * Check if user has all required permissions
 */
userSchema.methods.hasAllPermissions = function(requiredPermissions) {
  if (!Array.isArray(requiredPermissions)) {
    requiredPermissions = [requiredPermissions];
  }
  
  const userPermissions = this.getPermissions();
  return requiredPermissions.every(perm => 
    userPermissions.includes(perm)
  );
};

/**
 * Check if user has specific role
 */
userSchema.methods.hasRole = function(role) {
  return this.roles.includes(role);
};

/**
 * Check if user has any of the required roles
 */
userSchema.methods.hasAnyRole = function(roles) {
  if (!Array.isArray(roles)) roles = [roles];
  return this.roles.some(role => roles.includes(role));
};

/**
 * Check if user is admin
 */
userSchema.methods.isAdmin = function() {
  return this.roles.includes(ROLES.ADMIN);
};

/**
 * Check if user is moderator or admin
 */
userSchema.methods.isModerator = function() {
  return this.hasAnyRole([ROLES.MODERATOR, ROLES.ADMIN]);
};
```

---

### **Step 3: Create RBAC Middleware**

**File:** `backend/middleware/rbac.js`

```javascript
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { PERMISSIONS, ROLES } = require('../config/roles');

/**
 * ═══════════════════════════════════════════════════════════
 * MIDDLEWARE: Authenticate (Extract user from JWT)
 * ═══════════════════════════════════════════════════════════
 */

const authenticate = async (req, res, next) => {
  try {
    // 1. Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided. Please login.'
      });
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    // 2. Verify token
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    
    // 3. Get user from database (with roles)
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // 4. Attach user to request
    req.user = user;
    next();
    
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired. Please login again.'
      });
    }
    
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

/**
 * ═══════════════════════════════════════════════════════════
 * MIDDLEWARE: Require Role
 * ═══════════════════════════════════════════════════════════
 * 
 * Usage:
 * router.get('/admin/users', 
 *   authenticate, 
 *   requireRole(['admin']), 
 *   getUsers
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
        message: `Access denied. Required role: ${roles.join(' or ')}`
      });
    }
    
    next();
  };
};

/**
 * ═══════════════════════════════════════════════════════════
 * MIDDLEWARE: Require Permission
 * ═══════════════════════════════════════════════════════════
 * 
 * Usage:
 * router.delete('/posts/:id', 
 *   authenticate, 
 *   requirePermission('delete:any-post'), 
 *   deletePost
 * );
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
        message: `Access denied. Required permission: ${permission.join(' or ')}`
      });
    }
    
    next();
  };
};

/**
 * ═══════════════════════════════════════════════════════════
 * MIDDLEWARE: Require Admin
 * ═══════════════════════════════════════════════════════════
 * 
 * Shorthand for requireRole(['admin'])
 */

const requireAdmin = () => {
  return requireRole([ROLES.ADMIN]);
};

/**
 * ═══════════════════════════════════════════════════════════
 * MIDDLEWARE: Check Resource Ownership
 * ═══════════════════════════════════════════════════════════
 * 
 * Allow if:
 * - User owns the resource, OR
 * - User has override permission
 * 
 * Usage:
 * router.put('/posts/:id', 
 *   authenticate, 
 *   checkOwnership('Post', 'update:any-post'), 
 *   updatePost
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
      
      // Get resource ID from params
      const resourceId = req.params.id;
      
      // Find resource
      const ResourceModel = require(`../models/${Model}`);
      const resource = await ResourceModel.findById(resourceId);
      
      if (!resource) {
        return res.status(404).json({
          success: false,
          message: `${Model} not found`
        });
      }
      
      // Check ownership
      const isOwner = resource.userId?.toString() === req.user._id.toString();
      
      // Check override permission (e.g., admin can edit any post)
      const hasOverride = overridePermission 
        ? req.user.hasPermission(overridePermission)
        : false;
      
      if (!isOwner && !hasOverride) {
        return res.status(403).json({
          success: false,
          message: 'You can only modify your own resources'
        });
      }
      
      // Attach resource to request (optional)
      req.resource = resource;
      next();
      
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error checking ownership'
      });
    }
  };
};

module.exports = {
  authenticate,
  requireRole,
  requirePermission,
  requireAdmin,
  checkOwnership
};
```

---

### **Step 4: Create Admin Routes**

**File:** `backend/routes/admin.js`

```javascript
const router = require('express').Router();
const User = require('../models/User');
const { authenticate, requireRole, requirePermission, requireAdmin } = require('../middleware/rbac');
const { ROLES, PERMISSIONS } = require('../config/roles');

/**
 * Apply authentication to all admin routes
 */
router.use(authenticate);

/**
 * ═══════════════════════════════════════════════════════════
 * GET /api/admin/users
 * ═══════════════════════════════════════════════════════════
 * Get all users (admin/moderator only)
 */

router.get('/users', 
  requireRole([ROLES.ADMIN, ROLES.MODERATOR]),
  async (req, res) => {
    try {
      const { page = 1, limit = 20, role, search } = req.query;
      
      // Build query
      const query = {};
      
      if (role) {
        query.roles = role;
      }
      
      if (search) {
        query.$or = [
          { name: new RegExp(search, 'i') },
          { email: new RegExp(search, 'i') }
        ];
      }
      
      // Pagination
      const skip = (page - 1) * limit;
      
      // Get users
      const users = await User.find(query)
        .select('-password -verificationToken -passwordResetToken')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 });
      
      // Get total count
      const total = await User.countDocuments(query);
      
      res.json({
        success: true,
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
      
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching users'
      });
    }
  }
);

/**
 * ═══════════════════════════════════════════════════════════
 * PUT /api/admin/users/:id/role
 * ═══════════════════════════════════════════════════════════
 * Assign role to user (admin only)
 */

router.put('/users/:id/role',
  requireAdmin(),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { role } = req.body;
      
      // Validate role
      if (!Object.values(ROLES).includes(role)) {
        return res.status(400).json({
          success: false,
          message: `Invalid role. Must be one of: ${Object.values(ROLES).join(', ')}`
        });
      }
      
      // Find user
      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      // Prevent self-role change
      if (user._id.toString() === req.user._id.toString()) {
        return res.status(400).json({
          success: false,
          message: 'You cannot change your own role'
        });
      }
      
      // Update role
      user.roles = [role];
      await user.save();
      
      res.json({
        success: true,
        message: `User role updated to ${role}`,
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
        message: 'Error updating user role'
      });
    }
  }
);

/**
 * ═══════════════════════════════════════════════════════════
 * DELETE /api/admin/users/:id
 * ═══════════════════════════════════════════════════════════
 * Delete user (admin only)
 */

router.delete('/users/:id',
  requirePermission(PERMISSIONS.DELETE_USERS),
  async (req, res) => {
    try {
      const { id } = req.params;
      
      // Find user
      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      // Prevent self-deletion
      if (user._id.toString() === req.user._id.toString()) {
        return res.status(400).json({
          success: false,
          message: 'You cannot delete yourself'
        });
      }
      
      // Delete user
      await user.remove();
      
      res.json({
        success: true,
        message: 'User deleted successfully'
      });
      
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error deleting user'
      });
    }
  }
);

module.exports = router;
```

---

### **Step 5: Usage Examples**

**Example 1: Protect Route by Role**
```javascript
// Only admins can access
router.get('/admin/dashboard',
  authenticate,
  requireRole(['admin']),
  (req, res) => {
    res.json({ message: 'Admin dashboard' });
  }
);

// Admins or moderators
router.get('/admin/posts',
  authenticate,
  requireRole(['admin', 'moderator']),
  getPosts
);
```

**Example 2: Protect Route by Permission**
```javascript
// Require specific permission
router.delete('/posts/:id',
  authenticate,
  requirePermission('delete:any-post'),
  deletePost
);

// Multiple permissions (user needs ANY)
router.post('/posts/:id/publish',
  authenticate,
  requirePermission(['update:any-post', 'manage:posts']),
  publishPost
);
```

**Example 3: Resource Ownership Check**
```javascript
// User can update own post OR admin can update any
router.put('/posts/:id',
  authenticate,
  checkOwnership('Post', 'update:any-post'),
  updatePost
);
```

**Example 4: Manual Permission Check in Controller**
```javascript
const deletePost = async (req, res) => {
  const post = await Post.findById(req.params.id);
  
  // Check if user owns post
  const isOwner = post.userId.toString() === req.user._id.toString();
  
  // Or has delete permission
  const canDelete = req.user.hasPermission('delete:any-post');
  
  if (!isOwner && !canDelete) {
    return res.status(403).json({
      message: 'You can only delete your own posts'
    });
  }
  
  await post.remove();
  res.json({ success: true });
};
```

---

## 🎓 Interview Questions

### **Q1: What's the difference between RBAC and ABAC?**

**Answer:**
> "RBAC (Role-Based Access Control) assigns permissions based on user roles. ABAC (Attribute-Based Access Control) uses attributes (user, resource, environment) for more fine-grained control.

**RBAC Example:**
- User has 'admin' role → Can delete users

**ABAC Example:**
- User can delete IF:
  - User is admin OR
  - User owns resource AND
  - Resource is not locked AND
  - Time is business hours

RBAC is simpler and sufficient for most applications. ABAC is more flexible but complex."

---

### **Q2: How do you implement a permission hierarchy?**

**Answer:**
> "I use permission inheritance where higher roles include all permissions of lower roles:

```javascript
ROLE_PERMISSIONS = {
  user: ['read:posts', 'create:posts'],
  moderator: [
    ...ROLE_PERMISSIONS.user,  // Inherit user permissions
    'delete:any-post'
  ],
  admin: [
    ...ROLE_PERMISSIONS.moderator,  // Inherit moderator
    'delete:users'
  ]
};
```

This ensures admins automatically get all moderator and user permissions."

---

### **Q3: Should you check permissions on frontend or backend?**

**Answer:**
> "**Both, but they serve different purposes:**

**Frontend (UX):**
```javascript
// Hide button if user can't delete
{user.hasPermission('delete:users') && (
  <button>Delete User</button>
)}
```
- Better user experience
- Prevents confusion
- NOT for security (can be bypassed)

**Backend (Security):**
```javascript
router.delete('/users/:id',
  requirePermission('delete:users'),
  deleteUser
);
```
- Actual security enforcement
- Cannot be bypassed
- **Always required**

**Rule: Never trust frontend. Always validate backend.**"

---

**Next:** [Phase 3.4: Token Refresh Rotation](./20-phase3-token-refresh.md)

