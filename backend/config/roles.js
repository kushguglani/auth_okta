/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ROLE-BASED ACCESS CONTROL (RBAC) CONFIGURATION
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Defines roles, permissions, and their mappings
 *
 * @file backend/config/roles.js
 * @phase Phase 3.3 - RBAC
 *
 * Concepts:
 * - ROLE: Collection of permissions (user, moderator, admin)
 * - PERMISSION: Specific action user can perform (delete:users, view:analytics)
 * - HIERARCHY: admin > moderator > user
 */

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ROLE DEFINITIONS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Three-tier role system:
 * - USER: Regular users (default)
 * - MODERATOR: Content moderators
 * - ADMIN: Full access
 */

const ROLES = {
  USER: 'user',
  MODERATOR: 'moderator',
  ADMIN: 'admin'
};

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PERMISSION DEFINITIONS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Format: "action:resource"
 *
 * Actions: read, create, update, delete, manage, access, view
 * Resources: posts, users, roles, logs, analytics, admin-panel
 *
 * Examples:
 * - read:posts → View posts
 * - delete:users → Delete user accounts
 * - manage:roles → Assign/remove roles
 */

const PERMISSIONS = {
  // ─────────────── POSTS ───────────────
  READ_POSTS: 'read:posts',
  CREATE_POSTS: 'create:posts',
  UPDATE_OWN_POSTS: 'update:own-posts',
  UPDATE_ANY_POST: 'update:any-post',
  DELETE_OWN_POSTS: 'delete:own-posts',
  DELETE_ANY_POST: 'delete:any-post',

  // ─────────────── USERS ───────────────
  READ_USERS: 'read:users',
  UPDATE_USERS: 'update:users',
  DELETE_USERS: 'delete:users',
  BAN_USERS: 'ban:users',

  // ─────────────── ROLES ───────────────
  VIEW_ROLES: 'view:roles',
  ASSIGN_ROLES: 'assign:roles',
  MANAGE_ROLES: 'manage:roles',

  // ─────────────── ADMIN ───────────────
  ACCESS_ADMIN: 'access:admin-panel',
  VIEW_ANALYTICS: 'view:analytics',
  VIEW_LOGS: 'view:logs',
  MANAGE_SETTINGS: 'manage:settings'
};

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ROLE → PERMISSIONS MAPPING
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Permission inheritance:
 * - admin: All moderator permissions + admin-only permissions
 * - moderator: All user permissions + moderator permissions
 * - user: Basic permissions only
 */

const ROLE_PERMISSIONS = {
  /**
   * USER ROLE
   * ────────────────────────────────────────────────────────────────────────
   * Regular users can:
   * - Read posts
   * - Create their own posts
   * - Update/delete their own posts
   */
  [ROLES.USER]: [
    PERMISSIONS.READ_POSTS,
    PERMISSIONS.CREATE_POSTS,
    PERMISSIONS.UPDATE_OWN_POSTS,
    PERMISSIONS.DELETE_OWN_POSTS
  ],

  /**
   * MODERATOR ROLE
   * ────────────────────────────────────────────────────────────────────────
   * Moderators can:
   * - All user permissions (inherited)
   * - Update/delete ANY post (content moderation)
   * - View user list
   * - Ban users
   * - Access admin panel
   */
  [ROLES.MODERATOR]: [
    // Inherit all user permissions
    ...ROLE_PERMISSIONS[ROLES.USER],

    // Moderator-specific permissions
    PERMISSIONS.UPDATE_ANY_POST,
    PERMISSIONS.DELETE_ANY_POST,
    PERMISSIONS.READ_USERS,
    PERMISSIONS.BAN_USERS,
    PERMISSIONS.ACCESS_ADMIN
  ],

  /**
   * ADMIN ROLE
   * ────────────────────────────────────────────────────────────────────────
   * Admins can:
   * - All moderator permissions (inherited)
   * - Manage users (update, delete)
   * - Manage roles (assign, remove)
   * - View analytics
   * - View audit logs
   * - Manage settings
   */
  [ROLES.ADMIN]: [
    // Inherit all moderator permissions
    ...ROLE_PERMISSIONS[ROLES.MODERATOR],

    // Admin-only permissions
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
 * ═══════════════════════════════════════════════════════════════════════════
 * HELPER FUNCTIONS
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * Get all permissions for a specific role
 *
 * @param {String} role - Role name (user, moderator, admin)
 * @returns {Array} - Array of permission strings
 *
 * Example:
 * getRolePermissions('admin')
 * → ['read:posts', 'create:posts', ..., 'manage:settings']
 */
const getRolePermissions = (role) => {
  return ROLE_PERMISSIONS[role] || [];
};

/**
 * Get all permissions for multiple roles (union)
 *
 * @param {Array|String} roles - Single role or array of roles
 * @returns {Array} - Unique array of permissions
 *
 * Example:
 * getPermissionsForRoles(['user', 'moderator'])
 * → All unique permissions from both roles
 *
 * Use case:
 * - User has multiple roles
 * - Get combined permission set
 */
const getPermissionsForRoles = (roles) => {
  if (!Array.isArray(roles)) roles = [roles];

  // Use Set to avoid duplicates
  const permissions = new Set();

  roles.forEach(role => {
    const rolePerms = getRolePermissions(role);
    rolePerms.forEach(perm => permissions.add(perm));
  });

  return Array.from(permissions);
};

/**
 * Check if a specific role has a permission
 *
 * @param {String} role - Role to check
 * @param {String} permission - Permission to check
 * @returns {Boolean}
 *
 * Example:
 * roleHasPermission('admin', 'delete:users') → true
 * roleHasPermission('user', 'delete:users') → false
 */
const roleHasPermission = (role, permission) => {
  const permissions = getRolePermissions(role);
  return permissions.includes(permission);
};

/**
 * Check if any of the roles have a permission
 *
 * @param {Array|String} roles - Roles to check
 * @param {String} permission - Permission to check
 * @returns {Boolean}
 *
 * Example:
 * hasPermission(['user', 'moderator'], 'delete:any-post') → true
 * (moderator has this permission)
 */
const hasPermission = (roles, permission) => {
  if (!Array.isArray(roles)) roles = [roles];

  return roles.some(role => roleHasPermission(role, permission));
};

/**
 * Get role hierarchy level (for comparison)
 *
 * @param {String} role - Role name
 * @returns {Number} - Hierarchy level (higher = more powerful)
 *
 * Levels:
 * - user: 1
 * - moderator: 2
 * - admin: 3
 */
const getRoleLevel = (role) => {
  const levels = {
    [ROLES.USER]: 1,
    [ROLES.MODERATOR]: 2,
    [ROLES.ADMIN]: 3
  };

  return levels[role] || 0;
};

/**
 * Check if roleA has higher or equal hierarchy than roleB
 *
 * @param {String} roleA - First role
 * @param {String} roleB - Second role
 * @returns {Boolean}
 *
 * Example:
 * isHigherRole('admin', 'user') → true
 * isHigherRole('user', 'admin') → false
 * isHigherRole('moderator', 'moderator') → true (equal)
 */
const isHigherRole = (roleA, roleB) => {
  return getRoleLevel(roleA) >= getRoleLevel(roleB);
};

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EXPORTS
 * ═══════════════════════════════════════════════════════════════════════════
 */

module.exports = {
  ROLES,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  getRolePermissions,
  getPermissionsForRoles,
  roleHasPermission,
  hasPermission,
  getRoleLevel,
  isHigherRole
};

