# 13. Interview Preparation

[← Back to Table of Contents](./README.md)

---

## Key Concepts for Okta Interview

### 1. Authentication vs Authorization

**Authentication**: "Who are you?"
- Verifies identity
- Login process
- Confirms credentials
- Example: Username + Password

**Authorization**: "What can you do?"
- Verifies permissions
- Access control
- Checks roles/permissions
- Example: Admin vs User access

```
Login Page → Authentication → "You are John Doe" ✅
Admin Panel → Authorization → "You can access admin features" ✅ or ❌
```

---

### 2. OAuth 2.0 Flow

**Authorization Code Flow (Most Secure):**

```
1. User clicks "Login with Google"
2. App redirects to Google
3. User logs in at Google
4. Google redirects back with Authorization Code
5. App exchanges Code for Access Token
6. App uses Access Token to get user data
```

**Key Terms:**
- **Client**: Your application
- **Resource Owner**: User
- **Authorization Server**: Okta/Google/etc.
- **Resource Server**: API with protected data

---

### 3. OpenID Connect (OIDC)

OAuth 2.0 + Identity Layer = OIDC

**Adds:**
- ID Token (JWT with user info)
- UserInfo endpoint
- Standardized claims

```javascript
// ID Token payload
{
  sub: "1234567890",        // Subject (user ID)
  name: "John Doe",
  email: "john@example.com",
  iss: "https://accounts.okta.com",
  aud: "your-client-id",
  exp: 1638124356,
  iat: 1638123456
}
```

---

### 4. Token Security

**Best Practices:**
- ✅ Use HTTPS always
- ✅ Short expiration for access tokens (15 min)
- ✅ Long expiration for refresh tokens (7 days)
- ✅ Store tokens in httpOnly cookies
- ✅ Implement token rotation
- ✅ Use strong secret keys (256-bit minimum)
- ✅ Validate tokens on every request
- ✅ Implement token blacklist for logout

**Common Vulnerabilities:**
- ❌ Storing tokens in localStorage (XSS risk)
- ❌ Long-lived access tokens
- ❌ Weak secret keys
- ❌ No token expiration
- ❌ No token rotation
- ❌ Exposed secret keys in client

---

### 5. Session vs Token Authentication

**Session-Based:**
```
Login → Server creates session → Session ID in cookie →
Every request sends cookie → Server looks up session → Response
```

**Pros:** ✅ Server control, ✅ Easy to revoke  
**Cons:** ❌ Server memory, ❌ Doesn't scale, ❌ CORS issues

**Token-Based (JWT):**
```
Login → Server creates JWT → Client stores token →
Every request sends token in header → Server verifies token → Response
```

**Pros:** ✅ Stateless, ✅ Scalable, ✅ Works with CORS  
**Cons:** ❌ Can't revoke easily, ❌ Larger than session ID

---

## Common Interview Questions & Answers

### Q: How does JWT work?

**A:** JWT contains three parts:
1. **Header** - Algorithm + token type
2. **Payload** - User data/claims
3. **Signature** - Verification

Server signs the token with a secret key. Client includes token in requests. Server verifies signature to ensure it hasn't been tampered with.

---

### Q: Why use refresh tokens?

**A:** Security through short access token expiration.
- Access token expires in 15 min (limited damage if stolen)
- Refresh token gets new access token without re-login
- Can revoke refresh tokens (logout)
- Best of both worlds: security + UX

---

### Q: How do you prevent XSS attacks?

**A:** Multiple layers:
1. Sanitize all user input
2. Use httpOnly cookies for tokens
3. Content Security Policy headers
4. Escape output in templates
5. Use modern frameworks (React auto-escapes)
6. Validate and sanitize on server

---

### Q: Explain CORS and why it's needed?

**A:** Same-Origin Policy prevents frontend (port 3000) from accessing backend (port 5000) for security.

CORS allows controlled cross-origin requests:
- Server adds `Access-Control-Allow-Origin` header
- Browser checks header and allows request
- Prevents malicious sites from accessing your API

---

### Q: What's the difference between encryption and hashing?

**A:**

**Encryption:** Two-way (can decrypt)
- Symmetric: Same key for encrypt/decrypt (AES)
- Asymmetric: Public/private key pair (RSA)
- Use: Protecting data in transit/storage

**Hashing:** One-way (cannot reverse)
- Same input always produces same output
- Tiny change = completely different hash
- Use: Passwords, data integrity
- Examples: bcrypt, SHA-256

---

### Q: How do you handle password resets securely?

**A:**
1. User requests reset
2. Generate random token (crypto.randomBytes)
3. Hash token and store in database with expiration
4. Send unhashed token via email
5. User clicks link with token
6. Verify token matches hashed version
7. Check not expired
8. Allow password change
9. Invalidate token

---

### Q: What is rate limiting and why is it important?

**A:** Rate limiting restricts number of requests a user can make in a time window.

**Why important:**
- Prevents brute force attacks
- Protects against DDoS
- Reduces server load
- Fair usage

**Implementation:**
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // 100 requests per window
});

app.use('/api/', limiter);
```

---

### Q: Explain the N+1 problem in GraphQL

**A:** N+1 problem occurs when you make 1 query to get a list, then N queries to get related data for each item.

**Problem:**
- Query 1: Get 10 users
- Query 2-11: Get posts for each user (10 queries!)

**Solution: DataLoader**
- Batches and caches database requests
- Turns N+1 queries into 2 queries

```javascript
const DataLoader = require('dataloader');

const postLoader = new DataLoader(async (userIds) => {
  const posts = await Post.find({ userId: { $in: userIds } });
  return userIds.map(id => posts.filter(p => p.userId === id));
});
```

---

### Q: How do you secure API keys and secrets?

**A:**
1. **Never hardcode** - Use environment variables
2. **Never commit** - Add .env to .gitignore
3. **Use secrets management** - AWS Secrets Manager, HashiCorp Vault
4. **Rotate regularly** - Change keys periodically
5. **Limit scope** - Use different keys for different environments
6. **Monitor usage** - Log and alert on unusual activity

---

### Q: What is CSRF and how do you prevent it?

**A:** Cross-Site Request Forgery - attacker tricks user into making unwanted requests.

**Prevention:**
1. **SameSite cookies** - `sameSite: 'strict'`
2. **CSRF tokens** - Random token per session
3. **Double submit cookies** - Cookie + header must match
4. **Check Referer header** - Verify request origin
5. **Custom headers** - Require X-Requested-With header

---

## GraphQL Interview Questions

### Q: What are the advantages of GraphQL over REST?

**A:**
- No over-fetching (get only what you need)
- No under-fetching (get everything in one request)
- Single endpoint (easier to manage)
- Strongly typed (catches errors early)
- Self-documenting (schema is the docs)
- Flexible (clients control response shape)

### Q: When would you choose REST over GraphQL?

**A:**
- Simple CRUD operations
- File uploads/downloads
- Caching is critical (HTTP caching)
- Team unfamiliar with GraphQL
- Need maximum performance (REST is simpler)

---

## Behavioral Interview Tips

1. **Use STAR method** - Situation, Task, Action, Result
2. **Be specific** - Use real examples from this project
3. **Show learning** - Explain what you learned
4. **Ask questions** - Show genuine interest
5. **Be honest** - Don't claim expertise you don't have

---

## Project Talking Points

**This Project Demonstrates:**
- ✅ Full-stack development (React + Node.js)
- ✅ Authentication & Authorization
- ✅ REST API design
- ✅ GraphQL implementation
- ✅ Database design (MongoDB)
- ✅ Caching strategies (Redis)
- ✅ Security best practices
- ✅ Code organization
- ✅ Error handling
- ✅ Testing strategies

---

[← Previous: Best Practices](./12-best-practices.md) | [Next: Process Signals →](./14-process-signals.md)
