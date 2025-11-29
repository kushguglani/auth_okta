/**
 * ════════════════════════════════════════════════════════════════════════════
 * KTA Authentication Server
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Main server file - simplified and organized
 *
 * Structure:
 * 1. Dependencies & Configuration
 * 2. Middleware Setup
 * 3. Routes
 * 4. Error Handling
 * 5. Server Initialization
 *
 * Related files:
 * - /config/database.js       - MongoDB connection
 * - /config/redis.js          - Redis connection
 * - /graphql/apolloServer.js  - GraphQL server setup
 * - /routes/index.js          - REST API routes
 * - /routes/auth.js           - Authentication routes
 */

// ═══════════════════════════════════════════════════════════════════════════
// 📦 DEPENDENCIES
// ═══════════════════════════════════════════════════════════════════════════
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

// ═══════════════════════════════════════════════════════════════════════════
// ⚙️  IMPORT CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════
const connectDB = require('./config/database');
const { connectRedis } = require('./config/redis');
const { startApolloServer } = require('./graphql/apolloServer');
const { setupErrorHandlers } = require('./config/errorHandlers');

// ═══════════════════════════════════════════════════════════════════════════
// 📍 IMPORT ROUTES
// ═══════════════════════════════════════════════════════════════════════════
const apiRoutes = require('./routes/index');

// ═══════════════════════════════════════════════════════════════════════════
// 🚀 EXPRESS APP INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════
const app = express();
const PORT = process.env.PORT || 5000;

// ═══════════════════════════════════════════════════════════════════════════
// 🛡️  MIDDLEWARE SETUP
// ═══════════════════════════════════════════════════════════════════════════

// Security Headers (Helmet)
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
  crossOriginEmbedderPolicy: false
}));

// CORS - Allow cross-origin requests from frontend
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Body Parsers - Parse JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request Logging (Development only)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// 📡 API ROUTES
// ═══════════════════════════════════════════════════════════════════════════

// Welcome route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to KTA Auth API! 🚀',
    version: '1.0.0',
    documentation: {
      rest: '/api',
      graphql: '/graphql'
    }
  });
});

// Mount API routes under /api prefix
// Routes defined in /routes/index.js
app.use('/api', apiRoutes);

// ═══════════════════════════════════════════════════════════════════════════
// 🚀 SERVER INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════

const startServer = async () => {
  try {
    console.log('🔧 Starting server initialization...\n');

    // Step 1: Connect to MongoDB
    await connectDB();

    // Step 2: Connect to Redis (or use in-memory fallback)
    await connectRedis();

    // Step 3: Start Apollo GraphQL Server
    await startApolloServer(app, PORT);

    // ═══════════════════════════════════════════════════════════════════════════
    //  ERROR HANDLING (MUST BE AFTER APOLLO SERVER)
    // ═══════════════════════════════════════════════════════════════════════════

    // 404 Handler - Must be after all routes
    app.use((req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Cannot ${req.method} ${req.path}`,
        suggestion: 'Check the API documentation for available endpoints'
      });
    });

    // Global Error Handler
    app.use((err, req, res, next) => {
      console.error('Error:', err);
      res.status(err.status || 500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'production'
          ? 'Something went wrong'
          : err.message
      });
    });

    // Step 4: Start Express HTTP Server
    app.listen(PORT, () => {
      console.log('\n' + '='.repeat(50));
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 REST API: http://localhost:${PORT}/api`);
      console.log(`🎮 GraphQL: http://localhost:${PORT}/graphql`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('='.repeat(50) + '\n');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// 🔄 SETUP GLOBAL ERROR HANDLERS
// ═══════════════════════════════════════════════════════════════════════════
setupErrorHandlers();

// ═══════════════════════════════════════════════════════════════════════════
// ▶️  START THE SERVER
// ═══════════════════════════════════════════════════════════════════════════
startServer();

