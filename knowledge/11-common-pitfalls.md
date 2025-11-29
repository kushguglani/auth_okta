# 11. Common Pitfalls & Solutions

[← Back to Table of Contents](./README.md)

---

## Pitfall 1: Storing Tokens in localStorage

### ❌ Problem

```javascript
// VULNERABLE TO XSS
localStorage.setItem('token', accessToken);
```

**Why it's bad:**
- JavaScript can access it
- XSS attacks can steal it
- Malicious scripts can read it

### ✅ Solution

```javascript
// Use httpOnly cookies
res.cookie('accessToken', token, {
  httpOnly: true,    // JavaScript can't access
  secure: true,      // HTTPS only
  sameSite: 'strict' // CSRF protection
});
```

---

## Pitfall 2: Not Validating Tokens

### ❌ Problem

```javascript
// Trusting the client
app.get('/api/user', (req, res) => {
  const userId = req.body.userId; // From client!
  const user = await User.findById(userId);
  res.json(user);
});
```

**Why it's bad:**
- Client can send any userId
- No authentication
- Security breach

### ✅ Solution

```javascript
// Verify token and use decoded data
app.get('/api/user', authenticate, async (req, res) => {
  const user = await User.findById(req.user.id);
  res.json(user);
});
```

---

## Pitfall 3: Long-Lived Access Tokens

### ❌ Problem

```javascript
// Token valid for 30 days
const token = jwt.sign(payload, secret, { expiresIn: '30d' });
```

**Why it's bad:**
- If stolen, attacker has access for 30 days
- Can't easily revoke
- Security risk

### ✅ Solution

```javascript
// Short access token + refresh token
const accessToken = jwt.sign(payload, secret, { expiresIn: '15m' });
const refreshToken = jwt.sign(payload, secret, { expiresIn: '7d' });
```

---

## Pitfall 4: Weak Password Requirements

### ❌ Problem

```javascript
// Accepting weak passwords
if (password.length >= 6) {
  // Create account
}
```

**Why it's bad:**
- Easy to brute force
- "123456" would be valid
- Security risk

### ✅ Solution

```javascript
// Strong password validation
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

if (!passwordRegex.test(password)) {
  throw new Error('Password must contain: 8+ chars, uppercase, lowercase, number, special char');
}
```

---

## Pitfall 5: Not Handling Token Expiration

### ❌ Problem

```javascript
// No automatic refresh
axios.get('/api/data', {
  headers: { Authorization: `Bearer ${expiredToken}` }
});
// Gets 401 error, user has to login again
```

**Why it's bad:**
- Poor user experience
- Users logged out frequently
- Frustrating

### ✅ Solution

```javascript
// Axios interceptor for auto-refresh
axios.interceptors.response.use(
  response => response,
  async error => {
    if (error.response.status === 401 && !error.config._retry) {
      error.config._retry = true;
      const newToken = await refreshAccessToken();
      error.config.headers.Authorization = `Bearer ${newToken}`;
      return axios(error.config);
    }
  }
);
```

---

## Pitfall 6: Exposing Secrets

### ❌ Problem

```javascript
// Hardcoded secrets
const JWT_SECRET = 'mysecret123';
const token = jwt.sign(payload, 'mysecret123');
```

**Why it's bad:**
- Visible in code repository
- Anyone can forge tokens
- Security breach

### ✅ Solution

```javascript
// Environment variables
require('dotenv').config();
const token = jwt.sign(payload, process.env.JWT_SECRET);

// .env file (never commit!)
JWT_SECRET=veryLongRandomString256BitMinimumSecureKey!@#$
```

---

## Pitfall 7: No Rate Limiting

### ❌ Problem

```javascript
// No protection
app.post('/api/auth/login', loginController);
// Attacker can try millions of passwords
```

**Why it's bad:**
- Brute force attacks
- DDoS vulnerability
- Server overload

### ✅ Solution

```javascript
// Rate limiting
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: 'Too many attempts, try again later'
});

app.post('/api/auth/login', loginLimiter, loginController);
```

---

## Pitfall 8: Not Sanitizing Input

### ❌ Problem

```javascript
// Accepting raw input
const user = await User.findOne({ email: req.body.email });
```

**Why it's bad:**
- NoSQL injection attacks
- XSS vulnerabilities
- Data corruption

### ✅ Solution

```javascript
// Sanitize and validate
const { body, validationResult } = require('express-validator');

app.post('/login', 
  body('email').isEmail().normalizeEmail(),
  body('password').trim().notEmpty(),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    // Process login...
  }
);
```

---

## Pitfall 9: Poor Error Messages

### ❌ Problem

```javascript
// Revealing too much information
if (!user) {
  return res.status(404).json({ error: 'User not found in database' });
}
if (!isPasswordValid) {
  return res.status(401).json({ error: 'Password incorrect for this user' });
}
```

**Why it's bad:**
- Helps attackers enumerate users
- Reveals system internals
- Security risk

### ✅ Solution

```javascript
// Generic error messages
if (!user || !isPasswordValid) {
  return res.status(401).json({ error: 'Invalid credentials' });
}
```

---

## Pitfall 10: Middleware Order

### ❌ Problem

```javascript
// Wrong order
app.get('/api/data', (req, res) => {
  res.json(req.body); // undefined!
});
app.use(express.json()); // Too late!
```

### ✅ Solution

```javascript
// Correct order
app.use(express.json()); // Parser runs first
app.get('/api/data', (req, res) => {
  res.json(req.body); // Works!
});
```

---

## Quick Reference

| Pitfall | Solution |
|---------|----------|
| localStorage tokens | httpOnly cookies |
| No token validation | authenticate middleware |
| Long-lived tokens | Short access + refresh tokens |
| Weak passwords | Strong password policy |
| No token refresh | Axios interceptors |
| Exposed secrets | Environment variables |
| No rate limiting | express-rate-limit |
| Raw input | Sanitize & validate |
| Detailed errors | Generic messages |
| Wrong middleware order | Define before routes |

---

[← Previous: Auth Plan](./10-auth-plan.md) | [Next: Best Practices →](./12-best-practices.md)
