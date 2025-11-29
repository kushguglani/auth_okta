# 🔄 GraphQL Signup Flow - Complete Breakdown

> **Deep dive into how GraphQL processes authentication requests**
> Understanding every step from request to response

**Last Updated:** Nov 29, 2025

---

## 📋 Table of Contents

1. [REST vs GraphQL Flow Comparison](#rest-vs-graphql-flow-comparison)
2. [GraphQL Signup - Step-by-Step](#graphql-signup-step-by-step)
3. [Code Breakdown by File](#code-breakdown-by-file)
4. [Interview Questions](#interview-questions)

---

## 🔄 REST vs GraphQL Flow Comparison

### **REST API Flow** (Traditional)

```
Request: POST http://localhost:5000/api/auth/signup
Body: { "name": "John", "email": "john@example.com", "password": "SecurePass123" }

   ↓
1. server.js → app.use('/api', apiRoutes)
   ↓
2. routes/index.js → router.use('/auth', authRoutes)
   ↓
3. routes/auth.js → router.post('/signup', async (req, res) => { ... })
   ↓
4. Controller logic executes
   ↓
5. Returns JSON response with res.json()
```

**File Path:** `/Users/k0g0e6z/Desktop/ln/kta/backend/routes/auth.js`

**Code Example:**
```javascript
// routes/auth.js
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;  // ← Data from req.body
    
    // Validation & logic here...
    const user = await User.create({ name, email, password });
    
    res.json({  // ← Response via res.json()
      success: true,
      message: 'Account created!',
      user
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

### **GraphQL Flow** (Modern)

```
Request: POST http://localhost:5000/graphql
Body: { 
  "query": "mutation { signup(name: \"John\", email: \"john@example.com\", password: \"SecurePass123\") { success message user { id name email } } }" 
}

   ↓
1. Apollo Server intercepts at /graphql
   ↓
2. Parses the GraphQL query/mutation
   ↓
3. Validates against schema (typeDefs.js)
   ↓
4. Matches to resolver: Mutation.signup
   ↓
5. graphql/resolvers.js → signup: async (parent, { name, email, password }) => { ... }
   ↓
6. Resolver logic executes
   ↓
7. Returns data object (no res.json needed)
   ↓
8. Apollo formats and sends response
```

**File Path:** `/Users/k0g0e6z/Desktop/ln/kta/backend/graphql/resolvers.js`

**Code Example:**
```javascript
// resolvers.js
const resolvers = {
  Mutation: {
    signup: async (parent, { name, email, password }) => {  // ← Args from mutation
      try {
        // Validation & logic here...
        const user = await User.create({ name, email, password });
        
        return {  // ← Just return the object, no res.json()
          success: true,
          message: 'Account created!',
          user
        };
      } catch (error) {
        throw new Error('Signup failed: ' + error.message);
      }
    }
  }
};
```

---

### **Key Differences**

| Aspect | REST API | GraphQL |
|--------|----------|---------|
| **Entry Point** | `/api/auth/signup` | `/graphql` (single endpoint) |
| **Routing** | Express routes (`router.post()`) | GraphQL schema (type definitions) |
| **Handler** | `routes/auth.js` | `graphql/resolvers.js` |
| **Data Access** | `req.body` | Function parameters (destructured) |
| **Response** | `res.json()` | `return` statement |
| **Error Handling** | `res.status(500).json()` | `throw new Error()` |
| **Validation** | Middleware or manual | Schema + manual |
| **Multiple Endpoints** | Yes (`/signup`, `/login`, `/logout`) | No (single `/graphql`) |
| **Over/Under Fetching** | Common issue | Client specifies exact data |

---

### **File Structure Comparison**

```
backend/
├── routes/              ← REST API endpoints
│   ├── index.js         ← Combines all routes
│   └── auth.js          ← /api/auth/* handlers
│                           • Uses req.body, res.json()
│                           • Each route is separate
│
└── graphql/             ← GraphQL endpoints
    ├── typeDefs.js      ← Schema definitions (contract)
    ├── resolvers.js     ← Logic for mutations/queries
    │                       • Uses function params, return statement
    │                       • All operations through /graphql
    └── apolloServer.js  ← Apollo configuration
```

---

## 🎯 GraphQL Signup - Step-by-Step

### **Complete Request Example**

```bash
POST http://localhost:5000/graphql

Headers:
  Content-Type: application/json

Body:
{
  "query": "mutation { signup(name: \"John Doe\", email: \"john@example.com\", password: \"SecurePass123\") { success message accessToken user { id name email } } }"
}
```

---

### **STEP 1: Apollo Server Intercepts Request**

**File:** `backend/graphql/apolloServer.js`

**Code:**
```javascript
const startApolloServer = async (app, PORT) => {
  const server = createApolloServer();
  await server.start();
  
  // This registers the /graphql endpoint
  server.applyMiddleware({
    app,
    path: '/graphql',      // ← Intercepts all requests to /graphql
    cors: false
  });
};
```

**What Happens:**
- Express receives `POST /graphql`
- Apollo middleware intercepts the request
- Request is routed to Apollo Server (not normal Express routes)
- Apollo takes over request handling

**Why:**
- Apollo needs to parse GraphQL-specific syntax
- Regular Express routes can't handle GraphQL queries
- Middleware pattern allows Apollo to integrate with Express

---

### **STEP 2: Parse & Validate Query**

**File:** `backend/graphql/apolloServer.js`

**Code:**
```javascript
const createApolloServer = () => {
  return new ApolloServer({
    typeDefs,              // ← Schema definitions (validates structure)
    resolvers,             // ← Logic handlers
    // ... config
  });
};
```

**What Happens:**
1. Apollo extracts the mutation string from `req.body.query`
2. Parses it into an Abstract Syntax Tree (AST)
3. Validates syntax: `mutation { signup(...) }`
4. Checks if `signup` exists in schema

**Example Query Parsing:**
```graphql
mutation {
  signup(
    name: "John Doe"
    email: "john@example.com"
    password: "SecurePass123"
  ) {
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
```

**Parsed Structure:**
- **Operation:** `mutation`
- **Field:** `signup`
- **Arguments:** `{ name, email, password }`
- **Selection Set:** `{ success, message, accessToken, user { id, name, email } }`

---

### **STEP 3: Match to Schema Definition**

**File:** `backend/graphql/typeDefs.js`

**Code:**
```javascript
const typeDefs = gql`
  type Mutation {
    signup(
      name: String!       # ✅ Must provide (! means required)
      email: String!      # ✅ Must provide
      password: String!   # ✅ Must provide
    ): AuthPayload!       # ✅ Must return AuthPayload
  }
  
  type AuthPayload {
    success: Boolean!
    message: String!
    accessToken: String
    refreshToken: String
    user: User
  }
  
  type User {
    id: ID!
    name: String!
    email: String!
    roles: [String!]!
    # ... more fields
  }
`;
```

**What Happens:**
1. Apollo finds `signup` in `Mutation` type
2. Validates all required arguments are present:
   - ✅ `name: "John Doe"` → matches `name: String!`
   - ✅ `email: "john@example.com"` → matches `email: String!`
   - ✅ `password: "SecurePass123"` → matches `password: String!`
3. Validates return type matches `AuthPayload!`
4. Validates requested fields exist in `AuthPayload`:
   - ✅ `success` exists in AuthPayload
   - ✅ `message` exists in AuthPayload
   - ✅ `accessToken` exists in AuthPayload
   - ✅ `user { id, name, email }` - all fields exist in User type

**If Validation Fails:**
```javascript
// Missing required field
mutation { signup(name: "John") }  // ❌ Error: email required

// Wrong field name
mutation { signup(name: "John", email: "...", password: "...") { sucesss } }  
// ❌ Error: Field 'sucesss' doesn't exist on AuthPayload

// Wrong type
mutation { signup(name: 123, email: "...", password: "...") }
// ❌ Error: String expected, got Int
```

---

### **STEP 4: Find Resolver Function**

**File:** `backend/graphql/resolvers.js`

**Code:**
```javascript
const resolvers = {
  // ... other resolvers
  
  Mutation: {
    // This function is matched to the 'signup' mutation
    signup: async (parent, { name, email, password }) => {
      // ↑ This matches the schema definition
    }
  }
};
```

**What Happens:**
1. Apollo looks for `resolvers.Mutation.signup`
2. Finds the function
3. Prepares to call it with:
   - **parent:** Result from parent resolver (null for root mutations)
   - **args:** `{ name: "John Doe", email: "john@example.com", password: "SecurePass123" }`
   - **context:** `{ user: null, req: <Express Request> }` (from apolloServer.js context function)
   - **info:** Metadata about the query

**Resolver Function Signature:**
```javascript
signup: async (parent, args, context, info) => {
  // parent  - Parent resolver result (rarely used)
  // args    - { name, email, password }
  // context - { user, req } (set in apolloServer.js)
  // info    - Query metadata (field name, return type, etc.)
}
```

---

### **STEP 5: Execute Resolver Logic**

**File:** `backend/graphql/resolvers.js`

**Complete Code with Annotations:**

```javascript
signup: async (parent, { name, email, password }) => {
  try {
    // ============================================================
    // STEP 5a: Check if user exists
    // ============================================================
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new UserInputError('Email already registered');
      // ↑ GraphQL-specific error (Apollo provides this)
      // Will be caught by Apollo's error handler
    }

    // ============================================================
    // STEP 5b: Validate password strength
    // ============================================================
    if (password.length < 8) {
      throw new UserInputError('Password must be at least 8 characters');
    }

    // ============================================================
    // STEP 5c: Create user in MongoDB
    // ============================================================
    const user = await User.create({
      name,
      email,
      password  // ← Will be hashed by User model pre-save hook
    });
    
    // User model pre-save hook (in models/User.js):
    // userSchema.pre('save', async function() {
    //   if (!this.isModified('password')) return;
    //   const salt = await bcrypt.genSalt(10);
    //   this.password = await bcrypt.hash(this.password, salt);
    // });

    // ============================================================
    // STEP 5d: Generate JWT tokens
    // ============================================================
    const { accessToken, refreshToken } = generateTokens(user);
    
    // generateTokens helper function:
    // - Creates accessToken (expires in 15 minutes)
    // - Creates refreshToken (expires in 7 days)
    // - Signs with JWT_ACCESS_SECRET and JWT_REFRESH_SECRET

    // ============================================================
    // STEP 5e: Store refresh token in Redis
    // ============================================================
    await storeRefreshToken(user._id, refreshToken);
    
    // Stores in Redis with key: 'refresh_token:USER_ID'
    // TTL: 7 days

    // ============================================================
    // STEP 5f: Return response (matches AuthPayload schema)
    // ============================================================
    return {
      success: true,
      message: 'Account created successfully!',
      accessToken,
      refreshToken,
      user  // ← Mongoose document, Apollo serializes to User type
    };
    
  } catch (error) {
    // ============================================================
    // Error Handling
    // ============================================================
    if (error instanceof UserInputError) {
      throw error;  // Re-throw GraphQL errors
    }
    throw new Error('Signup failed: ' + error.message);
  }
}
```

**Helper Functions Used:**

```javascript
// Generate JWT tokens
const generateTokens = (user) => {
  const accessToken = jwt.sign(
    {
      userId: user._id,
      email: user.email,
      roles: user.roles
    },
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

// Store refresh token in Redis
const storeRefreshToken = async (userId, refreshToken) => {
  const redis = getRedisClient();
  const key = `refresh_token:${userId}`;
  await redis.set(key, refreshToken, 'EX', 7 * 24 * 60 * 60); // 7 days
};
```

---

### **STEP 6: Format & Return Response**

**File:** `backend/graphql/apolloServer.js`

**Code:**
```javascript
const createApolloServer = () => {
  return new ApolloServer({
    typeDefs,
    resolvers,
    
    // Custom error formatting
    formatError: (err) => {
      console.error('GraphQL Error:', err.message);
      
      return {
        message: err.message,
        code: err.extensions?.code || 'INTERNAL_SERVER_ERROR',
        ...(process.env.NODE_ENV !== 'production' && {
          stack: err.extensions?.exception?.stacktrace
        })
      };
    },
    
    // ... other config
  });
};
```

**What Happens:**
1. Resolver returns data object
2. Apollo validates return matches `AuthPayload` schema
3. Apollo serializes the response:
   - Mongoose User document → GraphQL User type
   - Only includes fields requested in query
4. Formats error if one occurred
5. Wraps in GraphQL response structure

**Success Response:**
```json
{
  "data": {
    "signup": {
      "success": true,
      "message": "Account created successfully!",
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NzRhMWIyYzNkNGU1ZjZnN2g4aTlqMGsiLCJlbWFpbCI6ImpvaG5AZXhhbXBsZS5jb20iLCJyb2xlcyI6WyJ1c2VyIl0sImlhdCI6MTczMjg4MDQwMCwiZXhwIjoxNzMyODgxMzAwfQ.xK2vL3mN4oP5qR6sT7uV8wX9yZ0aB1cD2eF3gH4iJ5k",
      "user": {
        "id": "674a1b2c3d4e5f6g7h8i9j0k",
        "name": "John Doe",
        "email": "john@example.com"
      }
    }
  }
}
```

**Error Response:**
```json
{
  "errors": [
    {
      "message": "Email already registered",
      "extensions": {
        "code": "BAD_USER_INPUT"
      }
    }
  ],
  "data": null
}
```

---

## 📁 Code Breakdown by File

### **1. apolloServer.js** - Apollo Configuration

**Purpose:** Configure and start Apollo Server

**Key Code:**
```javascript
// Register /graphql endpoint
server.applyMiddleware({
  app,
  path: '/graphql',
  cors: false
});

// Context: runs on EVERY request
context: ({ req }) => {
  const token = req.headers.authorization || '';
  let user = null;
  
  if (token) {
    try {
      user = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_ACCESS_SECRET);
    } catch (err) {
      console.log('Invalid token');
    }
  }
  
  return { user, req };
}
```

---

### **2. typeDefs.js** - Schema Definition

**Purpose:** Define GraphQL types and operations

**Key Code:**
```javascript
type Mutation {
  signup(name: String!, email: String!, password: String!): AuthPayload!
}

type AuthPayload {
  success: Boolean!
  message: String!
  accessToken: String
  refreshToken: String
  user: User
}

type User {
  id: ID!
  name: String!
  email: String!
  roles: [String!]!
}
```

**What it does:**
- Defines contract between client and server
- Validates input types
- Validates output types
- Auto-generates documentation

---

### **3. resolvers.js** - Business Logic

**Purpose:** Implement the actual signup logic

**Key Code:**
```javascript
const resolvers = {
  Mutation: {
    signup: async (parent, { name, email, password }) => {
      // 1. Validate
      // 2. Create user
      // 3. Generate tokens
      // 4. Return response
    }
  }
};
```

---

### **4. server.js** - Server Initialization

**Purpose:** Start Apollo Server and Express

**Key Code:**
```javascript
const startServer = async () => {
  await connectDB();
  await connectRedis();
  await startApolloServer(app, PORT);  // ← Registers /graphql
  
  // Error handlers MUST come after Apollo Server
  app.use((req, res) => { /* 404 */ });
  app.use((err, req, res, next) => { /* Error handler */ });
  
  app.listen(PORT);
};
```

**Important:** Error handlers must be registered AFTER Apollo Server starts!

---

## 🎓 Interview Questions

### Q1: Why use GraphQL over REST for authentication?

**Answer:**
- **Single endpoint** (`/graphql`) instead of multiple (`/signup`, `/login`, `/logout`)
- **Client controls data** - no over-fetching (only request fields you need)
- **Strong typing** - schema validates input/output automatically
- **Better error handling** - GraphQL errors are structured and predictable
- **Introspection** - clients can discover available operations

**But REST is better for:**
- Simple CRUD operations
- File uploads (easier with multipart/form-data)
- Caching (HTTP caching works better with REST)

---

### Q2: How does Apollo Server integrate with Express?

**Answer:**
```javascript
// Apollo becomes Express middleware
server.applyMiddleware({
  app,           // Express app instance
  path: '/graphql'  // Route to intercept
});

// Now Apollo handles all POST /graphql requests
// Express handles everything else
```

**Flow:**
1. Express receives request
2. Checks if path is `/graphql`
3. If yes → Apollo handles it
4. If no → Regular Express routes

---

### Q3: What's the difference between `req.body` in REST and function parameters in GraphQL?

**REST:**
```javascript
router.post('/signup', (req, res) => {
  const { name, email, password } = req.body;  // Manual extraction
  // No type validation
});
```

**GraphQL:**
```javascript
signup: async (parent, { name, email, password }) => {
  // Already destructured and type-validated by Apollo
  // Schema ensures types are correct
}
```

**Benefits of GraphQL approach:**
- Automatic type validation
- No need to manually parse `req.body`
- Clear function signature
- Schema serves as documentation

---

### Q4: How are errors handled differently in GraphQL vs REST?

**REST:**
```javascript
res.status(400).json({ error: 'Email exists' });  // Manual status codes
```

**GraphQL:**
```javascript
throw new UserInputError('Email exists');  // Structured error

// Apollo formats it as:
{
  "errors": [{
    "message": "Email exists",
    "extensions": { "code": "BAD_USER_INPUT" }
  }]
}
```

**Benefits:**
- Consistent error format
- Semantic error codes
- Stack traces in development
- No need to manage HTTP status codes (always 200 for GraphQL)

---

### Q5: Where does authentication context come from in GraphQL?

**Answer:**

**apolloServer.js:**
```javascript
context: ({ req }) => {
  const token = req.headers.authorization;
  const user = jwt.verify(token, SECRET);
  return { user, req };  // Available in ALL resolvers
}
```

**resolvers.js:**
```javascript
me: async (parent, args, context) => {
  // context.user comes from above
  if (!context.user) throw new AuthenticationError('Not logged in');
  return User.findById(context.user.userId);
}
```

**Why it's powerful:**
- Context runs once per request
- Available in all resolvers
- Centralized authentication logic
- No need to verify token in every resolver

---

## 🎯 Key Takeaways

1. **GraphQL uses a single endpoint** (`/graphql`) vs REST's multiple endpoints
2. **Schema is a contract** - validates all input/output automatically
3. **Resolvers are functions** - match schema mutations/queries 1:1
4. **Context is powerful** - share auth data across all resolvers
5. **Apollo integrates seamlessly** with Express via middleware
6. **Error handling is structured** - no manual HTTP status codes
7. **Type safety** - catch errors before they reach the database

---

**Next:** [Interview Preparation](./13-interview-prep.md)

