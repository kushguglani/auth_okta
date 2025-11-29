// ═══════════════════════════════════════════════════════════════════════════════
// 🔴 REDIS CONNECTION CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════
// Redis = Remote Dictionary Server (In-Memory Data Store)
//
// 🎯 PURPOSE: Super-fast temporary data storage for authentication
//
// 📊 WHAT WE USE IT FOR:
// ────────────────────────────────────────────────────────────────────────────
// 1. Token Blacklist      → Invalidate JWT tokens on logout
// 2. Refresh Tokens       → Store valid refresh tokens
// 3. Rate Limiting        → Track login attempts, prevent brute force
// 4. Session Management   → Store active user sessions
// 5. OTP/Verification     → Store temporary verification codes
// 6. Caching              → Cache API responses, reduce DB load
//
// ⚡ WHY REDIS?
// ────────────────────────────────────────────────────────────────────────────
// Speed:        0.1ms response time (MongoDB = 10ms, 100x slower!)
// Auto-Expire:  Data automatically deleted after TTL (Time To Live)
// Scalability:  Shared across multiple servers
// Memory:       All data in RAM = ultra-fast access
//
// 🔄 IN-MEMORY FALLBACK (Development Only)
// ────────────────────────────────────────────────────────────────────────────
// When Redis is not available, we use JavaScript Map as a simple replacement
// Good for: Development, testing, learning
// Bad for:  Production, multiple servers, data persistence
// ═══════════════════════════════════════════════════════════════════════════════

const redis = require('redis');

// ───────────────────────────────────────────────────────────────────────────────
// 📦 REDIS CLIENT INSTANCE (Singleton Pattern)
// ───────────────────────────────────────────────────────────────────────────────
// We use a single Redis connection shared across the entire application
// This prevents creating multiple connections and exhausting resources
let redisClient = null;

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🚀 CONNECT TO REDIS (or fallback to in-memory)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * THREE SCENARIOS:
 * ────────────────────────────────────────────────────────────────────────────
 * 1. Production with Redis:      Connect to real Redis server
 * 2. Development without Redis:  Use in-memory Map (JavaScript)
 * 3. Connection Failed:          Automatic fallback to in-memory
 *
 * ENVIRONMENT VARIABLES NEEDED:
 * ────────────────────────────────────────────────────────────────────────────
 * NODE_ENV=production           → Tells us it's production
 * REDIS_URL=redis://localhost:6379   → Redis server location
 * REDIS_PASSWORD=your-password  → Optional password for Redis
 *
 * @returns {Promise<Object>} Redis client or in-memory fallback
 */
const connectRedis = async () => {
  try {
    // ─────────────────────────────────────────────────────────────────────────
    // SCENARIO 1: PRODUCTION ENVIRONMENT
    // ─────────────────────────────────────────────────────────────────────────
    // Check if we're in production AND have a Redis URL configured
    if (process.env.NODE_ENV === 'production' && process.env.REDIS_URL) {
      console.log('🔄 Connecting to Redis server...');

      // ─────────────────────────────────────────────────────────────────────
      // CREATE REDIS CLIENT
      // ─────────────────────────────────────────────────────────────────────
      // redis.createClient() creates connection to Redis server
      redisClient = redis.createClient({
        url: process.env.REDIS_URL,           // Example: redis://localhost:6379
        password: process.env.REDIS_PASSWORD  // Optional: for secure Redis
        // Additional options you can add:
        // socket: {
        //   reconnectStrategy: (retries) => Math.min(retries * 50, 500)
        // },
        // database: 0,  // Redis database number (0-15)
        // username: process.env.REDIS_USERNAME,  // Redis 6+ supports usernames
      });

      // ─────────────────────────────────────────────────────────────────────
      // EVENT LISTENERS - Monitor Redis Connection Health
      // ─────────────────────────────────────────────────────────────────────

      // ERROR Event: Called when Redis encounters an error
      redisClient.on('error', (err) => {
        console.error('❌ Redis Client Error:', err);
        // In production, you might want to:
        // - Log to error tracking service (Sentry, etc.)
        // - Alert DevOps team
        // - Switch to fallback if persistent
      });

      // CONNECT Event: Called when TCP connection is established
      redisClient.on('connect', () => {
        console.log('🔗 Redis Client Connected (TCP established)');
      });

      // READY Event: Called when Redis is ready to accept commands
      redisClient.on('ready', () => {
        console.log('✅ Redis Client Ready (can accept commands)');
      });

      // RECONNECTING Event: Called when Redis is trying to reconnect
      redisClient.on('reconnecting', () => {
        console.log('🔄 Redis Client Reconnecting...');
      });

      // END Event: Called when connection is closed
      redisClient.on('end', () => {
        console.log('🔌 Redis Client Connection Closed');
      });

      // ─────────────────────────────────────────────────────────────────────
      // ESTABLISH CONNECTION
      // ─────────────────────────────────────────────────────────────────────
      // connect() actually establishes the connection to Redis server
      // This is async - waits for connection before proceeding
      await redisClient.connect();

      console.log('✅ Successfully connected to Redis!');

    } else {
      // ─────────────────────────────────────────────────────────────────────
      // SCENARIO 2: DEVELOPMENT ENVIRONMENT (No Redis Server)
      // ─────────────────────────────────────────────────────────────────────
      console.log('⚠️  Redis not configured - Using in-memory store (development mode)');
      console.log('💡 To use real Redis:');
      console.log('   1. Install Redis: brew install redis (Mac) or apt-get install redis (Linux)');
      console.log('   2. Start Redis: redis-server');
      console.log('   3. Set in .env: REDIS_URL=redis://localhost:6379');
      console.log('');

      // ═══════════════════════════════════════════════════════════════════
      // IN-MEMORY STORE (JavaScript Map)
      // ═══════════════════════════════════════════════════════════════════
      // Map is a built-in JavaScript data structure: key → value pairs
      // Think of it as a simple object/dictionary in memory
      const store = new Map();
      // Example: store.set('user:123', 'John')
      //          store.get('user:123') → 'John'

      // ═══════════════════════════════════════════════════════════════════
      // REDIS API MOCK - Making Map behave like Redis
      // ═══════════════════════════════════════════════════════════════════
      // We create an object that has the same methods as Redis
      // This way, our code doesn't need to change when switching between
      // in-memory and real Redis

      redisClient = {
        // ─────────────────────────────────────────────────────────────────
        // GET: Retrieve value by key
        // ─────────────────────────────────────────────────────────────────
        // Usage: await redis.get('user:123')
        // Returns: value or null if not found
        get: async (key) => {
          const value = store.get(key);
          return value !== undefined ? value : null;
          // Redis returns null for missing keys, Map returns undefined
        },

        // ─────────────────────────────────────────────────────────────────
        // SET: Store value with optional expiration
        // ─────────────────────────────────────────────────────────────────
        // Usage: await redis.set('key', 'value', 'EX', 900)
        // 'EX' means expire in X seconds
        // arguments[3] = the TTL (time to live) in seconds
        set: async (key, value, options) => {
          store.set(key, value);

          // ───────────────────────────────────────────────────────────────
          // SIMULATE TTL (Time To Live) / AUTO-EXPIRATION
          // ───────────────────────────────────────────────────────────────
          // In Redis: Data automatically deleted after expiration
          // In-Memory: We use setTimeout to delete after TTL
          if (options === 'EX') {
            const ttlSeconds = arguments[3];  // Get TTL from 4th argument
            const ttlMilliseconds = ttlSeconds * 1000;

            // Example: redis.set('token', 'abc123', 'EX', 900)
            // After 900 seconds (15 min), delete the key
            setTimeout(() => {
              store.delete(key);
              // In real app, you might log this:
              // console.log(`⏰ Expired: ${key}`);
            }, ttlMilliseconds);
          }

          return 'OK';  // Redis returns 'OK' on successful set
        },

        // ─────────────────────────────────────────────────────────────────
        // DEL: Delete key(s)
        // ─────────────────────────────────────────────────────────────────
        // Usage: await redis.del('user:123')
        // Returns: Number of keys deleted
        del: async (key) => {
          const existed = store.has(key);
          store.delete(key);
          return existed ? 1 : 0;  // Redis returns count of deleted keys
        },

        // ─────────────────────────────────────────────────────────────────
        // EXISTS: Check if key exists
        // ─────────────────────────────────────────────────────────────────
        // Usage: await redis.exists('user:123')
        // Returns: 1 if exists, 0 if not
        exists: async (key) => {
          return store.has(key) ? 1 : 0;
        },

        // ─────────────────────────────────────────────────────────────────
        // EXPIRE: Set expiration on existing key
        // ─────────────────────────────────────────────────────────────────
        // Usage: await redis.expire('user:123', 300)  // Expire in 5 min
        // Returns: 1 if timeout set, 0 if key doesn't exist
        expire: async (key, seconds) => {
          if (!store.has(key)) {
            return 0;  // Key doesn't exist
          }

          setTimeout(() => {
            store.delete(key);
          }, seconds * 1000);

          return 1;  // Expiration set successfully
        },

        // ─────────────────────────────────────────────────────────────────
        // QUIT: Close connection (no-op for in-memory)
        // ─────────────────────────────────────────────────────────────────
        quit: async () => {
          store.clear();  // Clear all data
          return 'OK';
        }
      };

      console.log('✅ In-memory store initialized');
    }

    return redisClient;

  } catch (error) {
    // ─────────────────────────────────────────────────────────────────────────
    // SCENARIO 3: CONNECTION FAILED - AUTOMATIC FALLBACK
    // ─────────────────────────────────────────────────────────────────────────
    // If Redis connection fails (server down, network issue, etc.)
    // Automatically fall back to in-memory store
    // This ensures the app keeps working even if Redis is unavailable

    console.error('❌ Redis connection failed:', error.message);
    console.log('⚠️  Falling back to in-memory store');
    console.log('⚠️  WARNING: Data will be lost on server restart!');

    // Create simplified in-memory fallback (without TTL)
    const store = new Map();
    return {
      get: async (key) => store.get(key) || null,
      set: async (key, value) => {
        store.set(key, value);
        return 'OK';
      },
      del: async (key) => {
        store.delete(key);
        return 1;
      },
      exists: async (key) => store.has(key) ? 1 : 0,
      quit: async () => {
        store.clear();
        return 'OK';
      }
    };
  }
};

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📥 GET REDIS CLIENT (Singleton Pattern)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Returns the Redis client instance that was created by connectRedis()
 *
 * WHY SINGLETON?
 * ────────────────────────────────────────────────────────────────────────────
 * - Only ONE Redis connection for entire app
 * - Prevents connection pool exhaustion
 * - More efficient than creating new connections
 * - Industry best practice
 *
 * USAGE:
 * ────────────────────────────────────────────────────────────────────────────
 * const redis = getRedisClient();
 * await redis.set('key', 'value');
 * const value = await redis.get('key');
 *
 * @returns {Object} Redis client instance
 * @throws {Error} If connectRedis() wasn't called first
 */
const getRedisClient = () => {
  if (!redisClient) {
    throw new Error('❌ Redis client not initialized. Call connectRedis() first in server.js');
  }
  return redisClient;
};

// ═══════════════════════════════════════════════════════════════════════════════
// 📤 EXPORT FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════
module.exports = {
  connectRedis,      // Called once on server startup
  getRedisClient     // Called whenever you need to use Redis
};

// ═══════════════════════════════════════════════════════════════════════════════
// 📚 USAGE EXAMPLES
// ═══════════════════════════════════════════════════════════════════════════════

/*
// ─────────────────────────────────────────────────────────────────────────────
// EXAMPLE 1: Token Blacklist (Logout)
// ─────────────────────────────────────────────────────────────────────────────
const redis = getRedisClient();

// User logs out - blacklist their token for 15 minutes
await redis.set(`blacklist:${token}`, '1', 'EX', 900);

// On every request - check if token is blacklisted
const isBlacklisted = await redis.get(`blacklist:${token}`);
if (isBlacklisted) {
  return res.status(401).json({ error: 'Token invalidated' });
}

// ─────────────────────────────────────────────────────────────────────────────
// EXAMPLE 2: Rate Limiting (Prevent Brute Force)
// ─────────────────────────────────────────────────────────────────────────────
const redis = getRedisClient();
const key = `login_attempts:${email}`;

// Get current attempts
const attempts = parseInt(await redis.get(key) || '0');

// Block if too many attempts
if (attempts >= 5) {
  return res.status(429).json({ error: 'Too many attempts. Try again in 15 min.' });
}

// Increment attempts and set expiration
await redis.set(key, attempts + 1, 'EX', 900);  // Reset after 15 min

// ─────────────────────────────────────────────────────────────────────────────
// EXAMPLE 3: Store Refresh Token
// ─────────────────────────────────────────────────────────────────────────────
const redis = getRedisClient();

// Store refresh token for 7 days
await redis.set(`refresh:${userId}`, refreshToken, 'EX', 604800);

// Validate refresh token
const storedToken = await redis.get(`refresh:${userId}`);
if (storedToken !== providedToken) {
  return res.status(401).json({ error: 'Invalid refresh token' });
}

// ─────────────────────────────────────────────────────────────────────────────
// EXAMPLE 4: Cache API Response
// ─────────────────────────────────────────────────────────────────────────────
const redis = getRedisClient();
const cacheKey = 'users:all';

// Try to get from cache
let users = await redis.get(cacheKey);

if (!users) {
  // Cache miss - fetch from database
  users = await User.find();

  // Store in cache for 5 minutes
  await redis.set(cacheKey, JSON.stringify(users), 'EX', 300);
} else {
  // Cache hit - parse JSON
  users = JSON.parse(users);
}

// ─────────────────────────────────────────────────────────────────────────────
// EXAMPLE 5: Store OTP (One-Time Password)
// ─────────────────────────────────────────────────────────────────────────────
const redis = getRedisClient();
const otp = Math.floor(100000 + Math.random() * 900000);  // 6-digit code

// Store OTP for 10 minutes
await redis.set(`otp:${email}`, otp, 'EX', 600);

// Send OTP to user via email/SMS...

// Later, verify OTP:
const storedOTP = await redis.get(`otp:${email}`);
if (storedOTP === providedOTP) {
  // OTP is valid - delete it so it can't be reused
  await redis.del(`otp:${email}`);
  // Continue verification...
}
*/

// ═══════════════════════════════════════════════════════════════════════════════
// 🎯 KEY TAKEAWAYS
// ═══════════════════════════════════════════════════════════════════════════════
// ✅ Redis is FAST - 100x faster than MongoDB for simple lookups
// ✅ Auto-expiration - Data automatically deleted after TTL
// ✅ Perfect for: tokens, sessions, rate limiting, caching, OTP
// ✅ Development: In-memory fallback (Map) works fine
// ✅ Production: Real Redis required for multiple servers
// ✅ Singleton pattern: One connection for entire app
// ✅ Always await: All Redis operations are async
// ═══════════════════════════════════════════════════════════════════════════════

