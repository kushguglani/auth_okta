# 3. Middleware Explained

[← Back to Table of Contents](./README.md)

---

## 🎯 What is Middleware?

**Middleware** = Functions that have access to `req`, `res`, and `next` in the request-response cycle.

Think of middleware as **layers of processing** that your request passes through.

---

## The Middleware Chain

```
Client Request
    ↓
[Middleware 1] → CORS (Allow cross-origin)
    ↓
[Middleware 2] → Parse JSON body
    ↓
[Middleware 3] → Authentication check
    ↓
[Middleware 4] → Authorization check
    ↓
[Route Handler] → Your actual endpoint
    ↓
Response to Client
```

---

## Middleware Function Structure

```javascript
function myMiddleware(req, res, next) {
  // 1. Read request data
  console.log('Request received:', req.method, req.url);

  // 2. Modify request/response
  req.customData = 'some value';

  // 3. MUST call next() to continue
  next(); // Pass to next middleware

  // OR end the request
  // res.status(401).json({ error: 'Unauthorized' });
}
```

**Three parameters (regular middleware):**
- `req` - Request object
- `res` - Response object
- `next` - Function to pass control

**Four parameters (error middleware):**
- `err` - Error object
- `req` - Request object
- `res` - Response object
- `next` - Function to pass control

---

## Middleware in Our Project

### 1. CORS Middleware

```javascript
app.use(cors());
```

**What it does:**
- Allows frontend (port 3000) to talk to backend (port 5000)
- Adds `Access-Control-Allow-Origin` headers
- Prevents browser blocking

**How it works:**
```
Without CORS:
Frontend (3000) → Request → Backend (5000)
Browser: ❌ BLOCKED! Different origin!

With CORS:
Frontend (3000) → Request → Backend (5000)
Backend adds headers → Browser: ✅ Allowed!
```

### 2. JSON Parser Middleware

```javascript
app.use(express.json());
```

**What it does:**
- Parses incoming JSON request bodies
- Makes data available in `req.body`

**Example:**
```javascript
// Client sends:
POST /api/user
Body: { "name": "John", "age": 25 }

// Without express.json():
app.post('/api/user', (req, res) => {
  console.log(req.body); // undefined ❌
});

// With express.json():
app.post('/api/user', (req, res) => {
  console.log(req.body); // { name: 'John', age: 25 } ✅
});
```

### 3. URL Encoded Parser

```javascript
app.use(express.urlencoded({ extended: true }));
```

**What it does:**
- Parses URL-encoded data (HTML forms)
- Example: `name=John&age=25`

**Extended option:**
- `extended: true` - Uses `qs` library (nested objects)
- `extended: false` - Uses `querystring` library (flat objects)

### 4. Error Handling Middleware

```javascript
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});
```

**What it does:**
- Catches errors from routes
- Sends error response to client
- Logs error for debugging

---

## Creating Custom Middleware

### Example 1: Logging Middleware

```javascript
const logger = (req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  next(); // MUST call next()
};

app.use(logger);

// Now every request is logged:
// [2025-11-29T10:30:45.123Z] GET /api/users
// [2025-11-29T10:30:46.456Z] POST /api/auth/login
```

### Example 2: Authentication Middleware

```javascript
const authenticate = (req, res, next) => {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  // Verify token (simplified)
  if (token !== 'valid-token') {
    return res.status(401).json({ error: 'Invalid token' });
  }

  req.user = { id: 1, name: 'John' };
  next();
};

// Use on specific routes
app.get('/api/protected', authenticate, (req, res) => {
  res.json({ message: 'Secret data', user: req.user });
});
```

### Example 3: Timing Middleware

```javascript
const timer = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.url} - ${duration}ms`);
  });

  next();
};

app.use(timer);
// GET /api/users - 45ms
// POST /api/auth/login - 234ms
```

---

## Middleware Order Matters! ⚠️

```javascript
// ❌ WRONG ORDER
app.get('/api/data', (req, res) => {
  res.json(req.body); // undefined! Parser not run yet
});
app.use(express.json()); // Too late!

// ✅ CORRECT ORDER
app.use(express.json()); // Parser runs first
app.get('/api/data', (req, res) => {
  res.json(req.body); // Works! Body is parsed
});
```

**Rule:** Middleware runs in the order you define it.

---

## Common Middleware Patterns

### Global Middleware
```javascript
// Runs for ALL requests
app.use(cors());
app.use(express.json());
app.use(logger);
```

### Path-Specific Middleware
```javascript
// Runs only for /api/* routes
app.use('/api', authenticate);
```

### Route-Level Middleware
```javascript
// Runs only for this specific route
app.get('/admin', authenticate, authorize('admin'), handler);
```

### Error Middleware
```javascript
// MUST be defined last
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal error' });
});
```

---

## Key Takeaways

1. Middleware is just a function with `(req, res, next)`
2. Middleware runs in the order you define it
3. Always call `next()` unless ending the request
4. Error middleware has 4 parameters
5. Use middleware for cross-cutting concerns (logging, auth, parsing)

---

[← Previous: Express Deep Dive](./02-express-deep-dive.md) | [Next: Express Features →](./04-express-features.md)

