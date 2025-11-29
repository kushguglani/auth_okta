# 7. Redis Explained

[← Back to Table of Contents](./README.md)

---

## 🔴 What is Redis?

**Redis = Remote Dictionary Server**

Redis is an **in-memory data store** (like a super-fast database in RAM).

Think of it as: **A lightning-fast key-value storage system**

### Key Features

✅ Extremely fast (microsecond response time)  
✅ Data stored in RAM (not disk)  
✅ Automatic expiration (TTL - Time To Live)  
✅ Simple key-value pairs  
✅ Supports complex data types  
✅ Pub/Sub messaging  
✅ Atomic operations  

---

## 📊 Speed Comparison

### Operation: Check if token is blacklisted

| Storage | Speed | Performance |
|---------|-------|-------------|
| **Redis (RAM)** | 0.1ms | ⚡ FASTEST |
| **MongoDB (Disk)** | 10ms | 🐢 100x slower |
| **File System** | 50ms | 🐌 500x slower |

### For 10,000 requests:
- Redis: **1 second** ✅
- MongoDB: **100 seconds** ❌

---

## 🤔 Why Use Redis for Authentication?

### Use Case 1: Token Blacklist (Critical for Logout)

**Problem:** JWT tokens can't be "deleted" once issued

**Scenario:**
1. User logs out at 2:00 PM
2. Access token expires at 2:15 PM (15 min lifespan)
3. Without blacklist: Token still valid until 2:15 PM! ❌
4. With Redis blacklist: Token invalid immediately ✅

**Implementation:**
```javascript
// Add to blacklist
await redis.set(\`blacklist:\${token}\`, '1', 'EX', 900); // Store for 15 min

// Check on every request
const isBlacklisted = await redis.get(\`blacklist:\${token}\`);
if (isBlacklisted) {
  return res.status(401).json({ error: 'Token invalidated' });
}
```

**Why Redis?**
- ✅ Automatic deletion after 15 min (TTL)
- ✅ Super fast lookup (0.1ms vs MongoDB's 10ms)
- ✅ No manual cleanup needed
- ✅ No database bloat

### Use Case 2: Refresh Token Storage

```javascript
// Store refresh token
await redis.set(\`refresh:\${userId}\`, refreshToken, 'EX', 604800); // 7 days

// Validate
const storedToken = await redis.get(\`refresh:\${userId}\`);

// Revoke all user tokens
await redis.del(\`refresh:\${userId}\`);
```

### Use Case 3: Rate Limiting (Prevent Brute Force)

```javascript
const key = \`login_attempts:\${email}\`;
const attempts = await redis.get(key) || 0;

if (attempts >= 5) {
  return res.status(429).json({ 
    error: 'Too many attempts. Try again in 15 minutes.' 
  });
}

// Increment and set expiration
await redis.set(key, parseInt(attempts) + 1, 'EX', 900);
```

**Why Redis?**
- ✅ Atomic increment operations (no race conditions)
- ✅ Auto-reset after 15 minutes
- ✅ Handles high request volume

---

## 🔄 In-Memory Fallback

### What is it?

A backup solution when Redis is not available, using JavaScript's \`Map\` object.

### When to Use

✅ Development (no Redis installed locally)  
✅ Testing  
✅ Redis server is down  
✅ Quick prototyping  

### Implementation

```javascript
const inMemoryStore = new Map();

const fallbackRedis = {
  get: async (key) => inMemoryStore.get(key) || null,
  
  set: async (key, value, mode, ttl) => {
    inMemoryStore.set(key, value);
    if (mode === 'EX') {
      setTimeout(() => inMemoryStore.delete(key), ttl * 1000);
    }
  },
  
  del: async (key) => inMemoryStore.delete(key)
};
```

---

## 📋 When to Use What?

### ✅ Use Redis For:

- Token blacklist (logout)
- Refresh token storage
- Rate limiting
- Session management
- Temporary data (OTP codes)
- Caching
- Real-time features

### ❌ Don't Use Redis For:

- Permanent user data (use MongoDB)
- Large files (use cloud storage)
- Complex relationships (use PostgreSQL)

---

[← Previous: REST vs GraphQL](./06-rest-vs-graphql.md) | [Next: Project Architecture →](./08-project-architecture.md)
