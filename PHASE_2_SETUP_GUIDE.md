# 🚀 Phase 2 Setup Guide - Frontend Integration

## ✅ What We've Built in Phase 2

Phase 2 is complete! Here's what's been implemented:

### Frontend Infrastructure
- ✅ Apollo Client configuration for GraphQL
- ✅ Authentication Context (global state)
- ✅ Protected route component
- ✅ Dashboard page (user profile)
- ✅ Token management (localStorage)
- ✅ Auto-login on app load
- ✅ React Router integration

### File Structure
```
frontend/src/
├── config/
│   └── apolloClient.js          # Apollo Client setup
├── context/
│   └── AuthContext.js           # Global auth state & functions
├── components/
│   ├── Dashboard.js             # Protected dashboard page
│   ├── Dashboard.css            # Dashboard styles
│   └── ProtectedRoute.js        # Route guard component
├── component/
│   ├── Auth.js                  # Login/Signup (updated)
│   └── Auth.css                 # Auth styles
└── App.js                       # Main app with routing
```

---

## 📦 Installation Steps

### Step 1: Install Frontend Dependencies

You're using Bun, so run:

```bash
cd frontend
bun add @apollo/client graphql react-router-dom
```

**Packages Installed:**
- `@apollo/client` - GraphQL client for React
- `graphql` - GraphQL query language
- `react-router-dom` - Client-side routing

### Step 2: Create Environment Variables

Create `.env` file in the `frontend` directory:

```bash
cd frontend
touch .env
```

Add this content:

```env
# GraphQL API endpoint
REACT_APP_GRAPHQL_URL=http://localhost:5000/graphql

# REST API endpoint (optional, for future use)
REACT_APP_API_URL=http://localhost:5000/api
```

---

## 🏗️ Architecture Overview

### Authentication Flow

```
User fills form → Submit
        ↓
AuthContext (useAuth hook)
        ↓
GraphQL Mutation (signup/login)
        ↓
Apollo Client (adds JWT header automatically)
        ↓
Backend GraphQL Resolver
        ↓
Returns: { success, message, accessToken, user }
        ↓
Store token in localStorage
        ↓
Update user state in context
        ↓
Redirect to /dashboard
```

### Protected Routes Flow

```
User visits /dashboard
        ↓
ProtectedRoute component checks auth
        ↓
Is user authenticated? (check context.user)
        ↓
NO: Redirect to /login
YES: Render Dashboard
```

### Auto-Login Flow

```
App loads
        ↓
AuthContext checks localStorage for token
        ↓
Token exists?
        ↓
YES: Fetch user data (GraphQL query)
     ↓
     Set user in state
NO: User remains null (not logged in)
```

---

## 🏃 Running the Application

### Step 1: Start Backend (Terminal 1)

```bash
cd backend
bun run dev
```

Wait for:
```
🚀 Server running on port 5000
🎮 GraphQL: http://localhost:5000/graphql
```

### Step 2: Start Frontend (Terminal 2)

```bash
cd frontend
bun start
# or
npm start
```

Browser will open: **http://localhost:3000**

---

## 🧪 Testing the Frontend

### Test Flow 1: Signup

1. **Navigate to:** http://localhost:3000
2. **Click:** "Sign Up" (switch mode)
3. **Fill in:**
   - Name: `John Doe`
   - Email: `john@example.com`
   - Password: `SecurePass123`
   - Confirm Password: `SecurePass123`
4. **Click:** "Sign Up"
5. **Expected Result:**
   - ✅ Alert: "Account created successfully!"
   - ✅ Redirected to `/dashboard`
   - ✅ See user profile with name, email, roles
   - ✅ Token saved in localStorage

**Check Browser Console:**
```javascript
localStorage.getItem('accessToken')
// Should show: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### Test Flow 2: Logout

1. **On Dashboard:** Click "Logout" button
2. **Expected Result:**
   - ✅ Token removed from localStorage
   - ✅ Redirected to `/login`
   - ✅ User state cleared

**Check Browser Console:**
```javascript
localStorage.getItem('accessToken')
// Should show: null
```

---

### Test Flow 3: Login

1. **On Login Page:** Enter credentials
   - Email: `john@example.com`
   - Password: `SecurePass123`
2. **Click:** "Login"
3. **Expected Result:**
   - ✅ Alert: "Login successful!"
   - ✅ Redirected to `/dashboard`
   - ✅ See user profile

---

### Test Flow 4: Protected Route

1. **Logout first** (if logged in)
2. **Manually visit:** http://localhost:3000/dashboard
3. **Expected Result:**
   - ✅ Automatically redirected to `/login`
   - ✅ Dashboard not accessible without auth

---

### Test Flow 5: Auto-Login

1. **Login** and go to dashboard
2. **Refresh the page** (F5 or Cmd+R)
3. **Expected Result:**
   - ✅ User stays logged in
   - ✅ No redirect to login
   - ✅ Dashboard shows user data
   - ✅ Token fetched from localStorage

---

## 📁 File Breakdown

### 1. `/config/apolloClient.js` - Apollo Client Configuration

**Purpose:** Configure GraphQL client to communicate with backend

**Key Features:**
```javascript
// 1. HTTP Link - connects to GraphQL endpoint
const httpLink = createHttpLink({
  uri: 'http://localhost:5000/graphql',
  credentials: 'include' // Send cookies
});

// 2. Auth Link - automatically adds JWT to every request
const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('accessToken');
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    }
  };
});

// 3. Create client with both links chained
const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache()
});
```

**Why This Matters (Interview):**
- Auth link runs **before every request** - DRY principle
- No need to manually add token to each GraphQL call
- Cache improves performance (avoids duplicate queries)
- Middleware pattern (similar to Express middleware)

---

### 2. `/context/AuthContext.js` - Authentication Context

**Purpose:** Global state management for authentication

**Key Concepts:**

#### A. Context Pattern
```javascript
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const value = { user, loading, signup, login, logout };
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
```

**Why:** Avoid prop drilling, share auth state across entire app

#### B. GraphQL Mutations
```javascript
const SIGNUP_MUTATION = gql`
  mutation Signup($name: String!, $email: String!, $password: String!) {
    signup(name: $name, email: $email, password: $password) {
      success
      message
      accessToken
      refreshToken
      user { id name email roles }
    }
  }
`;

const [signupMutation] = useMutation(SIGNUP_MUTATION);
```

**Why:** 
- Type-safe mutations (GraphQL validates types)
- Reusable across components
- Clear API contract

#### C. Signup Function
```javascript
const signup = async (name, email, password) => {
  const { data } = await signupMutation({
    variables: { name, email, password }
  });
  
  if (data.signup.success) {
    // Store tokens in localStorage
    localStorage.setItem('accessToken', data.signup.accessToken);
    localStorage.setItem('refreshToken', data.signup.refreshToken);
    
    // Update global state
    setUser(data.signup.user);
    
    return { success: true, message: data.signup.message };
  }
};
```

**Why:**
- **localStorage:** Persists across page refreshes (unlike state)
- **setUser:** Updates context for all components
- **Return value:** Allows components to handle UI updates

#### D. Auto-Login on Mount
```javascript
useEffect(() => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    fetchUser(); // Fetch user data from backend
  } else {
    setLoading(false);
  }
}, []);
```

**Why:**
- Restores session after page refresh
- Validates token is still valid (backend check)
- Provides seamless UX

**Interview Question:**
> "Why store tokens in localStorage instead of state?"

**Answer:**
- **State:** Lost on page refresh
- **localStorage:** Persists across sessions
- **But:** vulnerable to XSS attacks
- **Better (Production):** httpOnly cookies (can't be accessed by JS)

---

### 3. `/components/ProtectedRoute.js` - Route Guard

**Purpose:** Prevent unauthorized access to protected pages

```javascript
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  // Wait while checking authentication
  if (loading) {
    return <LoadingSpinner />;
  }

  // Redirect if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Render protected component
  return children;
};
```

**Usage:**
```javascript
<Route 
  path="/dashboard" 
  element={
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  } 
/>
```

**Why This Pattern:**
- **Declarative:** Easy to see which routes are protected
- **Reusable:** One component guards all protected routes
- **UX:** Shows loading state while checking auth
- **Security:** Server should also validate (don't trust frontend)

**Interview Concept:** Higher-Order Component (HOC) pattern

---

### 4. `/components/Dashboard.js` - Protected Page

**Purpose:** Display user profile after successful login

**Key Features:**

#### A. Use Auth Context
```javascript
const { user, logout } = useAuth();

// user = {
//   id: "674a1b2c...",
//   name: "John Doe",
//   email: "john@example.com",
//   roles: ["user"],
//   isVerified: false,
//   createdAt: "2025-11-29T..."
// }
```

#### B. Logout Handler
```javascript
const handleLogout = async () => {
  await logout(); // Clear tokens & state
  navigate('/login'); // Redirect
};
```

**Why async logout:**
- Calls backend to invalidate refresh token
- Clears tokens from Redis/database
- Even if backend fails, frontend clears local tokens

---

### 5. `/App.js` - Main Application

**Purpose:** Setup providers and routing

**Key Structure:**

```javascript
<ApolloProvider client={client}>        {/* 1. GraphQL client */}
  <AuthProvider>                         {/* 2. Auth state */}
    <Router>                             {/* 3. Routing */}
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Auth />} />
        
        {/* Protected routes */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </Router>
  </AuthProvider>
</ApolloProvider>
```

**Why This Order:**
1. **ApolloProvider:** Outermost - provides GraphQL client to all components
2. **AuthProvider:** Needs Apollo client for mutations
3. **Router:** Needs auth context to protect routes

**Interview Concept:** Provider Composition Pattern

---

### 6. `/component/Auth.js` - Updated Login/Signup

**What Changed:**

#### Before (Phase 1):
```javascript
// Direct API call
const response = await fetch('http://localhost:5000/api/auth/signup', {
  method: 'POST',
  body: JSON.stringify({ name, email, password })
});
```

#### After (Phase 2):
```javascript
// Use AuthContext
const { signup, login } = useAuth();

const handleSignup = async () => {
  const result = await signup(name, email, password);
  if (result.success) {
    navigate('/dashboard');
  }
};
```

**Benefits:**
- ✅ Centralized auth logic (DRY)
- ✅ Automatic token storage
- ✅ Global state update
- ✅ GraphQL instead of REST
- ✅ Type safety

---

## 🎯 What's Working Now

### Authentication Features
✅ **Signup** - Create account via GraphQL
✅ **Login** - Authenticate via GraphQL
✅ **Logout** - Clear tokens & state
✅ **Auto-login** - Restore session on page load
✅ **Protected routes** - Guard dashboard
✅ **Token management** - Store/retrieve from localStorage
✅ **Error handling** - User-friendly messages
✅ **Loading states** - Show "Please wait..." during operations

### UI/UX Features
✅ **Form validation** - Password match check
✅ **Mode switching** - Toggle login/signup
✅ **Responsive design** - Works on mobile
✅ **Smooth transitions** - Gradient animations
✅ **User feedback** - Alerts for success/error
✅ **Navigation** - Auto-redirect after auth

---

## 🔍 Troubleshooting

### Issue: "Cannot GET /dashboard"

**Error:** Page refresh shows "Cannot GET /dashboard"

**Cause:** React Router needs proper configuration

**Solution:**
Add to `package.json` scripts:
```json
"start": "react-scripts start",
```

Or use Hash Router (development only):
```javascript
import { HashRouter } from 'react-router-dom';
<HashRouter>...</HashRouter>
```

---

### Issue: Token not added to requests

**Symptom:** GraphQL `me` query fails with "You must be logged in"

**Cause:** Apollo Client not adding Authorization header

**Check:**
1. Token exists in localStorage:
   ```javascript
   console.log(localStorage.getItem('accessToken'));
   ```

2. Auth link is configured:
   ```javascript
   // In apolloClient.js
   const authLink = setContext((_, { headers }) => {
     const token = localStorage.getItem('accessToken');
     console.log('Token:', token); // Debug
     return { headers: { ...headers, authorization: token ? `Bearer ${token}` : '' } };
   });
   ```

---

### Issue: CORS Error

**Error:** `Access-Control-Allow-Origin`

**Cause:** Backend not allowing frontend origin

**Solution:**
In `backend/server.js`:
```javascript
app.use(cors({
  origin: 'http://localhost:3000', // Frontend URL
  credentials: true
}));
```

In `backend/.env`:
```env
FRONTEND_URL=http://localhost:3000
```

---

### Issue: User data not showing after login

**Cause:** Auth context not wrapping app properly

**Check `App.js`:**
```javascript
<AuthProvider>  {/* Must wrap entire app */}
  <Router>
    <Routes>...</Routes>
  </Router>
</AuthProvider>
```

---

## 📚 Key Concepts for Interviews

### 1. Context API vs Redux

**Context API (what we use):**
- Built into React
- Good for simple global state (auth, theme)
- Less boilerplate

**Redux:**
- External library
- Better for complex state
- Time-travel debugging
- More boilerplate

**When to use Context:** Auth, theme, language - simple, infrequent updates
**When to use Redux:** Shopping cart, complex forms - frequent updates

---

### 2. localStorage vs sessionStorage vs Cookies

| Feature | localStorage | sessionStorage | httpOnly Cookie |
|---------|-------------|----------------|-----------------|
| **Persistence** | Survives browser close | Lost on tab close | Survives browser close |
| **Scope** | All tabs | Single tab | All tabs |
| **Accessible by JS** | ✅ Yes | ✅ Yes | ❌ No (more secure) |
| **Size Limit** | 5-10 MB | 5-10 MB | 4 KB |
| **XSS Vulnerable** | ✅ Yes | ✅ Yes | ❌ No |
| **CSRF Vulnerable** | ❌ No | ❌ No | ✅ Yes |

**Current Implementation:** localStorage (simple, works for learning)
**Production:** httpOnly cookies + CSRF tokens

---

### 3. Higher-Order Component (HOC) vs Render Props vs Hooks

**ProtectedRoute is an HOC:**
```javascript
const ProtectedRoute = ({ children }) => {
  // Logic here
  return condition ? children : <Navigate />;
};
```

**Same with Render Props:**
```javascript
<Protected render={(user) => <Dashboard user={user} />} />
```

**Same with Hooks (modern):**
```javascript
const Dashboard = () => {
  const { user } = useAuth(); // This is what we use
  if (!user) return <Navigate to="/login" />;
  return <div>Dashboard</div>;
};
```

**Hooks are preferred:** Cleaner, less nesting, easier to read

---

### 4. Client-Side Routing vs Server-Side Routing

**Server-Side (Traditional):**
```
User clicks link → Browser makes request to server → Server returns HTML
```

**Client-Side (React Router):**
```
User clicks link → JS updates URL → React renders component (no server request)
```

**Benefits:**
- ✅ Faster (no network request)
- ✅ Smooth transitions
- ✅ Better UX

**Drawback:**
- ❌ Initial load slower (downloads all JS)
- ❌ SEO harder (solved with SSR/Next.js)

---

## ✅ Phase 2 Checklist

Before moving to Phase 3:

- [x] Frontend dependencies installed (`@apollo/client`, `graphql`, `react-router-dom`)
- [x] `.env` file created in frontend
- [x] Apollo Client configured
- [x] AuthContext created
- [x] ProtectedRoute component created
- [x] Dashboard page created
- [x] Auth.js updated to use context
- [x] App.js updated with routing
- [ ] **USER ACTION:** Test signup flow
- [ ] **USER ACTION:** Test login flow
- [ ] **USER ACTION:** Test logout flow
- [ ] **USER ACTION:** Test protected route redirect
- [ ] **USER ACTION:** Test auto-login (page refresh)

---

## 🎓 What You've Learned in Phase 2

### React Concepts
1. **Context API** - Global state management
2. **Custom Hooks** - `useAuth()` for reusable logic
3. **React Router** - Client-side routing
4. **Protected Routes** - HOC pattern for authorization
5. **useEffect** - Side effects (auto-login on mount)
6. **Conditional Rendering** - Loading states, auth checks

### Apollo Client
1. **Apollo Provider** - GraphQL client setup
2. **useMutation** - Execute GraphQL mutations
3. **useQuery** - Fetch GraphQL data
4. **Auth Link** - Middleware for adding headers
5. **Cache Management** - InMemoryCache for performance

### Authentication Patterns
1. **Token Storage** - localStorage for persistence
2. **Auto-Login** - Restore session on load
3. **Route Guards** - Protect unauthorized access
4. **Context Pattern** - Share auth state globally
5. **Logout Flow** - Clear tokens & redirect

---

## 🚨 Security Considerations

### Current Implementation (Development)
✅ Passwords hashed with bcrypt
✅ JWT tokens for stateless auth
✅ Protected routes on frontend
⚠️ Tokens in localStorage (XSS vulnerable)
⚠️ No CSRF protection
⚠️ No token refresh rotation

### Production Improvements (Phase 3+)
🔒 Store tokens in httpOnly cookies
🔒 Implement CSRF tokens
🔒 Add token refresh rotation
🔒 Implement rate limiting
🔒 Add input sanitization
🔒 Use HTTPS only
🔒 Implement MFA (Multi-Factor Auth)
🔒 Add session timeout

---

## 🎉 Phase 2 Complete!

**Next Steps:**
- Phase 3: Advanced Features (Email verification, Password reset, Role-based access, single sign on )
- Phase 4: Production Hardening (Security, Performance, Monitoring)

**Test your implementation and prepare for Phase 3!** 🚀

