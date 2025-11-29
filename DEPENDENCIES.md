# 📦 Dependencies & Packages Reference

> Complete guide to all packages used in this project with use cases, examples, and alternatives

**Last Updated:** Nov 29, 2025  
**Total Packages:** 15 backend + 6 frontend = 21 packages

---

## 📑 Table of Contents

- [Backend Dependencies](#backend-dependencies)
- [Frontend Dependencies](#frontend-dependencies)
- [DevDependencies](#devdependencies)
- [Quick Reference Table](#quick-reference-table)
- [Package Alternatives](#package-alternatives)

---

## Backend Dependencies

### 1. express (^4.18.2)

**Category:** Web Framework  
**Size:** ~200KB  
**License:** MIT

**What it does:**
- Web application framework for Node.js
- Simplifies routing, middleware, and HTTP handling
- Industry standard for Node.js backends

**Use Case in Our Project:**
- Main server framework
- Handles REST API routes
- Integrates with Apollo Server for GraphQL

**Example:**
```javascript
const express = require('express');
const app = express();

// Define routes
app.get('/api/users', (req, res) => {
  res.json({ users: [] });
});

// Start server
app.listen(5000, () => {
  console.log('Server running on port 5000');
});
```

**In Our Project:**
```javascript
// backend/server.js
const app = express();

// REST API routes
app.post('/api/auth/signup', async (req, res) => {
  // Handle signup
});

app.post('/api/auth/login', async (req, res) => {
  // Handle login
});
```

**Why We Use It:**
- Most popular Node.js framework
- Large ecosystem
- Easy to learn
- Great for interviews (Okta uses it)

**Alternatives:**
- Fastify (faster, modern)
- Koa (by Express creators, more modern)
- NestJS (TypeScript, opinionated)
- Hapi (enterprise-focused)

---

### 2. apollo-server-express (^3.13.0)

**Category:** GraphQL Server  
**Size:** ~2MB  
**License:** MIT

**What it does:**
- GraphQL server that integrates with Express
- Provides GraphQL playground
- Handles schema, resolvers, and context

**Use Case in Our Project:**
- Provides GraphQL API alongside REST
- Handles authentication via context
- Serves GraphQL playground for testing

**Example:**
```javascript
const { ApolloServer, gql } = require('apollo-server-express');

// Define schema
const typeDefs = gql`
  type User {
    id: ID!
    name: String!
  }
  
  type Query {
    users: [User]
  }
`;

// Define resolvers
const resolvers = {
  Query: {
    users: () => [
      { id: '1', name: 'John' }
    ]
  }
};

// Create server
const server = new ApolloServer({ typeDefs, resolvers });
await server.start();
server.applyMiddleware({ app });
```

**In Our Project:**
```javascript
// backend/server.js
const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }) => {
    const token = req.headers.authorization;
    const user = verifyToken(token);
    return { user };
  }
});

await server.start();
server.applyMiddleware({ app, path: '/graphql' });
```

**Why We Use It:**
- Flexible data querying
- Reduces over-fetching
- Great for complex data structures
- Okta supports GraphQL

**Alternatives:**
- graphql-yoga (newer, more features)
- Mercurius (Fastify-based, faster)
- express-graphql (simpler, older)
- GraphQL Helix (framework-agnostic)

---

### 3. bcryptjs (^3.0.3)

**Category:** Cryptography  
**Size:** ~60KB  
**License:** MIT

**What it does:**
- Hashes passwords securely
- Generates salts
- Compares passwords with hashes
- Pure JavaScript (no C++ dependencies)

**Use Case in Our Project:**
- Hash user passwords before storing
- Verify passwords during login
- Prevent password leaks

**Example:**
```javascript
const bcrypt = require('bcryptjs');

// Hash password (signup)
const password = 'MyPassword123';
const saltRounds = 10;
const hashedPassword = await bcrypt.hash(password, saltRounds);
// Result: "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"

// Compare password (login)
const inputPassword = 'MyPassword123';
const isMatch = await bcrypt.compare(inputPassword, hashedPassword);
// Result: true
```

**In Our Project:**
```javascript
// backend/models/User.js

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};
```

**Why We Use It:**
- Industry standard for password hashing
- One-way encryption (can't be reversed)
- Each hash is unique (salt)
- Essential for security

**Key Concepts:**
- **Salt:** Random data added to password before hashing
- **Rounds:** Number of times to hash (10 = 2^10 iterations)
- **One-way:** Cannot decrypt hash to get original password

**How It Works:**
```
Input: "MyPassword123"
       ↓
Salt Generation: Random string (e.g., "$2a$10$N9qo8uLO")
       ↓
Hashing: bcrypt algorithm with 10 rounds
       ↓
Output: "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"
```

**Alternatives:**
- bcrypt (native, faster but needs C++)
- argon2 (more secure, newer)
- scrypt (memory-hard)
- pbkdf2 (slower, less secure)

---

### 4. jsonwebtoken (^9.0.2)

**Category:** Authentication  
**Size:** ~70KB  
**License:** MIT

**What it does:**
- Creates JWT (JSON Web Tokens)
- Verifies JWT signatures
- Handles token expiration

**Use Case in Our Project:**
- Generate access tokens (15 min)
- Generate refresh tokens (7 days)
- Verify tokens on protected routes

**Example:**
```javascript
const jwt = require('jsonwebtoken');

// Sign (create) token
const payload = {
  userId: '123',
  email: 'user@example.com',
  roles: ['user']
};

const token = jwt.sign(
  payload,
  'your-secret-key',
  { expiresIn: '15m' }
);

// Result: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

// Verify token
try {
  const decoded = jwt.verify(token, 'your-secret-key');
  console.log(decoded); // { userId: '123', email: '...', iat: ..., exp: ... }
} catch (err) {
  console.log('Invalid token');
}
```

**In Our Project:**
```javascript
// backend/graphql/resolvers.js

// Generate tokens
const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { userId: user._id, email: user.email, roles: user.roles },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    { userId: user._id, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
};

// Verify in context
const token = req.headers.authorization.replace('Bearer ', '');
const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
```

**JWT Structure:**
```
Header.Payload.Signature

eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.   ← Header (algorithm, type)
eyJ1c2VySWQiOiIxMjMiLCJlbWFpbCI6InRlc3QifQ. ← Payload (data)
SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c    ← Signature (verification)
```

**Why We Use It:**
- Stateless authentication
- No database lookup needed
- Industry standard
- Works across services

**Alternatives:**
- jose (modern, spec-compliant)
- paseto (more secure alternative to JWT)
- Session-based auth (cookies)

---

### 5. mongoose (^9.0.0)

**Category:** Database ODM  
**Size:** ~2MB  
**License:** MIT

**What it does:**
- MongoDB Object Data Modeling (ODM)
- Schema validation
- Query building
- Middleware (hooks)

**Use Case in Our Project:**
- Define User schema
- Validate data before saving
- Query users from MongoDB
- Handle pre-save hooks

**Example:**
```javascript
const mongoose = require('mongoose');

// Define schema
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    minlength: 2,
    maxlength: 50
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  age: {
    type: Number,
    min: 0,
    max: 120
  }
}, {
  timestamps: true // Adds createdAt, updatedAt
});

// Create model
const User = mongoose.model('User', userSchema);

// Use it
const user = await User.create({
  name: 'John',
  email: 'john@example.com',
  age: 30
});

// Query
const users = await User.find({ age: { $gte: 18 } });
const user = await User.findById('123');
```

**In Our Project:**
```javascript
// backend/models/User.js

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, select: false },
  roles: [{ type: String, enum: ['user', 'admin'] }]
}, {
  timestamps: true
});

// Pre-save hook
userSchema.pre('save', async function(next) {
  // Hash password before saving
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

const User = mongoose.model('User', userSchema);
```

**Why We Use It:**
- Schema validation
- Easy MongoDB integration
- Powerful query API
- Middleware support

**Alternatives:**
- Prisma (modern, type-safe)
- TypeORM (TypeScript-first)
- MongoDB native driver (no ODM)
- Sequelize (SQL, not NoSQL)

---

### 6. redis (^5.10.0)

**Category:** In-Memory Database Client  
**Size:** ~500KB  
**License:** MIT

**What it does:**
- Connects to Redis database
- Stores key-value pairs
- Handles caching
- Manages sessions/tokens

**Use Case in Our Project:**
- Store refresh tokens
- Token blacklist (for logout)
- Cache frequently accessed data
- Session management

**Example:**
```javascript
const redis = require('redis');

// Create client
const client = redis.createClient({
  url: 'redis://localhost:6379'
});

await client.connect();

// Set value (with expiration)
await client.set('user:123', 'John Doe', {
  EX: 3600 // Expire in 1 hour
});

// Get value
const value = await client.get('user:123');
console.log(value); // "John Doe"

// Delete value
await client.del('user:123');

// Check if exists
const exists = await client.exists('user:123'); // 0 (false)
```

**In Our Project:**
```javascript
// backend/config/redis.js

const connectRedis = async () => {
  const redisClient = redis.createClient({
    url: process.env.REDIS_URL
  });
  
  await redisClient.connect();
  return redisClient;
};

// Store refresh token
await redis.set(
  `refresh_token:${userId}`,
  refreshToken,
  'EX',
  7 * 24 * 60 * 60 // 7 days
);

// Blacklist token (logout)
await redis.set(
  `blacklist:${token}`,
  '1',
  'EX',
  900 // 15 minutes
);
```

**Why We Use It:**
- Fast (in-memory)
- Automatic expiration
- Perfect for tokens
- Scalable

**Use Cases:**
- Caching
- Session storage
- Rate limiting
- Real-time analytics
- Message queues

**Alternatives:**
- Memcached (simpler, faster)
- In-memory Map (development only)
- MongoDB (slower)
- PostgreSQL (not ideal for this)

---

### 7. cors (^2.8.5)

**Category:** Middleware  
**Size:** ~20KB  
**License:** MIT

**What it does:**
- Enables Cross-Origin Resource Sharing
- Allows frontend (port 3000) to access backend (port 5000)
- Adds CORS headers to responses

**Use Case in Our Project:**
- Allow React app to call backend API
- Configure allowed origins
- Handle preflight requests

**Example:**
```javascript
const cors = require('cors');

// Simple usage (allow all origins)
app.use(cors());

// With options
app.use(cors({
  origin: 'http://localhost:3000', // Only allow this origin
  credentials: true, // Allow cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

**In Our Project:**
```javascript
// backend/server.js

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
```

**Why CORS is Needed:**
```
Without CORS:
Frontend (localhost:3000) → Request → Backend (localhost:5000)
Browser: ❌ BLOCKED! "Different origin"

With CORS:
Frontend (localhost:3000) → Request → Backend (localhost:5000)
Backend adds header: Access-Control-Allow-Origin: http://localhost:3000
Browser: ✅ ALLOWED!
```

**Common CORS Errors:**
```
Access to fetch at 'http://localhost:5000/api/users' from origin 
'http://localhost:3000' has been blocked by CORS policy
```

**Solution:** Add `cors()` middleware!

**Alternatives:**
- Manual headers (not recommended)
- Proxy (webpack dev server)
- Same-origin (frontend & backend on same port)

---

### 8. helmet (^8.1.0)

**Category:** Security Middleware  
**Size:** ~60KB  
**License:** MIT

**What it does:**
- Sets secure HTTP headers
- Prevents common vulnerabilities
- XSS protection
- Clickjacking prevention

**Use Case in Our Project:**
- Secure all API responses
- Add security headers automatically
- Prevent attacks

**Example:**
```javascript
const helmet = require('helmet');

// Simple usage
app.use(helmet());

// With options
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true
  }
}));
```

**Headers It Sets:**
```
X-DNS-Prefetch-Control: off
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
X-XSS-Protection: 0
Strict-Transport-Security: max-age=15552000
Content-Security-Policy: default-src 'self'
```

**In Our Project:**
```javascript
// backend/server.js

app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
  crossOriginEmbedderPolicy: false
}));
```

**What It Prevents:**
- XSS (Cross-Site Scripting)
- Clickjacking
- MIME sniffing
- DNS prefetch attacks

**Why We Use It:**
- Essential for production
- Easy to implement
- Industry standard
- Okta requires it

**Alternatives:**
- Manual header setting
- Nginx/Apache headers
- CDN security (Cloudflare)

---

### 9. express-rate-limit (^8.2.1)

**Category:** Security Middleware  
**Size:** ~40KB  
**License:** MIT

**What it does:**
- Limits number of requests per time window
- Prevents brute force attacks
- Prevents DDoS
- Protects API from abuse

**Use Case in Our Project:**
- Limit login attempts (5 per 15 minutes)
- Protect auth endpoints
- Prevent password guessing

**Example:**
```javascript
const rateLimit = require('express-rate-limit');

// Create limiter
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: 'Too many login attempts, please try again later',
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false
});

// Apply to route
app.post('/api/auth/login', loginLimiter, (req, res) => {
  // Handle login
});

// Global limiter
const globalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100 // 100 requests per minute
});

app.use('/api/', globalLimiter);
```

**In Our Project:**
```javascript
// Future implementation (Phase 3)

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts from this IP'
});

app.post('/api/auth/login', loginLimiter, loginController);
```

**Response Headers:**
```
RateLimit-Limit: 5
RateLimit-Remaining: 4
RateLimit-Reset: 1638123456
```

**Why We Use It:**
- Prevents brute force
- Protects against DDoS
- Easy to implement
- Production requirement

**Alternatives:**
- express-slow-down (slows down requests)
- rate-limiter-flexible (more features)
- Nginx rate limiting
- Redis-based limiting

---

### 10. express-validator (^7.3.1)

**Category:** Validation Middleware  
**Size:** ~100KB  
**License:** MIT

**What it does:**
- Validates request data (body, query, params)
- Sanitizes input
- Prevents injection attacks
- Custom validation rules

**Use Case in Our Project:**
- Validate email format
- Validate password strength
- Sanitize user input
- Prevent SQL/NoSQL injection

**Example:**
```javascript
const { body, validationResult } = require('express-validator');

// Validation middleware
const signupValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Invalid email'),
  
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/\d/)
    .withMessage('Password must contain a number'),
  
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ max: 50 })
    .withMessage('Name too long')
];

// Use in route
app.post('/api/auth/signup', signupValidation, (req, res) => {
  // Check for errors
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  // Proceed with signup
});
```

**In Our Project (Future):**
```javascript
// Phase 3 implementation

const { body } = require('express-validator');

const signupRules = [
  body('email').isEmail().normalizeEmail(),
  body('password').isStrongPassword(),
  body('name').trim().escape().notEmpty()
];

app.post('/api/auth/signup', signupRules, validateRequest, signupController);
```

**Common Validators:**
```javascript
.isEmail()              // Valid email
.isURL()                // Valid URL
.isInt()                // Integer
.isLength({ min, max }) // String length
.matches(/regex/)       // Regex pattern
.isStrongPassword()     // Strong password
.notEmpty()             // Not empty
.trim()                 // Remove whitespace
.escape()               // Escape HTML
.normalizeEmail()       // Standardize email
```

**Why We Use It:**
- Prevents bad data
- Security (injection prevention)
- Better error messages
- Easy to use

**Alternatives:**
- Joi (schema-based)
- Yup (schema-based)
- class-validator (TypeScript)
- Manual validation

---

### 11. cookie-parser (^1.4.7)

**Category:** Middleware  
**Size:** ~15KB  
**License:** MIT

**What it does:**
- Parses cookies from request headers
- Makes cookies available in `req.cookies`
- Handles signed cookies

**Use Case in Our Project:**
- Parse JWT tokens from cookies (future)
- Handle session cookies
- httpOnly cookie support

**Example:**
```javascript
const cookieParser = require('cookie-parser');

app.use(cookieParser('your-secret-key'));

// Set cookie
app.get('/set', (req, res) => {
  res.cookie('token', 'abc123', {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 3600000 // 1 hour
  });
  res.send('Cookie set');
});

// Read cookie
app.get('/get', (req, res) => {
  const token = req.cookies.token;
  res.json({ token });
});

// Signed cookie
app.get('/signed', (req, res) => {
  res.cookie('user', 'john', { signed: true });
  console.log(req.signedCookies.user); // 'john'
});
```

**In Our Project (Future):**
```javascript
// Phase 3: Store tokens in httpOnly cookies

app.post('/api/auth/login', async (req, res) => {
  // ... login logic
  
  res.cookie('refreshToken', token, {
    httpOnly: true,  // Can't access via JavaScript
    secure: true,    // HTTPS only
    sameSite: 'strict', // CSRF protection
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
  
  res.json({ success: true });
});
```

**Why We Use It:**
- Secure token storage
- httpOnly prevents XSS
- Better than localStorage
- Industry standard

**Cookie Options:**
```javascript
{
  httpOnly: true,    // Not accessible via JavaScript (XSS protection)
  secure: true,      // HTTPS only
  sameSite: 'strict',// CSRF protection
  maxAge: 3600000,   // Expiration in milliseconds
  domain: '.example.com', // Cookie domain
  path: '/'          // Cookie path
}
```

**Alternatives:**
- Manual cookie parsing
- Sessions (express-session)
- JWT in headers (current approach)

---

### 12. dotenv (^17.2.3)

**Category:** Configuration  
**Size:** ~20KB  
**License:** BSD-2-Clause

**What it does:**
- Loads environment variables from `.env` file
- Makes them available in `process.env`
- Keeps secrets out of code

**Use Case in Our Project:**
- Store JWT secrets
- MongoDB connection string
- Configuration per environment

**Example:**
```javascript
// .env file
PORT=5000
DATABASE_URL=mongodb://localhost:27017/mydb
JWT_SECRET=my-super-secret-key
NODE_ENV=development

// Load in code
require('dotenv').config();

console.log(process.env.PORT); // "5000"
console.log(process.env.DATABASE_URL); // "mongodb://..."
console.log(process.env.JWT_SECRET); // "my-super-secret-key"

// Use in app
const port = process.env.PORT || 3000;
app.listen(port);
```

**In Our Project:**
```javascript
// backend/server.js
require('dotenv').config();

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_ACCESS_SECRET;

// backend/.env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/kta_auth
JWT_ACCESS_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
```

**Best Practices:**
```
✅ Add .env to .gitignore
✅ Create .env.example (without secrets)
✅ Use different .env files per environment
✅ Never commit secrets to git
✅ Use strong, random secrets
❌ Don't hardcode secrets in code
❌ Don't share .env file
```

**Why We Use It:**
- Security (keeps secrets out of code)
- Different configs per environment
- Easy to change settings
- Industry standard

**Alternatives:**
- Environment variables (set in OS)
- Config files (config.js)
- Vault services (HashiCorp Vault)
- AWS Secrets Manager

---

### 13. nodemailer (^7.0.11)

**Category:** Email  
**Size:** ~300KB  
**License:** MIT

**What it does:**
- Sends emails from Node.js
- SMTP support
- HTML emails
- Attachments

**Use Case in Our Project (Future):**
- Email verification
- Password reset emails
- Welcome emails
- Notifications

**Example:**
```javascript
const nodemailer = require('nodemailer');

// Create transporter
const transporter = nodemailer.createTransporter({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // true for 465
  auth: {
    user: 'your-email@gmail.com',
    pass: 'your-app-password'
  }
});

// Send email
await transporter.sendMail({
  from: '"MyApp" <noreply@myapp.com>',
  to: 'user@example.com',
  subject: 'Welcome to MyApp!',
  text: 'Thanks for signing up!',
  html: '<h1>Welcome!</h1><p>Thanks for signing up!</p>'
});
```

**In Our Project (Future - Phase 3):**
```javascript
// Send verification email
const sendVerificationEmail = async (user, token) => {
  const verificationUrl = `${process.env.FRONTEND_URL}/verify/${token}`;
  
  await transporter.sendMail({
    to: user.email,
    subject: 'Verify your email',
    html: `
      <h1>Email Verification</h1>
      <p>Click the link below to verify your email:</p>
      <a href="${verificationUrl}">Verify Email</a>
    `
  });
};

// Send password reset
const sendPasswordReset = async (user, token) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`;
  
  await transporter.sendMail({
    to: user.email,
    subject: 'Password Reset',
    html: `
      <h1>Reset Your Password</h1>
      <p>Click the link below to reset your password:</p>
      <a href="${resetUrl}">Reset Password</a>
      <p>This link expires in 1 hour.</p>
    `
  });
};
```

**Common SMTP Services:**
- Gmail (free, 500/day limit)
- SendGrid (free tier: 100/day)
- Mailgun (free tier: 5000/month)
- AWS SES (cheap, scalable)
- Postmark (transactional emails)

**Why We Use It:**
- Email verification required
- Password reset functionality
- User notifications
- Professional emails

**Alternatives:**
- SendGrid SDK (easier)
- Mailgun SDK
- AWS SES SDK
- Postmark SDK

---

### 14. graphql (^16.12.0)

**Category:** Query Language  
**Size:** ~1MB  
**License:** MIT

**What it does:**
- GraphQL specification implementation
- Type system
- Query parsing
- Schema validation

**Use Case in Our Project:**
- Define GraphQL schemas
- Parse GraphQL queries
- Type checking
- Required by apollo-server

**Example:**
```javascript
const { GraphQLObjectType, GraphQLString, GraphQLInt } = require('graphql');

// Define type
const UserType = new GraphQLObjectType({
  name: 'User',
  fields: {
    id: { type: GraphQLString },
    name: { type: GraphQLString },
    age: { type: GraphQLInt }
  }
});
```

**In Our Project:**
```javascript
// We use with apollo-server-express
const { gql } = require('apollo-server-express');

const typeDefs = gql`
  type User {
    id: ID!
    name: String!
    email: String!
  }
`;
```

**Why We Use It:**
- Core GraphQL library
- Required by Apollo
- Type safety
- Query validation

**Alternatives:**
- None (it's the standard implementation)

---

## Frontend Dependencies

### 15. react (^18.2.0)

**Category:** UI Library  
**Size:** ~300KB  
**License:** MIT

**What it does:**
- Build user interfaces
- Component-based architecture
- Virtual DOM
- State management

**Use Case in Our Project:**
- Build login/signup UI
- Create components
- Manage state

**Example:**
```javascript
import React, { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);
  
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
    </div>
  );
}
```

**Why We Use It:**
- Industry standard
- Large ecosystem
- Easy to learn
- Okta uses React

**In Our Project:**
```javascript
// frontend/src/context/AuthContext.js

import React, { createContext, useState, useContext, useEffect } from 'react';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Auto-login on mount
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, []);
  
  const value = {
    user,
    loading,
    signup,
    login,
    logout,
    isAuthenticated: !!user
  };
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

**React Concepts We Use:**
- **useState** - Local component state
- **useEffect** - Side effects (auto-login)
- **useContext** - Global state consumption
- **createContext** - Global state provider
- **Custom Hooks** - Reusable logic (useAuth)

---

### 19. react-dom (^18.2.0)

**Category:** React Renderer  
**Size:** ~150KB  
**License:** MIT

**What it does:**
- Renders React components to the DOM
- Handles DOM updates
- Virtual DOM diffing
- Event system

**Use Case in Our Project:**
- Render React app to index.html
- Mount root component

**In Our Project:**
```javascript
// frontend/src/index.js

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

**Why We Use It:**
- Required for React web applications
- Handles all DOM operations
- Optimizes re-renders

**Alternatives:**
- react-native (mobile apps)
- react-three-fiber (3D rendering)
- ink (terminal UIs)

---

### 20. react-scripts (^5.0.1)

**Category:** Build Tool  
**Size:** ~50MB (dev dependency)  
**License:** MIT

**What it does:**
- Create React App build configuration
- Webpack configuration
- Babel transpilation
- Development server
- Production builds

**Use Case in Our Project:**
- Start development server
- Build production bundle
- Run tests

**Scripts:**
```json
{
  "scripts": {
    "start": "react-scripts start",    // Dev server on port 3000
    "build": "react-scripts build",    // Production build
    "test": "react-scripts test",      // Jest tests
    "eject": "react-scripts eject"     // Eject config (irreversible)
  }
}
```

**Why We Use It:**
- Zero configuration
- Handles all build complexity
- Hot reload in development
- Optimized production builds

**Alternatives:**
- Vite (faster, modern)
- Next.js (SSR, framework)
- Parcel (zero config bundler)
- Custom Webpack setup

---

### 16. @apollo/client (^3.8.8)

**Category:** GraphQL Client  
**Size:** ~500KB  
**License:** MIT

**What it does:**
- GraphQL client for React
- Caching with InMemoryCache
- State management
- React hooks (useQuery, useMutation, useLazyQuery)
- Request/response link chain
- Automatic error handling

**Use Case in Our Project:**
- Connect React frontend to GraphQL backend
- Execute signup/login mutations
- Query user data
- Cache responses
- Automatically add JWT tokens to requests

**Example - Basic Setup:**
```javascript
import { ApolloClient, InMemoryCache, gql, useQuery } from '@apollo/client';

// Setup client
const client = new ApolloClient({
  uri: 'http://localhost:5000/graphql',
  cache: new InMemoryCache()
});

// Use in component
const GET_USERS = gql`
  query {
    users {
      id
      name
    }
  }
`;

function UserList() {
  const { loading, error, data } = useQuery(GET_USERS);
  
  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error!</p>;
  
  return (
    <ul>
      {data.users.map(user => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
```

**In Our Project - Advanced Setup:**
```javascript
// frontend/src/config/apolloClient.js

import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

// HTTP connection to GraphQL API
const httpLink = createHttpLink({
  uri: process.env.REACT_APP_GRAPHQL_URL || 'http://localhost:5000/graphql',
  credentials: 'include', // Include cookies
});

// Auth link - adds JWT token to every request
const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('accessToken');
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    }
  };
});

// Chain links: auth runs first, then http
const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          me: {
            merge(existing, incoming) {
              return incoming; // Always use fresh data
            },
          },
        },
      },
    },
  }),
  connectToDevTools: process.env.NODE_ENV === 'development',
});

export default client;
```

**In Our Project - Mutations:**
```javascript
// frontend/src/context/AuthContext.js

import { useMutation, gql } from '@apollo/client';

const SIGNUP_MUTATION = gql`
  mutation Signup($name: String!, $email: String!, $password: String!) {
    signup(name: $name, email: $email, password: $password) {
      success
      message
      accessToken
      refreshToken
      user {
        id
        name
        email
        roles
      }
    }
  }
`;

export const AuthProvider = ({ children }) => {
  const [signupMutation] = useMutation(SIGNUP_MUTATION);
  
  const signup = async (name, email, password) => {
    const { data } = await signupMutation({
      variables: { name, email, password }
    });
    
    if (data.signup.success) {
      localStorage.setItem('accessToken', data.signup.accessToken);
      setUser(data.signup.user);
    }
  };
};
```

**Key Features We Use:**
1. **Link Chaining** - Middleware pattern for requests
2. **Auth Link** - Auto-adds JWT to every request
3. **Cache** - Stores query results, prevents duplicate requests
4. **Hooks** - useMutation, useQuery for React integration
5. **Type Policies** - Custom cache behavior

**Why We Use It:**
- Official GraphQL client for React
- Better than fetch() - handles caching automatically
- Integrates with React hooks
- Middleware pattern (auth link)
- Essential for Okta interviews

**Interview Question:**
> "How does Apollo Client add JWT tokens to requests?"

**Answer:**
> "I use the `setContext` link from @apollo/client. It's middleware that runs before every request. I retrieve the token from localStorage and add it to the Authorization header. The auth link is chained with httpLink, so it runs first, adds the token, then httpLink sends the request. This follows the DRY principle - I don't need to manually add the token to every GraphQL call."

**Alternatives:**
- urql (lighter, simpler)
- React Query + fetch (REST-focused)
- SWR (Vercel, simpler)
- Direct fetch() calls (no caching)

---

### 17. graphql (^16.12.0) - Frontend

**Category:** GraphQL Core  
**Size:** ~1MB  
**License:** MIT

**What it does:**
- GraphQL JavaScript implementation
- Query parsing and validation
- Type system
- Required peer dependency for @apollo/client

**Use Case in Our Project:**
- Required by @apollo/client
- Parse GraphQL queries
- Type validation
- gql template literal tag

**In Our Project:**
```javascript
import { gql } from '@apollo/client';

// Define GraphQL queries/mutations
const LOGIN_MUTATION = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      success
      message
      accessToken
      user {
        id
        name
        email
      }
    }
  }
`;

const ME_QUERY = gql`
  query Me {
    me {
      id
      name
      email
      roles
      createdAt
    }
  }
`;
```

**Why We Use It:**
- Required peer dependency
- Enables gql`` syntax
- Type checking
- Query validation

**Note:** This is the same package as backend graphql, but used differently:
- **Backend:** Schema creation, type definitions
- **Frontend:** Query parsing with gql`` tag

**Alternatives:**
- None (standard GraphQL implementation)

---

### 18. react-router-dom (^7.9.6)

**Category:** Routing Library  
**Size:** ~70KB  
**License:** MIT

**What it does:**
- Client-side routing for React
- Protected routes (route guards)
- URL parameters and navigation
- Declarative routing
- History management

**Use Case in Our Project:**
- Navigate between login/signup/dashboard
- Protect authenticated routes
- Redirect after login/logout
- Handle 404 pages

**Example - Basic:**
```javascript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

function ProtectedRoute({ children }) {
  const isAuthenticated = localStorage.getItem('token');
  return isAuthenticated ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}
```

**In Our Project - Full Implementation:**
```javascript
// frontend/src/App.js

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ApolloProvider } from '@apollo/client';
import client from './config/apolloClient';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Auth from './component/Auth';
import Dashboard from './components/Dashboard';

function App() {
  return (
    <ApolloProvider client={client}>
      <AuthProvider>
        <Router>
          <div className="App">
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Auth />} />
              <Route path="/signup" element={<Auth />} />
              
              {/* Protected Routes */}
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } 
              />
              
              {/* Default Route */}
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </div>
        </Router>
      </AuthProvider>
    </ApolloProvider>
  );
}
```

**Protected Route Component:**
```javascript
// frontend/src/components/ProtectedRoute.js

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  // Show loading while checking auth
  if (loading) {
    return <div>Loading...</div>;
  }

  // Redirect if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Render protected component
  return children;
};

export default ProtectedRoute;
```

**Navigation with useNavigate:**
```javascript
// frontend/src/component/Auth.js

import { useNavigate } from 'react-router-dom';

const Auth = () => {
  const navigate = useNavigate();
  const { signup, login } = useAuth();
  
  const handleLogin = async () => {
    const result = await login(email, password);
    if (result.success) {
      navigate('/dashboard'); // Programmatic navigation
    }
  };
};
```

**Key Features We Use:**
1. **BrowserRouter** - HTML5 history API routing
2. **Routes & Route** - Declarative route definitions
3. **Navigate** - Redirect component
4. **useNavigate** - Programmatic navigation hook
5. **replace** - Replace history entry (prevent back button loop)

**Why We Use It:**
- Industry standard for React routing
- Declarative routing (easier to understand)
- Protected routes pattern
- Essential for SPAs (Single Page Applications)
- Required for Okta interview

**Route Guard Pattern:**
```
User visits /dashboard
        ↓
ProtectedRoute checks: Is user logged in?
        ↓
   YES: Render Dashboard
   NO: <Navigate to="/login" replace />
```

**Interview Question:**
> "How do you implement protected routes in React?"

**Answer:**
> "I create a ProtectedRoute component that wraps protected pages. It checks if the user is authenticated using the auth context. If authenticated, it renders the children. If not, it uses the Navigate component to redirect to /login with replace={true} to prevent back button loops. I also handle loading states to avoid flashing the login page while checking authentication."

**Alternatives:**
- React Router v5 (older, different API)
- Next.js routing (file-based)
- TanStack Router (type-safe)
- Reach Router (deprecated, merged into React Router)

---

## DevDependencies

### 19. nodemon (^3.0.1)

**Category:** Development Tool  
**Size:** ~3MB  
**License:** MIT

**What it does:**
- Auto-restarts server on file changes
- Watches files
- Development productivity

**Use Case in Our Project:**
- Development mode
- Auto-reload on code changes

**Example:**
```json
{
  "scripts": {
    "dev": "nodemon server.js"
  }
}
```

```bash
npm run dev
# Server restarts automatically when you save files
```

**Alternatives:**
- bun --watch (built-in with Bun)
- pm2 (production process manager)
- ts-node-dev (for TypeScript)

---

## Quick Reference Table

### Backend Dependencies

| Package | Category | Size | Use Case |
|---------|----------|------|----------|
| express | Framework | 200KB | Web server |
| apollo-server-express | GraphQL | 2MB | GraphQL API |
| bcryptjs | Security | 60KB | Password hashing |
| jsonwebtoken | Auth | 70KB | JWT tokens |
| mongoose | Database | 2MB | MongoDB ODM |
| redis | Cache | 500KB | Token storage |
| cors | Middleware | 20KB | Cross-origin |
| helmet | Security | 60KB | HTTP headers |
| express-rate-limit | Security | 40KB | Rate limiting |
| express-validator | Validation | 100KB | Input validation |
| cookie-parser | Middleware | 15KB | Cookie parsing |
| dotenv | Config | 20KB | Environment vars |
| nodemailer | Email | 300KB | Send emails |
| graphql | GraphQL | 1MB | GraphQL core |
| nodemon | Dev Tool | 3MB | Auto-restart |

### Frontend Dependencies

| Package | Category | Size | Use Case |
|---------|----------|------|----------|
| react | UI Library | 300KB | Build components |
| react-dom | Renderer | 150KB | Render to DOM |
| @apollo/client | GraphQL Client | 500KB | GraphQL queries |
| graphql | GraphQL Core | 1MB | Query parsing |
| react-router-dom | Routing | 70KB | Client routing |
| react-scripts | Build Tool | 50MB | CRA tooling |

---

## Package Alternatives

### Authentication
- **Passport.js** - Alternative auth middleware (more complex)
- **Auth0 SDK** - Managed auth service
- **Okta SDK** - Enterprise auth (for production)
- **NextAuth.js** - Auth for Next.js

### Database
- **Prisma** - Modern ORM (TypeScript-first)
- **TypeORM** - TypeScript ORM
- **Sequelize** - SQL ORM
- **MongoDB Native Driver** - No ODM

### GraphQL
- **graphql-yoga** - Modern GraphQL server
- **Mercurius** - Fast GraphQL for Fastify
- **GraphQL Helix** - Framework-agnostic

### Validation
- **Joi** - Schema validation
- **Yup** - Schema validation (smaller)
- **class-validator** - TypeScript decorators
- **Zod** - TypeScript-first validation

---

## Interview Questions

### "Which packages did you use and why?"

**Answer:**
> "I used Express.js as the main web framework because it's the industry standard and widely used at companies like Okta. For authentication, I implemented JWT with jsonwebtoken and bcryptjs for password hashing. I chose Apollo Server for GraphQL to provide a flexible query layer alongside REST. MongoDB with Mongoose handles data persistence, and Redis stores refresh tokens for security. I added Helmet for security headers and express-rate-limit to prevent brute force attacks."

### "Why bcryptjs instead of bcrypt?"

**Answer:**
> "bcryptjs is a pure JavaScript implementation, so it doesn't require C++ compilation. This makes it easier to deploy across different platforms. While bcrypt is faster because it's native, bcryptjs is sufficient for our use case and has no dependencies that could cause deployment issues."

### "How do you manage environment variables?"

**Answer:**
> "I use dotenv to load environment variables from a .env file in development. This keeps secrets out of the codebase. The .env file is in .gitignore, so it's never committed. For production, I'd use environment variables set in the hosting platform (Heroku, AWS, etc.) or a secrets manager like AWS Secrets Manager or HashiCorp Vault."

### "Why both REST and GraphQL?"

**Answer:**
> "REST is industry standard for authentication endpoints - it's simple, well-understood, and works great for login/signup. GraphQL provides flexibility for complex data queries on the frontend, reducing over-fetching and under-fetching. This hybrid approach gives us the best of both worlds: simplicity for auth, flexibility for data."

---

**Last Updated:** Nov 29, 2025  
**Total Dependencies:** 21 packages (15 backend + 6 frontend)  
**Project:** KTA Authentication System

---

## Installation Commands

### Backend
```bash
cd backend
bun install bcryptjs jsonwebtoken mongoose redis express-rate-limit helmet express-validator cookie-parser nodemailer apollo-server-express graphql dotenv
```

### Frontend
```bash
cd frontend
bun add @apollo/client@3.8.8 graphql react-router-dom
```

### DevDependencies
```bash
# Backend
cd backend
bun add -d nodemon

# Frontend (already included in CRA)
# react-scripts is included by default
```

