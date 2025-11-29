const { ApolloServer } = require('apollo-server-express');
const jwt = require('jsonwebtoken');

const typeDefs = require('./typeDefs');
const resolvers = require('./resolvers');

/**
 * Apollo Server Configuration
 *
 * Sets up GraphQL server with:
 * - Schema (typeDefs)
 * - Resolvers
 * - Context (authentication)
 * - Error formatting
 * - GraphQL Playground
 */

const createApolloServer = () => {
  return new ApolloServer({
    typeDefs,
    resolvers,

    // Context: Runs on every request
    // Makes authenticated user available to all resolvers
    context: ({ req }) => {
      // Extract JWT token from Authorization header
      const token = req.headers.authorization || '';

      // Verify and decode token
      let user = null;
      if (token) {
        try {
          const decoded = jwt.verify(
            token.replace('Bearer ', ''),
            process.env.JWT_ACCESS_SECRET
          );
          user = decoded; // { userId, email, roles }
        } catch (err) {
          // Invalid token - user remains null
          console.log('Invalid token:', err.message);
        }
      }

      // Return context object (available in all resolvers via context parameter)
      return {
        user,  // Authenticated user or null
        req    // Express request object
      };
    },

    // Custom error formatting
    formatError: (err) => {
      console.error('GraphQL Error:', err.message);

      return {
        message: err.message,
        code: err.extensions?.code || 'INTERNAL_SERVER_ERROR',
        // Include stack trace in development only
        ...(process.env.NODE_ENV !== 'production' && {
          stack: err.extensions?.exception?.stacktrace
        })
      };
    },

    // GraphQL Playground (disable in production)
    playground: process.env.NODE_ENV !== 'production',
    introspection: process.env.NODE_ENV !== 'production'
  });
};

/**
 * Start Apollo Server and apply middleware to Express app
 *
 * @param {Object} app - Express application instance
 * @param {Number} PORT - Server port number
 */
const startApolloServer = async (app, PORT) => {
  try {
    // Create Apollo Server instance
    const server = createApolloServer();

    // Start Apollo Server (required in Apollo Server 3+)
    await server.start();

    // Apply Apollo middleware to Express app
    server.applyMiddleware({
      app,
      path: '/graphql',
      cors: false // CORS already handled by Express
    });

    console.log(`🎮 GraphQL Playground: http://localhost:${PORT}${server.graphqlPath}`);

    return server;
  } catch (error) {
    console.error('❌ Failed to start Apollo Server:', error);
    throw error;
  }
};

module.exports = { createApolloServer, startApolloServer };

