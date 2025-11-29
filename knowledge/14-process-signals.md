# 14. Process Signals & Graceful Shutdown

[← Back to Table of Contents](./README.md)

---

## Understanding `process.on('SIGINT')`

**What it is:**  
A signal handler that catches the SIGINT (Signal Interrupt) signal sent when you press **Ctrl+C**.

**Why we need it:**  
Ensures **graceful shutdown** - properly closing database connections and cleaning up resources before the process exits.

---

## Signal Types

| Signal | How to Send | Can Catch? | Purpose |
|--------|-------------|------------|---------|
| **SIGINT** | Ctrl+C | ✅ Yes | User interruption |
| **SIGTERM** | `kill <pid>` | ✅ Yes | Graceful termination |
| **SIGKILL** | `kill -9 <pid>` | ❌ No | Force kill (immediate) |
| **SIGHUP** | Terminal close | ✅ Yes | Hang up signal |

---

## How It Works

```javascript
process.on('SIGINT', async () => {
  // 1. User presses Ctrl+C
  // 2. OS sends SIGINT to Node.js process
  // 3. This handler catches the signal

  // 4. Close database connection
  await mongoose.connection.close();

  // 5. Log shutdown
  console.log('🔌 Mongoose connection closed');

  // 6. Exit cleanly
  process.exit(0);  // 0 = success, 1 = error
});
```

---

## Without Graceful Shutdown

```
You: Ctrl+C
Process: Killed immediately ❌
Result:
  - MongoDB connection left open
  - Incomplete transactions
  - Potential data corruption
  - Connection pool exhaustion
  - Memory leaks
```

---

## With Graceful Shutdown

```
You: Ctrl+C
Process: Catches signal ✅
Process: Closes MongoDB connection
Process: Cleans up resources
Process: Exits cleanly
Result:
  - All connections closed properly
  - Data saved safely
  - Resources cleaned up
  - Professional production code
```

---

## Production-Ready Shutdown

```javascript
const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received - starting graceful shutdown`);

  try {
    // 1. Stop accepting new requests
    console.log('Closing HTTP server...');
    server.close(async () => {
      console.log('HTTP server closed');

      // 2. Close database connections
      await mongoose.connection.close();
      console.log('MongoDB connection closed');

      // 3. Close Redis connection
      await redis.quit();
      console.log('Redis connection closed');

      // 4. Clear any intervals/timeouts
      // clearInterval(myInterval);

      // 5. Exit successfully
      process.exit(0);
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
      console.error('Forced shutdown - timeout exceeded');
      process.exit(1);
    }, 30000);

  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
};

// Listen for different signals
process.on('SIGINT', () => gracefulShutdown('SIGINT'));   // Ctrl+C
process.on('SIGTERM', () => gracefulShutdown('SIGTERM')); // kill command
process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // nodemon restart
```

---

## Interview Answer

**Q: "What does `process.on('SIGINT')` do and why is it important?"**

**A:** "It's a signal handler that catches the SIGINT signal (sent when pressing Ctrl+C) to perform a graceful shutdown. This is important because it allows us to:

1. Close database connections properly
2. Complete pending operations
3. Clean up resources
4. Prevent data corruption
5. Avoid memory leaks

Without it, the process would terminate immediately, potentially leaving open connections and corrupting data. In production, we also handle SIGTERM (for deployment shutdowns) and set a timeout to force-exit if graceful shutdown takes too long."

---

## Common Patterns

### Pattern 1: Simple Shutdown
```javascript
process.on('SIGINT', () => {
  console.log('Shutting down...');
  process.exit(0);
});
```

### Pattern 2: Async Cleanup
```javascript
process.on('SIGINT', async () => {
  await db.close();
  await cache.disconnect();
  process.exit(0);
});
```

### Pattern 3: Multiple Signals
```javascript
['SIGINT', 'SIGTERM', 'SIGUSR2'].forEach(signal => {
  process.on(signal, gracefulShutdown);
});
```

### Pattern 4: With Timeout
```javascript
process.on('SIGINT', () => {
  const cleanup = async () => {
    await closeEverything();
    process.exit(0);
  };

  cleanup();

  setTimeout(() => {
    console.error('Timeout!');
    process.exit(1);
  }, 10000);
});
```

---

## Best Practices

### ✅ DO:
- Handle SIGINT and SIGTERM
- Close all database connections
- Wait for async operations
- Set a force-exit timeout
- Log shutdown steps
- Exit with appropriate code (0 or 1)

### ❌ DON'T:
- Ignore cleanup in development
- Let connections hang
- Block shutdown indefinitely
- Skip error handling

---

## Real-World Example

```javascript
// server.js
const express = require('express');
const mongoose = require('mongoose');
const redis = require('./config/redis');

const app = express();
const PORT = process.env.PORT || 5000;

// Start server
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
const shutdown = async (signal) => {
  console.log(`\n${signal} received - closing server...`);
  
  server.close(async () => {
    console.log('HTTP server closed');
    
    await mongoose.connection.close();
    console.log('MongoDB closed');
    
    await redis.quit();
    console.log('Redis closed');
    
    process.exit(0);
  });

  // Force shutdown after 30s
  setTimeout(() => {
    console.error('Forced shutdown');
    process.exit(1);
  }, 30000);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
```

---

## Key Takeaways

1. **Always handle signals** - Professional production code
2. **Close resources** - Database, Redis, files
3. **Set timeout** - Don't hang forever
4. **Log steps** - Debug shutdown issues
5. **Exit cleanly** - Use proper exit codes

---

## Error Handlers: Last Line of Defense

### Overview

In addition to graceful shutdown signals, Node.js provides two critical error handlers that catch errors that escape your normal error handling:

| Handler | Type | Purpose | Exit? |
|---------|------|---------|-------|
| `unhandledRejection` | Async | Catches uncaught Promise rejections | Yes (1) |
| `uncaughtException` | Sync | Catches uncaught synchronous errors | Yes (1) |

---

## 🚨 Unhandled Promise Rejection

### What It Is

Catches async/await errors that were NOT caught with try-catch blocks.

### Why We Need It

```javascript
// ❌ PROBLEM: Promise rejection without catch
async function getUser(id) {
  const user = await User.findById(id);  // Might reject!
  return user;
}

getUser('invalid-id');  // Promise rejected but not caught!
// Without handler: Error silently swallowed or crashes app unpredictably
// With handler: Error logged, app exits gracefully
```

### Real-World Scenarios

#### Scenario 1: Database Connection Fails
```javascript
// MongoDB connection fails during query
const users = await User.find();  // Connection lost!
// Without handler: App continues in broken state
// With handler: Error caught, app exits, PM2 restarts
```

#### Scenario 2: API Call Fails
```javascript
const response = await fetch('https://api.example.com/data');
// API is down, promise rejects
// Without handler: Unhandled rejection
// With handler: Logged and handled
```

#### Scenario 3: Redis Connection Lost
```javascript
await redis.set('key', 'value');  // Redis server crashed
// Without handler: Silent failure or crash
// With handler: Clean exit and restart
```

### Implementation

```javascript
process.on('unhandledRejection', (err, promise) => {
  console.error('❌ Unhandled Promise Rejection:', err);
  console.error('Promise:', promise);
  console.error('Stack:', err.stack);
  
  // Exit with error code
  // Process manager (PM2, Docker) will restart the app
  process.exit(1);
});
```

### Parameters

- **err**: The error object (what went wrong)
- **promise**: The rejected promise (where it happened)

---

## 💥 Uncaught Exception

### What It Is

Catches synchronous errors that were NOT caught in try-catch blocks.

### Why We Need It

```javascript
// ❌ PROBLEM: Synchronous error without try-catch
function processData(data) {
  return data.name.toUpperCase();  // If data is null/undefined → TypeError!
}

processData(null);  // Throws TypeError: Cannot read property 'name' of null
// Without handler: App crashes immediately
// With handler: Error logged, graceful exit
```

### Real-World Scenarios

#### Scenario 1: Null Reference
```javascript
const user = null;
console.log(user.name.toUpperCase());  // TypeError!
// Crashes app immediately without handler
```

#### Scenario 2: JSON Parse Error
```javascript
const data = JSON.parse('invalid json');  // SyntaxError!
// Crashes if not caught
```

#### Scenario 3: Variable Not Defined
```javascript
console.log(nonExistentVariable);  // ReferenceError!
// Crashes without handler
```

#### Scenario 4: Math Error
```javascript
function divide(a, b) {
  return a / b;
}
const result = divide(10, 0);  // Returns Infinity (not an error)

// But this will throw:
const obj = { value: undefined };
console.log(obj.value.toString());  // TypeError!
```

### Implementation

```javascript
process.on('uncaughtException', (err, origin) => {
  console.error('💥 Uncaught Exception:', err);
  console.error('Origin:', origin);
  console.error('Stack:', err.stack);
  
  // ⚠️ CRITICAL: After uncaught exception, app is in undefined state
  // MUST exit immediately - do NOT try to continue
  process.exit(1);
});
```

### Parameters

- **err**: The error object
- **origin**: Where the error originated
  - `uncaughtException`: Thrown from synchronous code
  - `unhandledRejection`: From an async operation

### ⚠️ WARNING: Undefined State

After an uncaught exception:
- Application state is unpredictable
- Resources might be in inconsistent state
- Memory might be corrupted
- **NEVER** try to continue execution
- **ALWAYS** exit immediately

---

## Comparison: Promise Rejection vs Exception

### Unhandled Promise Rejection (Async)

```javascript
// Example that triggers unhandledRejection
async function fetchData() {
  const data = await fetch('invalid-url');  // Promise rejects
  return data;
}

fetchData();  // No .catch() or try-catch
// → Triggers unhandledRejection handler
```

**When it happens:**
- Async function without try-catch
- Promise without .catch()
- await without error handling

### Uncaught Exception (Sync)

```javascript
// Example that triggers uncaughtException
function processUser(user) {
  return user.name.toUpperCase();  // Throws if user is null
}

processUser(null);  // No try-catch
// → Triggers uncaughtException handler
```

**When it happens:**
- Synchronous code throws error
- No try-catch block to catch it
- Error propagates to top level

---

## Complete Error Handling Strategy

### Layer 1: Try-Catch (First Defense)
```javascript
// ✅ BEST: Handle errors where they occur
async function getUser(id) {
  try {
    const user = await User.findById(id);
    return user;
  } catch (error) {
    console.error('Failed to get user:', error);
    throw error;  // Re-throw for higher level handling
  }
}
```

### Layer 2: Express Error Middleware
```javascript
// ✅ GOOD: Catch all Express route errors
app.use((err, req, res, next) => {
  console.error('Express error:', err);
  res.status(500).json({ error: 'Server error' });
});
```

### Layer 3: Global Process Handlers (Last Resort)
```javascript
// ✅ SAFETY NET: Catch what slipped through
process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  process.exit(1);
});
```

---

## Production-Ready Implementation

```javascript
// ═══════════════════════════════════════════════════════════════════════
// 🎯 PRODUCTION ERROR HANDLING
// ═══════════════════════════════════════════════════════════════════════

// Track if we're already shutting down
let isShuttingDown = false;

// Enhanced unhandled rejection handler
process.on('unhandledRejection', async (err, promise) => {
  console.error('═══════════════════════════════════════════════════════');
  console.error('❌ UNHANDLED PROMISE REJECTION');
  console.error('═══════════════════════════════════════════════════════');
  console.error('Time:', new Date().toISOString());
  console.error('Error:', err);
  console.error('Message:', err.message);
  console.error('Stack:', err.stack);
  console.error('Promise:', promise);
  console.error('═══════════════════════════════════════════════════════');

  // In production, send to error tracking service
  // await sendToSentry(err);
  // await sendToSlack('Unhandled rejection in production!');

  if (!isShuttingDown) {
    isShuttingDown = true;
    
    // Try to close resources gracefully
    try {
      await mongoose.connection.close();
      await redis.quit();
    } catch (cleanupError) {
      console.error('Error during cleanup:', cleanupError);
    }

    process.exit(1);
  }
});

// Enhanced uncaught exception handler
process.on('uncaughtException', (err, origin) => {
  console.error('═══════════════════════════════════════════════════════');
  console.error('💥 UNCAUGHT EXCEPTION - CRITICAL');
  console.error('═══════════════════════════════════════════════════════');
  console.error('Time:', new Date().toISOString());
  console.error('Error:', err);
  console.error('Message:', err.message);
  console.error('Stack:', err.stack);
  console.error('Origin:', origin);
  console.error('═══════════════════════════════════════════════════════');
  console.error('⚠️  App in undefined state - exiting immediately');
  console.error('═══════════════════════════════════════════════════════');

  // Don't try to clean up - state is unpredictable
  // Just log and exit immediately
  process.exit(1);
});

// Warning handler (Node.js warnings)
process.on('warning', (warning) => {
  console.warn('⚠️  Warning:', warning.name);
  console.warn('Message:', warning.message);
  console.warn('Stack:', warning.stack);
});
```

---

## Testing Error Handlers

### Test Unhandled Rejection
```javascript
// Add this temporary code to test
setTimeout(() => {
  Promise.reject(new Error('Test unhandled rejection'));
}, 1000);

// Output:
// ❌ Unhandled Promise Rejection: Error: Test unhandled rejection
// Process exits with code 1
```

### Test Uncaught Exception
```javascript
// Add this temporary code to test
setTimeout(() => {
  throw new Error('Test uncaught exception');
}, 1000);

// Output:
// 💥 Uncaught Exception: Error: Test uncaught exception
// Process exits with code 1
```

---

## Common Mistakes

### ❌ Mistake 1: Not Exiting After Error
```javascript
// BAD: Try to continue after error
process.on('uncaughtException', (err) => {
  console.error('Error:', err);
  // App continues in broken state ❌
});
```

### ✅ Fix: Always Exit
```javascript
// GOOD: Exit after logging
process.on('uncaughtException', (err) => {
  console.error('Error:', err);
  process.exit(1);  // Exit immediately ✅
});
```

### ❌ Mistake 2: Complex Cleanup in uncaughtException
```javascript
// BAD: Trying to clean up after uncaught exception
process.on('uncaughtException', async (err) => {
  console.error('Error:', err);
  await saveErrorToDatabase(err);  // Might fail!
  await sendEmail(err);  // Might fail!
  await closeConnections();  // Might fail!
  process.exit(1);
});
```

### ✅ Fix: Minimal Logging, Quick Exit
```javascript
// GOOD: Just log and exit
process.on('uncaughtException', (err) => {
  console.error('Error:', err);
  // No async operations - state is unpredictable
  process.exit(1);
});
```

### ❌ Mistake 3: Swallowing Errors
```javascript
// BAD: Catching but not handling
process.on('unhandledRejection', (err) => {
  // Do nothing - error silently ignored ❌
});
```

### ✅ Fix: Always Log and Exit
```javascript
// GOOD: Log and exit
process.on('unhandledRejection', (err) => {
  console.error('Error:', err);
  process.exit(1);  // Exit to trigger restart
});
```

---

## When Handlers Are Triggered

### Handlers ARE Triggered:
```javascript
// 1. Async without try-catch
async function test() {
  await Promise.reject('error');  // → unhandledRejection
}
test();

// 2. Promise without catch
Promise.reject('error');  // → unhandledRejection

// 3. Throw without try-catch
function test() {
  throw new Error('boom');  // → uncaughtException
}
test();

// 4. Null reference
const obj = null;
obj.property;  // → uncaughtException
```

### Handlers NOT Triggered:
```javascript
// 1. Error caught in try-catch
try {
  throw new Error('caught');  // ✅ Handled
} catch (err) {
  console.error(err);
}

// 2. Promise with catch
Promise.reject('error')
  .catch(err => console.error(err));  // ✅ Handled

// 3. Async with try-catch
async function test() {
  try {
    await Promise.reject('error');  // ✅ Handled
  } catch (err) {
    console.error(err);
  }
}

// 4. Express error middleware
app.get('/test', async (req, res, next) => {
  try {
    await doSomething();
  } catch (err) {
    next(err);  // ✅ Passed to Express error handler
  }
});
```

---

## Best Practices Summary

### ✅ DO:
1. Always add these handlers in production
2. Log detailed error information
3. Exit process after error (let PM2/Docker restart)
4. Use error monitoring service (Sentry, Rollbar)
5. Alert team on critical errors
6. Test error handlers in development
7. Prefer try-catch over relying on handlers

### ❌ DON'T:
1. Try to continue after uncaught exception
2. Do complex cleanup in error handlers
3. Ignore or swallow errors
4. Rely on these as primary error handling
5. Use sync operations in unhandledRejection
6. Forget to exit the process

---

## Interview Questions & Answers

**Q: What's the difference between unhandledRejection and uncaughtException?**

**A:** 
- `unhandledRejection`: Catches async errors (Promises) that weren't caught with try-catch or .catch()
- `uncaughtException`: Catches synchronous errors that weren't caught in try-catch blocks

Example:
```javascript
// unhandledRejection
await User.find();  // DB error, no try-catch

// uncaughtException  
const user = null;
user.name.toUpperCase();  // TypeError, no try-catch
```

**Q: Why should you exit after an uncaught exception?**

**A:** After an uncaught exception, the application is in an **undefined state**. The error could have corrupted memory, left resources in inconsistent states, or broken assumptions your code depends on. Continuing execution could cause data corruption, security issues, or unpredictable behavior. It's safer to exit immediately and let a process manager (PM2, Docker) restart the application in a clean state.

**Q: Should you use async operations in uncaughtException handler?**

**A:** **No**. After an uncaught exception, the app state is unpredictable. Async operations might fail or hang. You should only log the error synchronously and exit immediately. Save complex operations (database logging, sending alerts) for the `unhandledRejection` handler or use external monitoring services that work via sync logging.

---

## Integration with Process Manager

### PM2 Configuration
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'kta-api',
    script: './server.js',
    instances: 2,
    autorestart: true,  // Auto-restart after crash
    max_restarts: 10,   // Max restarts within min_uptime
    min_uptime: 10000,  // Min uptime before restart counted
    restart_delay: 4000, // Delay between restarts
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm Z'
  }]
};
```

When your error handlers call `process.exit(1)`:
1. PM2 detects the process exit
2. Logs the error to error.log
3. Waits `restart_delay` (4 seconds)
4. Starts a fresh instance
5. Your app continues with clean state

---

## Summary

| Event | Type | When | Action | Can Cleanup? |
|-------|------|------|--------|--------------|
| `unhandledRejection` | Async | Promise rejected, no catch | Exit(1) | Yes (carefully) |
| `uncaughtException` | Sync | Error thrown, no try-catch | Exit(1) | No - exit immediately |
| `SIGINT` | Signal | Ctrl+C | Graceful shutdown | Yes |
| `SIGTERM` | Signal | Kill command | Graceful shutdown | Yes |

**Golden Rule**: These handlers are **safety nets**, not primary error handling. Always use try-catch blocks as your first line of defense!

---

[← Previous: Interview Prep](./13-interview-prep.md) | [Back to Table of Contents](./README.md)
