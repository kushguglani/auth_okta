const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { AuthenticationError, UserInputError, ForbiddenError } = require('apollo-server-express');
const { getRedisClient } = require('../config/redis');

/**
 * GraphQL Resolvers
 *
 * Implement the logic for each query and mutation defined in the schema
 */

// Helper: Generate JWT tokens
const generateTokens = (user) => {
  const accessToken = jwt.sign(
    {
      userId: user._id,
      email: user.email,
      roles: user.roles
    },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m' }
  );

  const refreshToken = jwt.sign(
    {
      userId: user._id,
      type: 'refresh'
    },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
  );

  return { accessToken, refreshToken };
};

// Helper: Store refresh token in Redis
const storeRefreshToken = async (userId, refreshToken) => {
  try {
    const redis = getRedisClient();
    const key = `refresh_token:${userId}`;
    // Store for 7 days
    await redis.set(key, refreshToken, 'EX', 7 * 24 * 60 * 60);
  } catch (error) {
    console.error('Error storing refresh token:', error);
  }
};

// Helper: Check if user is authenticated
const requireAuth = (context) => {
  if (!context.user) {
    throw new AuthenticationError('You must be logged in');
  }
  return context.user;
};

// Helper: Check if user has specific role
const requireRole = (context, roles) => {
  const user = requireAuth(context);
  const hasRole = roles.some(role => user.roles.includes(role));

  if (!hasRole) {
    throw new ForbiddenError('Insufficient permissions');
  }

  return user;
};

const resolvers = {
  // Custom scalar for DateTime
  DateTime: {
    serialize: (value) => value.toISOString(),
    parseValue: (value) => new Date(value),
    parseLiteral: (ast) => new Date(ast.value)
  },

  // ========== QUERIES ==========
  Query: {
    // Health check
    health: () => 'GraphQL API is running! 🚀',

    // Get current user
    me: async (parent, args, context) => {
      const user = requireAuth(context);
      return await User.findById(user.userId);
    },

    // Get user by ID (admin only)
    user: async (parent, { id }, context) => {
      requireRole(context, ['admin']);
      const user = await User.findById(id);

      if (!user) {
        throw new UserInputError('User not found');
      }

      return user;
    },

    // Get all users (admin only)
    users: async (parent, { limit = 10, offset = 0 }, context) => {
      requireRole(context, ['admin']);
      return await User.find()
        .skip(offset)
        .limit(limit)
        .sort({ createdAt: -1 });
    }
  },

  // ========== MUTATIONS ==========
  Mutation: {
    // Signup
    signup: async (parent, { name, email, password }) => {
      try {
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
          throw new UserInputError('Email already registered');
        }

        // Validate password strength
        if (password.length < 8) {
          throw new UserInputError('Password must be at least 8 characters');
        }

        // Create user
        const user = await User.create({
          name,
          email,
          password // Will be hashed by pre-save hook
        });

        // Generate tokens
        const { accessToken, refreshToken } = generateTokens(user);

        // Store refresh token
        await storeRefreshToken(user._id, refreshToken);

        return {
          success: true,
          message: 'Account created successfully!',
          accessToken,
          refreshToken,
          user
        };
      } catch (error) {
        if (error instanceof UserInputError) {
          throw error;
        }
        throw new Error('Signup failed: ' + error.message);
      }
    },

    // Login
    login: async (parent, { email, password }) => {
      try {
        // Find user and verify credentials
        const user = await User.findByCredentials(email, password);

        // Generate tokens
        const { accessToken, refreshToken } = generateTokens(user);

        // Store refresh token
        await storeRefreshToken(user._id, refreshToken);

        return {
          success: true,
          message: 'Login successful!',
          accessToken,
          refreshToken,
          user
        };
      } catch (error) {
        throw new AuthenticationError(error.message);
      }
    },

    // Logout
    logout: async (parent, args, context) => {
      try {
        const user = requireAuth(context);

        // Remove refresh token from Redis
        const redis = getRedisClient();
        await redis.del(`refresh_token:${user.userId}`);

        return {
          success: true,
          message: 'Logged out successfully'
        };
      } catch (error) {
        throw new Error('Logout failed: ' + error.message);
      }
    },

    // Refresh access token
    refreshToken: async (parent, { refreshToken }) => {
      try {
        // Verify refresh token
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

        if (decoded.type !== 'refresh') {
          throw new AuthenticationError('Invalid token type');
        }

        // Check if token exists in Redis
        const redis = getRedisClient();
        const storedToken = await redis.get(`refresh_token:${decoded.userId}`);

        if (!storedToken || storedToken !== refreshToken) {
          throw new AuthenticationError('Invalid or expired refresh token');
        }

        // Get user
        const user = await User.findById(decoded.userId);
        if (!user) {
          throw new AuthenticationError('User not found');
        }

        // Generate new access token
        const accessToken = jwt.sign(
          {
            userId: user._id,
            email: user.email,
            roles: user.roles
          },
          process.env.JWT_ACCESS_SECRET,
          { expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m' }
        );

        return {
          success: true,
          accessToken
        };
      } catch (error) {
        throw new AuthenticationError('Token refresh failed: ' + error.message);
      }
    },

    // Update profile
    updateProfile: async (parent, { name, bio, profilePicture }, context) => {
      const user = requireAuth(context);

      const updates = {};
      if (name) updates.name = name;
      if (bio !== undefined) updates.bio = bio;
      if (profilePicture !== undefined) updates.profilePicture = profilePicture;

      const updatedUser = await User.findByIdAndUpdate(
        user.userId,
        updates,
        { new: true, runValidators: true }
      );

      if (!updatedUser) {
        throw new UserInputError('User not found');
      }

      return updatedUser;
    },

    // Change password
    changePassword: async (parent, { currentPassword, newPassword }, context) => {
      const user = requireAuth(context);

      // Get user with password
      const userDoc = await User.findById(user.userId).select('+password');

      if (!userDoc) {
        throw new UserInputError('User not found');
      }

      // Verify current password
      const isMatch = await userDoc.comparePassword(currentPassword);
      if (!isMatch) {
        throw new AuthenticationError('Current password is incorrect');
      }

      // Validate new password
      if (newPassword.length < 8) {
        throw new UserInputError('New password must be at least 8 characters');
      }

      // Update password (will be hashed by pre-save hook)
      userDoc.password = newPassword;
      await userDoc.save();

      return {
        success: true,
        message: 'Password changed successfully'
      };
    },

    // Delete account
    deleteAccount: async (parent, args, context) => {
      const user = requireAuth(context);

      // Delete user
      await User.findByIdAndDelete(user.userId);

      // Remove refresh token
      const redis = getRedisClient();
      await redis.del(`refresh_token:${user.userId}`);

      return {
        success: true,
        message: 'Account deleted successfully'
      };
    }
  }
};

module.exports = resolvers;

