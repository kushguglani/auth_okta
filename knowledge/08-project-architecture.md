# 8. Project Architecture

[← Back to Table of Contents](./README.md)

---

## Current File Structure

```
kta/
├── backend/
│   ├── config/
│   │   ├── database.js       # MongoDB connection
│   │   └── redis.js          # Redis with fallback
│   ├── models/
│   │   └── User.js           # User model + bcrypt
│   ├── graphql/
│   │   ├── typeDefs.js       # GraphQL schema
│   │   ├── resolvers.js      # GraphQL resolvers
│   │   └── apolloServer.js   # Apollo Server setup
│   ├── routes/
│   │   ├── index.js          # Main routes
│   │   └── auth.js           # Auth routes
│   ├── server.js             # Main server file
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── component/
│   │   │   ├── Auth.js       # Login/Signup component
│   │   │   └── Auth.css      # Auth styling
│   │   ├── App.js            # Main app component
│   │   ├── App.css
│   │   ├── index.js
│   │   └── index.css
│   └── package.json
├── knowledge/                 # Documentation (NEW!)
│   ├── README.md
│   ├── 01-project-overview.md
│   ├── 02-express-deep-dive.md
│   └── ...
├── package.json              # Root scripts
├── .gitignore
├── README.md
└── KNOWLEDGE_BASE.md         # Legacy (can be removed)
```

---

## Backend API Endpoints

### General Routes
```
GET  /                  → Welcome message
GET  /api/health        → Health check
GET  /api/hello         → Test endpoint
```

### Auth Routes (REST)
```
POST /api/auth/signup   → Create new account
POST /api/auth/login    → Login user
POST /api/auth/refresh  → Refresh access token (planned)
POST /api/auth/logout   → Logout user (planned)
```

### GraphQL Endpoint
```
POST /graphql           → All GraphQL queries/mutations
GET  /graphql           → GraphQL Playground (dev only)
```

---

## Request/Response Examples

### Signup (REST)

**Request:**
```javascript
POST /api/auth/signup
Body: {
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securePass123"
}
```

**Response (201 Created):**
```javascript
{
  "success": true,
  "message": "Account created successfully!",
  "user": {
    "id": "1638123456789",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

### Login (REST)

**Request:**
```javascript
POST /api/auth/login
Body: {
  "email": "john@example.com",
  "password": "securePass123"
}
```

**Response (200 OK):**
```javascript
{
  "success": true,
  "message": "Login successful!",
  "user": {
    "id": "1",
    "name": "John Doe",
    "email": "john@example.com"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### GraphQL Query

**Request:**
```graphql
query {
  users {
    id
    name
    email
  }
}
```

**Response:**
```javascript
{
  "data": {
    "users": [
      {
        "id": "1",
        "name": "John Doe",
        "email": "john@example.com"
      }
    ]
  }
}
```

---

## Frontend Components

### Auth Component (Auth.js)

**Features:**
- ✅ Toggle between Login/Signup
- ✅ Form validation
- ✅ API integration
- ✅ Password confirmation
- ✅ Error handling
- ✅ Success messages

**State Management:**
```javascript
const [isLogin, setIsLogin] = useState(true);
const [formData, setFormData] = useState({
  name: '',
  email: '',
  password: '',
  confirmPassword: ''
});
```

---

## Database Schema

### User Model

```javascript
{
  name: String,
  email: String (unique, indexed),
  password: String (hashed with bcrypt),
  roles: [String],              // ['user', 'admin']
  isVerified: Boolean,
  verificationToken: String,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  loginAttempts: Number,
  lockUntil: Date,
  createdAt: Date,
  updatedAt: Date
}
```

---

## Technology Stack

### Runtime
- **Bun** - Fast JavaScript runtime & package manager

### Backend
- **Express.js** - Web framework
- **Apollo Server** - GraphQL server
- **MongoDB** - Database
- **Mongoose** - ODM
- **Redis** - Caching & session management
- **bcryptjs** - Password hashing
- **jsonwebtoken** - JWT authentication

### Frontend
- **React 18** - UI library
- **Axios** - HTTP client
- **Apollo Client** - GraphQL client
- **React Router** - Routing (planned)

### Security
- **Helmet** - Security headers
- **CORS** - Cross-origin resource sharing
- **express-rate-limit** - Rate limiting (planned)
- **express-validator** - Input validation (planned)

---

## Data Flow

### Login Flow

```
1. User enters credentials in React form
2. Frontend sends POST /api/auth/login
3. Express route handler receives request
4. Find user in MongoDB
5. bcrypt.compare(password, hashedPassword)
6. Generate JWT token
7. Return token + user data
8. Frontend stores token
9. Frontend redirects to dashboard
```

### GraphQL Query Flow

```
1. Frontend sends GraphQL query
2. Apollo Server receives request
3. Validates query against schema
4. Calls resolver function
5. Resolver queries MongoDB
6. Data returned to Apollo Server
7. Apollo Server formats response
8. Frontend receives data
```

---

## Environment Variables

```env
# Server
PORT=5000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/kta
MONGODB_TEST_URI=mongodb://localhost:27017/kta-test

# Redis
REDIS_URL=redis://localhost:6379
USE_REDIS_FALLBACK=true

# JWT
JWT_ACCESS_SECRET=your-super-secret-access-key-change-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# Frontend
FRONTEND_URL=http://localhost:3000
```

---

## Planned Architecture Improvements

1. **Middleware folder** - Organize middleware
2. **Controllers folder** - Business logic
3. **Utils folder** - Helper functions
4. **Validators folder** - Input validation
5. **Tests folder** - Unit & integration tests
6. **Logs folder** - Application logs

---

[← Previous: Redis Explained](./07-redis-explained.md) | [Next: Code Refactoring →](./09-code-refactoring.md)

