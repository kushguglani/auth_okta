const express = require('express');
const router = express.Router();

/**
 * Main Router
 * 
 * Combines all route modules:
 * - Auth routes (signup, login)
 * - User routes (future)
 * - Protected routes (future)
 */

// Import route modules
const authRoutes = require('./auth');

// Mount routes
router.use('/auth', authRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: 'Connected',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Root endpoint
router.get('/', (req, res) => {
  res.json({
    message: 'KTA Auth API',
    version: '1.0.0',
    endpoints: {
      rest: {
        health: '/api/health',
        auth: {
          signup: 'POST /api/auth/signup',
          login: 'POST /api/auth/login'
        }
      },
      graphql: {
        endpoint: 'POST /graphql',
        playground: 'GET /graphql (development only)'
      }
    }
  });
});

module.exports = router;

