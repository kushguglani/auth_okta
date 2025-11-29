# 2. Express.js Deep Dive

[← Back to Table of Contents](./README.md)

---

## 🤔 What is Express?

**Express is NOT middleware** - it's a **web application framework** for Node.js.

Think of it as a toolkit that makes building web servers much easier.

---

## Without Express (Pure Node.js)

```javascript
// Painful manual approach 😫
const http = require('http');

const server = http.createServer((req, res) => {
  if (req.url === '/' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Hello' }));
  } else if (req.url === '/api/hello' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Hi' }));
  }
  // You have to handle EVERYTHING manually!
});

server.listen(5000);
```

**Problems:**
- ❌ Manual routing
- ❌ Manual header management
- ❌ Manual JSON parsing
- ❌ Manual error handling
- ❌ Lots of boilerplate code

---

## With Express (Much Better! 🎉)

```javascript
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.json({ message: 'Hello' });
});

app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hi' });
});

app.listen(5000);
```

**Benefits:**
- ✅ Simple routing
- ✅ Auto JSON handling
- ✅ Built-in middleware system
- ✅ Easy error handling
- ✅ Much less code

---

## What Express Provides

### 1. Easy Routing
- `app.get()`, `app.post()`, `app.put()`, `app.delete()`
- Pattern matching
- Route parameters

### 2. Request/Response Simplification
- `res.json()` - Auto stringify
- `req.body` - Parsed body
- `req.params` - Route params
- `req.query` - Query strings

### 3. Middleware System
- Process requests in layers
- Reusable logic
- Third-party integrations

### 4. Template Engine Support
- Pug, EJS, Handlebars

### 5. Static File Serving
- `express.static()`

---

## Key Concepts

### app.use() - What is it?

`app.use()` is the **method for registering middleware** in Express.

It tells Express: **"Run this function for incoming requests"**

#### Syntax Variations

**1. Global Middleware (All Routes, All Methods)**
```javascript
app.use(middlewareFunction);
```

**2. Path-Specific Middleware**
```javascript
app.use('/api', middlewareFunction);
```

**3. Multiple Middleware**
```javascript
app.use(middleware1, middleware2, middleware3);
```

### app.use() vs app.get/post/put/delete()

| Method | HTTP Method? | Path Matching | Typical Use |
|--------|-------------|---------------|-------------|
| `app.use()` | **All** (GET, POST, PUT, DELETE, etc.) | Yes (optional) | Middleware |
| `app.get()` | **Only GET** | Yes (required) | Routes |
| `app.post()` | **Only POST** | Yes (required) | Routes |
| `app.put()` | **Only PUT** | Yes (required) | Routes |
| `app.delete()` | **Only DELETE** | Yes (required) | Routes |

---

## Common Patterns

### Pattern 1: Global Logging
```javascript
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});
```

### Pattern 2: Authentication for Specific Routes
```javascript
app.use('/admin', (req, res, next) => {
  if (!req.headers.authorization) {
    return res.status(401).json({ error: 'Not authorized' });
  }
  next();
});

app.get('/admin/dashboard', (req, res) => {
  res.json({ data: 'Secret admin data' });
});
```

### Pattern 3: Serve Static Files
```javascript
app.use(express.static('public'));
// public/logo.png → http://localhost:5000/logo.png
```

### Pattern 4: Mount Router
```javascript
const userRouter = express.Router();

userRouter.get('/', (req, res) => {
  res.json({ message: 'All users' });
});

userRouter.get('/:id', (req, res) => {
  res.json({ message: `User ${req.params.id}` });
});

app.use('/users', userRouter);
// GET /users     → "All users"
// GET /users/123 → "User 123"
```

---

## Important Rules

### ✅ Rule 1: Order Matters
```javascript
// ❌ WRONG
app.get('/api/data', (req, res) => {
  res.json(req.body); // undefined!
});
app.use(express.json()); // Too late!

// ✅ CORRECT
app.use(express.json());
app.get('/api/data', (req, res) => {
  res.json(req.body); // Works!
});
```

### ✅ Rule 2: Always Call next()
```javascript
// ❌ WRONG - Request hangs
app.use((req, res, next) => {
  console.log('Request received');
  // Forgot next()! Request never completes
});

// ✅ CORRECT
app.use((req, res, next) => {
  console.log('Request received');
  next(); // Continue to next middleware
});
```

### ✅ Rule 3: Error Middleware Has 4 Parameters
```javascript
// Regular middleware: 3 parameters
app.use((req, res, next) => {
  // ...
});

// Error middleware: 4 parameters (MUST have err)
app.use((err, req, res, next) => {
  res.status(500).json({ error: err.message });
});
```

---

[← Previous: Project Overview](./01-project-overview.md) | [Next: Middleware Explained →](./03-middleware.md)

