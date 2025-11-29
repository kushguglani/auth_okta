# 10. Authentication & Authorization Plan

[← Back to Table of Contents](./README.md)

---

## 🎯 Complete Implementation Roadmap

### Phase 1: Foundation Setup ⚙️ (COMPLETED ✅)

**Goal:** Set up database, Redis, GraphQL, and base configuration

**Completed Tasks:**
- ✅ Install all packages (bcryptjs, jsonwebtoken, mongoose, redis, apollo-server, etc.)
- ✅ Setup MongoDB connection
- ✅ Setup Redis connection (with in-memory fallback)
- ✅ Setup Apollo Server (GraphQL)
- ✅ Create User model with schema
- ✅ Create GraphQL schema (typeDefs)
- ✅ Create GraphQL resolvers
- ✅ Environment configuration (.env)

---

### Phase 2: Password Security 🔐

**Goal:** Implement bcrypt password hashing

**Status:** ✅ COMPLETED

**Implementation:**
```javascript
// Hash password before saving
const hashedPassword = await bcrypt.hash(password, 10);

// Compare password during login
const isMatch = await bcrypt.compare(inputPassword, hashedPassword);
```

**Why it's secure:**
- Can't reverse hash to get original password
- Each hash is unique (even for same password)
- Brute force takes years

---

### Phase 3: JWT Implementation 🎫

**Goal:** Implement token-based authentication

**Token Types:**

1. **Access Token** (Short-lived: 15 minutes)
```javascript
{
  userId: "123",
  email: "user@example.com",
  roles: ["user"],
  exp: 1638124356  // 15 min from now
}
```

2. **Refresh Token** (Long-lived: 7 days)
```javascript
{
  userId: "123",
  type: "refresh",
  exp: 1638728156  // 7 days from now
}
```

**Token Refresh Flow:**
```
1. User logs in
2. Server sends: Access Token (15min) + Refresh Token (7 days)
3. Client stores both tokens
4. Client makes API calls with Access Token
5. After 15 min, Access Token expires
6. Client sends Refresh Token to get new Access Token
7. Server validates Refresh Token → Issues new Access Token
8. Repeat until Refresh Token expires (7 days)
9. User must login again
```

---

### Phase 4: Auth Endpoints 🌐

**Endpoints to Build:**

1. **POST /api/auth/signup** - Create account
2. **POST /api/auth/login** - Login user
3. **POST /api/auth/refresh** - Refresh access token
4. **POST /api/auth/logout** - Logout (blacklist token)
5. **GET /api/auth/me** - Get current user
6. **POST /api/auth/verify-email** - Email verification
7. **POST /api/auth/forgot-password** - Password reset request
8. **POST /api/auth/reset-password** - Password reset

---

### Phase 5: Middleware & Guards 🛡️

**1. Authentication Middleware**
```javascript
const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  
  const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
  req.user = await User.findById(decoded.userId);
  next();
};
```

**2. Authorization Middleware (Role-Based)**
```javascript
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user.roles.some(role => roles.includes(role))) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};
```

**3. Rate Limiting**
```javascript
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many login attempts, please try again later'
});
```

---

### Phase 6: Token Management 🔄

**Features:**

1. **Token Blacklist (for logout)**
```javascript
await redis.set(`blacklist:${token}`, '1', 'EX', 900); // 15 min
```

2. **Refresh Token Storage**
```javascript
await redis.set(`refresh:${userId}`, refreshToken, 'EX', 604800); // 7 days
```

3. **Automatic Refresh (Frontend)**
```javascript
axios.interceptors.response.use(
  response => response,
  async error => {
    if (error.response.status === 401 && !error.config._retry) {
      const newToken = await refreshAccessToken();
      error.config.headers.Authorization = `Bearer ${newToken}`;
      return axios(error.config);
    }
  }
);
```

---

### Phase 7: Frontend Integration 💻

**1. AuthContext**
```javascript
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  
  const login = async (email, password) => {
    const { data } = await axios.post('/api/auth/login', { email, password });
    localStorage.setItem('accessToken', data.accessToken);
    setUser(data.user);
  };
  
  return <AuthContext.Provider value={{ user, login }}>
    {children}
  </AuthContext.Provider>;
};
```

**2. Protected Route**
```javascript
const ProtectedRoute = ({ children, roles = [] }) => {
  const { user } = useAuth();
  
  if (!user) return <Navigate to="/login" />;
  
  if (roles.length && !roles.some(r => user.roles.includes(r))) {
    return <Navigate to="/unauthorized" />;
  }
  
  return children;
};
```

---

### Phase 8: Role-Based Access Control 👥

**Role Types:**
```javascript
const ROLES = {
  USER: 'user',
  MODERATOR: 'moderator',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin'
};

const PERMISSIONS = {
  READ_POSTS: 'read:posts',
  CREATE_POSTS: 'create:posts',
  DELETE_POSTS: 'delete:posts',
  MANAGE_USERS: 'manage:users'
};
```

---

### Phase 9: Security Hardening 🔒

**Security Measures:**

1. **Helmet.js** - Security headers
2. **CORS Configuration** - Restrict origins
3. **Cookie Security** - httpOnly, secure, sameSite
4. **Input Sanitization** - Prevent XSS, NoSQL injection
5. **Brute Force Protection** - Rate limiting
6. **Password Policy** - Strong password requirements

---

## Progress Tracker

| Phase | Status | Completion |
|-------|--------|------------|
| Phase 1: Foundation | ✅ | 100% |
| Phase 2: Password Security | ✅ | 100% |
| Phase 3: JWT | 🔄 | 50% |
| Phase 4: Auth Endpoints | 🔄 | 40% |
| Phase 5: Middleware | 🔄 | 30% |
| Phase 6: Token Management | ⏳ | 0% |
| Phase 7: Frontend | ⏳ | 0% |
| Phase 8: RBAC | ⏳ | 0% |
| Phase 9: Security | 🔄 | 20% |

---

[← Previous: Code Refactoring](./09-code-refactoring.md) | [Next: Common Pitfalls →](./11-common-pitfalls.md)
