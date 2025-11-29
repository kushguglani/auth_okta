# 12. Best Practices & Patterns

[← Back to Table of Contents](./README.md)

---

## Security Checklist ✅

### Authentication
- [ ] Hash passwords with bcrypt (10-12 rounds)
- [ ] Validate email format
- [ ] Enforce strong password policy
- [ ] Implement rate limiting on auth endpoints
- [ ] Use HTTPS in production
- [ ] Implement account lockout after failed attempts
- [ ] Send email verification
- [ ] Add password reset functionality

### Token Management
- [ ] Short-lived access tokens (15 min)
- [ ] Long-lived refresh tokens (7 days)
- [ ] Store tokens in httpOnly cookies
- [ ] Implement token refresh mechanism
- [ ] Blacklist tokens on logout
- [ ] Use strong JWT secrets (256-bit minimum)
- [ ] Rotate refresh tokens
- [ ] Validate tokens on every request

### Authorization
- [ ] Implement role-based access control
- [ ] Check permissions on backend (never trust client)
- [ ] Use middleware for route protection
- [ ] Validate user has required role/permission
- [ ] Log authorization failures

### Input Validation
- [ ] Validate all inputs on backend
- [ ] Sanitize user input
- [ ] Use validator libraries (express-validator)
- [ ] Prevent NoSQL injection
- [ ] Prevent XSS attacks

### Error Handling
- [ ] Don't expose sensitive info in errors
- [ ] Log errors securely
- [ ] Return generic messages to client
- [ ] Handle async errors properly

### Headers & Configuration
- [ ] Use Helmet.js for security headers
- [ ] Configure CORS properly
- [ ] Set secure cookie flags
- [ ] Implement CSP (Content Security Policy)

---

## Code Organization Patterns

### Folder Structure

```
backend/
├── config/           → Configuration
│   ├── database.js
│   └── redis.js
├── models/           → Data models
│   └── User.js
├── controllers/      → Business logic
│   └── authController.js
├── routes/           → Route definitions
│   └── auth.js
├── middleware/       → Reusable middleware
│   ├── authenticate.js
│   └── authorize.js
├── utils/            → Helper functions
│   ├── jwt.js
│   └── validators.js
├── graphql/          → GraphQL layer
│   ├── typeDefs.js
│   └── resolvers.js
└── server.js         → Entry point
```

---

## Error Handling Patterns

### Pattern 1: Custom Error Class

```javascript
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

// Use in controllers
if (!user) {
  throw new AppError('User not found', 404);
}

// Catch in error middleware
app.use((err, req, res, next) => {
  if (err.isOperational) {
    res.status(err.statusCode).json({ error: err.message });
  } else {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});
```

### Pattern 2: Async Handler

```javascript
const asyncHandler = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

// Use in routes
app.get('/api/users', asyncHandler(async (req, res) => {
  const users = await User.find();
  res.json(users);
}));
```

### Pattern 3: Response Helpers

```javascript
// Success response
const sendSuccess = (res, data, statusCode = 200) => {
  res.status(statusCode).json({
    success: true,
    data
  });
};

// Error response
const sendError = (res, message, statusCode = 400) => {
  res.status(statusCode).json({
    success: false,
    error: message
  });
};

// Usage
sendSuccess(res, { user }, 201);
sendError(res, 'Invalid credentials', 401);
```

---

## Security Patterns

### Pattern 1: JWT Helper Functions

```javascript
// utils/jwt.js
const generateAccessToken = (user) => {
  return jwt.sign(
    { userId: user._id, email: user.email, roles: user.roles },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: '15m' }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    { userId: user._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
};

const verifyToken = (token, secret) => {
  try {
    return jwt.verify(token, secret);
  } catch (error) {
    throw new Error('Invalid token');
  }
};
```

### Pattern 2: Password Validation

```javascript
// utils/validators.js
const validatePassword = (password) => {
  const minLength = 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[@$!%*?&]/.test(password);

  if (password.length < minLength) {
    return { valid: false, message: 'Password must be at least 8 characters' };
  }
  if (!hasUppercase) {
    return { valid: false, message: 'Password must contain uppercase letter' };
  }
  if (!hasLowercase) {
    return { valid: false, message: 'Password must contain lowercase letter' };
  }
  if (!hasNumber) {
    return { valid: false, message: 'Password must contain a number' };
  }
  if (!hasSpecial) {
    return { valid: false, message: 'Password must contain special character' };
  }

  return { valid: true };
};
```

---

## Database Patterns

### Pattern 1: Model Methods

```javascript
// models/User.js
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

UserSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  return user;
};

// Usage
const user = await User.findOne({ email });
const isValid = await user.comparePassword(password);
```

### Pattern 2: Query Helpers

```javascript
UserSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

// Usage
const user = await User.findByEmail('john@example.com');
```

---

## Testing Patterns

### Pattern 1: Test Setup

```javascript
beforeEach(async () => {
  await User.deleteMany({});
  await createTestUser();
});

afterEach(async () => {
  await User.deleteMany({});
});
```

### Pattern 2: Test Helpers

```javascript
const createTestUser = async () => {
  return await User.create({
    name: 'Test User',
    email: 'test@example.com',
    password: 'Password123!'
  });
};

const loginTestUser = async () => {
  const response = await request(app)
    .post('/api/auth/login')
    .send({ email: 'test@example.com', password: 'Password123!' });
  return response.body.token;
};
```

---

## Key Principles

1. **Security First** - Always prioritize security
2. **Validate Everything** - Never trust client input
3. **Fail Securely** - Default to denying access
4. **Keep Secrets Secret** - Use environment variables
5. **Log Strategically** - Log errors, not sensitive data
6. **Test Thoroughly** - Write tests for critical paths
7. **Document Clearly** - Explain complex logic
8. **Refactor Regularly** - Keep code clean

---

[← Previous: Common Pitfalls](./11-common-pitfalls.md) | [Next: Interview Prep →](./13-interview-prep.md)
