const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authenticate, requireRole, requirePermission, requireAdmin } = require('../middleware/rbac');
const { ROLES, PERMISSIONS } = require('../config/roles');

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ADMIN ROUTES
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Admin panel routes for user management
 * 
 * All routes require authentication + admin/moderator role
 * 
 * Endpoints:
 * - GET    /users                  - List all users (paginated)
 * - GET    /users/:id              - Get single user
 * - PUT    /users/:id/role         - Update user role
 * - DELETE /users/:id              - Delete user
 * - GET    /stats                  - Get system statistics
 * 
 * @file backend/routes/admin.js
 * @phase Phase 3.3 - RBAC
 */

/**
 * Apply authentication to all admin routes
 * ────────────────────────────────────────────────────────────────────────
 * All routes below require valid JWT token
 */
router.use(authenticate);

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GET /api/admin/users
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Get all users with pagination, search, and filters
 * 
 * @access Admin, Moderator
 * @query page - Page number (default: 1)
 * @query limit - Items per page (default: 20)
 * @query search - Search by name or email
 * @query role - Filter by role
 * @query verified - Filter by verified status
 */

router.get('/users', 
  requireRole([ROLES.ADMIN, ROLES.MODERATOR]),
  async (req, res) => {
    try {
      const { 
        page = 1, 
        limit = 20, 
        search, 
        role, 
        verified 
      } = req.query;
      
      // ─────────────────────────────────────────────────────────
      // 1. Build Query
      // ─────────────────────────────────────────────────────────
      const query = {};
      
      // Filter by role
      if (role) {
        query.roles = role;
      }
      
      // Filter by verified status
      if (verified !== undefined) {
        query.isVerified = verified === 'true';
      }
      
      // Search by name or email
      if (search) {
        query.$or = [
          { name: new RegExp(search, 'i') },
          { email: new RegExp(search, 'i') }
        ];
      }
      
      // ─────────────────────────────────────────────────────────
      // 2. Calculate Pagination
      // ─────────────────────────────────────────────────────────
      const skip = (page - 1) * limit;
      
      // ─────────────────────────────────────────────────────────
      // 3. Get Users
      // ─────────────────────────────────────────────────────────
      const users = await User.find(query)
        .select('-password -verificationToken -resetPasswordToken')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 });
      
      // ─────────────────────────────────────────────────────────
      // 4. Get Total Count
      // ─────────────────────────────────────────────────────────
      const total = await User.countDocuments(query);
      
      // ─────────────────────────────────────────────────────────
      // 5. Return Response
      // ─────────────────────────────────────────────────────────
      res.json({
        success: true,
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
          hasMore: skip + users.length < total
        }
      });
      
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching users'
      });
    }
  }
);

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GET /api/admin/users/:id
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Get single user details
 * 
 * @access Admin, Moderator
 */

router.get('/users/:id',
  requireRole([ROLES.ADMIN, ROLES.MODERATOR]),
  async (req, res) => {
    try {
      const { id } = req.params;
      
      const user = await User.findById(id)
        .select('-password -verificationToken -resetPasswordToken');
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      res.json({
        success: true,
        user
      });
      
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching user'
      });
    }
  }
);

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PUT /api/admin/users/:id/role
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Update user role
 * 
 * @access Admin only
 * @body role - New role (user, moderator, admin)
 */

router.put('/users/:id/role',
  requireAdmin(),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { role } = req.body;
      
      // ─────────────────────────────────────────────────────────
      // 1. Validate Role
      // ─────────────────────────────────────────────────────────
      if (!Object.values(ROLES).includes(role)) {
        return res.status(400).json({
          success: false,
          message: `Invalid role. Must be one of: ${Object.values(ROLES).join(', ')}`
        });
      }
      
      // ─────────────────────────────────────────────────────────
      // 2. Find User
      // ─────────────────────────────────────────────────────────
      const user = await User.findById(id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      // ─────────────────────────────────────────────────────────
      // 3. Prevent Self-Role Change
      // ─────────────────────────────────────────────────────────
      /**
       * Security: Admin cannot change their own role
       * ────────────────────────────────────────────────────────
       * Prevents accidental lockout
       * Admin must have another admin change their role
       */
      if (user._id.toString() === req.user._id.toString()) {
        return res.status(400).json({
          success: false,
          message: 'You cannot change your own role. Ask another admin.'
        });
      }
      
      // ─────────────────────────────────────────────────────────
      // 4. Update Role
      // ─────────────────────────────────────────────────────────
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
      console.error('Update role error:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating user role'
      });
    }
  }
);

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DELETE /api/admin/users/:id
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Delete user account
 * 
 * @access Admin only (requires delete:users permission)
 */

router.delete('/users/:id',
  requirePermission(PERMISSIONS.DELETE_USERS),
  async (req, res) => {
    try {
      const { id } = req.params;
      
      // ─────────────────────────────────────────────────────────
      // 1. Find User
      // ─────────────────────────────────────────────────────────
      const user = await User.findById(id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      // ─────────────────────────────────────────────────────────
      // 2. Prevent Self-Deletion
      // ─────────────────────────────────────────────────────────
      if (user._id.toString() === req.user._id.toString()) {
        return res.status(400).json({
          success: false,
          message: 'You cannot delete yourself'
        });
      }
      
      // ─────────────────────────────────────────────────────────
      // 3. Prevent Deleting Higher Role
      // ─────────────────────────────────────────────────────────
      /**
       * Security: User cannot delete higher role
       * ────────────────────────────────────────────────────────
       * Moderator cannot delete admin
       * Only admin can delete admin
       */
      const { getRoleLevel } = require('../config/roles');
      const targetRoleLevel = Math.max(...user.roles.map(r => getRoleLevel(r)));
      const currentRoleLevel = Math.max(...req.user.roles.map(r => getRoleLevel(r)));
      
      if (targetRoleLevel > currentRoleLevel) {
        return res.status(403).json({
          success: false,
          message: 'You cannot delete a user with higher role than yours'
        });
      }
      
      // ─────────────────────────────────────────────────────────
      // 4. Delete User
      // ─────────────────────────────────────────────────────────
      await user.deleteOne();
      
      // TODO: Also delete user's related data (posts, comments, etc.)
      
      res.json({
        success: true,
        message: 'User deleted successfully'
      });
      
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting user'
      });
    }
  }
);

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GET /api/admin/stats
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Get system statistics
 * 
 * @access Admin, Moderator
 */

router.get('/stats',
  requireRole([ROLES.ADMIN, ROLES.MODERATOR]),
  async (req, res) => {
    try {
      // ─────────────────────────────────────────────────────────
      // 1. Get User Statistics
      // ─────────────────────────────────────────────────────────
      const totalUsers = await User.countDocuments();
      const verifiedUsers = await User.countDocuments({ isVerified: true });
      const unverifiedUsers = await User.countDocuments({ isVerified: false });
      
      // ─────────────────────────────────────────────────────────
      // 2. Get Role Distribution
      // ─────────────────────────────────────────────────────────
      const adminCount = await User.countDocuments({ roles: ROLES.ADMIN });
      const moderatorCount = await User.countDocuments({ roles: ROLES.MODERATOR });
      const userCount = await User.countDocuments({ roles: ROLES.USER });
      
      // ─────────────────────────────────────────────────────────
      // 3. Get Recent Signups (last 7 days)
      // ─────────────────────────────────────────────────────────
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const recentSignups = await User.countDocuments({
        createdAt: { $gte: sevenDaysAgo }
      });
      
      // ─────────────────────────────────────────────────────────
      // 4. Get Provider Distribution
      // ─────────────────────────────────────────────────────────
      const localUsers = await User.countDocuments({ provider: 'local' });
      const googleUsers = await User.countDocuments({ provider: 'google' });
      const githubUsers = await User.countDocuments({ provider: 'github' });
      
      res.json({
        success: true,
        stats: {
          users: {
            total: totalUsers,
            verified: verifiedUsers,
            unverified: unverifiedUsers,
            recentSignups
          },
          roles: {
            admin: adminCount,
            moderator: moderatorCount,
            user: userCount
          },
          providers: {
            local: localUsers,
            google: googleUsers,
            github: githubUsers
          }
        }
      });
      
    } catch (error) {
      console.error('Get stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching statistics'
      });
    }
  }
);

module.exports = router;

