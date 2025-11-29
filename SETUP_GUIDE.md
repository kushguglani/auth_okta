# 🚀 Setup Guide - Phase 1 Complete!

## ✅ What We've Built

Phase 1 is complete! Here's what's been implemented:

### Backend Infrastructure
- ✅ MongoDB connection with Mongoose
- ✅ Redis connection (with in-memory fallback)
- ✅ User model with bcrypt password hashing
- ✅ GraphQL API with Apollo Server
- ✅ REST API endpoints
- ✅ JWT authentication
- ✅ Security headers with Helmet
- ✅ CORS configuration

### File Structure
```
backend/
├── config/
│   ├── database.js      # MongoDB connection
│   └── redis.js         # Redis connection
├── models/
│   └── User.js          # User model with password hashing
├── graphql/
│   ├── typeDefs.js      # GraphQL schema
│   └── resolvers.js     # GraphQL resolvers
├── server.js            # Main server file
├── package.json
└── .env.example         # Environment template
```

---

## 📦 Installation Steps

### Step 1: Install Backend Dependencies

You're using Bun, so run:

```bash
cd backend
bun install bcryptjs jsonwebtoken mongoose redis express-rate-limit helmet express-validator cookie-parser nodemailer apollo-server-express graphql dotenv
```

### Step 2: Setup Environment Variables

Create a `.env` file in the `backend` directory:

```bash
cd backend
touch .env
```

Then add this content (you can copy from `.env.example`):

```env
# Server
PORT=5000
NODE_ENV=development

# MongoDB (choose one):
# Option 1: Local MongoDB
MONGODB_URI=mongodb://localhost:27017/kta_auth

# Option 2: MongoDB Atlas (free tier)
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/kta_auth

# JWT Secrets (IMPORTANT: Generate new ones!)
JWT_ACCESS_SECRET=your-super-secret-access-key-min-256-bits
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-256-bits

# JWT Expiration
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

### Step 3: MongoDB Setup

**Option A: Local MongoDB** (Recommended for learning)
```bash
# Install MongoDB (macOS with Homebrew)
brew install mongodb-community

# Start MongoDB
brew services start mongodb-community

# MongoDB will run on: mongodb://localhost:27017
```

**Option B: MongoDB Atlas** (Free cloud database)
1. Go to https://www.mongodb.com/cloud/atlas
2. Create free account
3. Create a cluster (free tier)
4. Get connection string
5. Update `MONGODB_URI` in `.env`

### Step 4: Generate JWT Secrets

Generate secure JWT secrets:

```bash
# Run this in terminal
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Run it **twice** and update both secrets in `.env`:
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`

---

## 🏃 Running the Server

### Start Backend

```bash
cd backend
bun run dev
```

You should see:

```
🔧 Starting server initialization...

✅ MongoDB Connected: localhost
📊 Database: kta_auth
⚠️  Using in-memory store (development mode)
💡 For production, set REDIS_URL in .env
🎮 GraphQL Playground: http://localhost:5000/graphql

==================================================
🚀 Server running on port 5000
📡 REST API: http://localhost:5000/api
🎮 GraphQL: http://localhost:5000/graphql
🌍 Environment: development
==================================================
```

---

## 🧪 Testing the APIs

### 1. Test REST API

**Health Check:**
```bash
curl http://localhost:5000/api/health
```

**Signup (REST):**
```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "SecurePass123"
  }'
```

**Login (REST):**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123"
  }'
```

### 2. Test GraphQL API

Open GraphQL Playground: **http://localhost:5000/graphql**

**Signup (GraphQL - Browser Playground):**
```graphql
mutation {
  signup(
    name: "Jane Doe"
    email: "jane@example.com"
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

**Signup (Postman/curl):**
```bash
# Method: POST
# URL: http://localhost:5000/graphql
# Headers: Content-Type: application/json

curl -X POST http://localhost:5000/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation Signup($name: String!, $email: String!, $password: String!) { signup(name: $name, email: $email, password: $password) { success message accessToken user { id name email roles } } }",
    "variables": {
      "name": "Jane Doe",
      "email": "jane@example.com",
      "password": "SecurePass123"
    }
  }'
```

**OR Simplified (without variables):**
```bash
curl -X POST http://localhost:5000/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { signup(name: \"Jane Doe\", email: \"jane@example.com\", password: \"SecurePass123\") { success message accessToken user { id name email } } }"
  }'
```

**Login (GraphQL - Browser Playground):**
```graphql
mutation {
  login(
    email: "jane@example.com"
    password: "SecurePass123"
  ) {
    success
    message
    accessToken
    user {
      id
      name
      email
      roles
    }
  }
}
```

**Login (Postman/curl):**
```bash
# Method: POST
# URL: http://localhost:5000/graphql
# Headers: Content-Type: application/json

curl -X POST http://localhost:5000/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation Login($email: String!, $password: String!) { login(email: $email, password: $password) { success message accessToken refreshToken user { id name email roles } } }",
    "variables": {
      "email": "jane@example.com",
      "password": "SecurePass123"
    }
  }'
```

**OR Simplified:**
```bash
curl -X POST http://localhost:5000/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { login(email: \"jane@example.com\", password: \"SecurePass123\") { success message accessToken user { id name email } } }"
  }'
```

**Get Current User (Protected - requires token):**
```bash
# Replace YOUR_TOKEN with actual token from login response

curl -X POST http://localhost:5000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "query": "query { me { id name email roles createdAt } }"
  }'
```

### Postman Setup Instructions

**1. Create New Request:**
- Method: `POST`
- URL: `http://localhost:5000/graphql`

**2. Set Headers:**
```
Content-Type: application/json
```

**3. Body (raw JSON):**
```json
{
  "query": "mutation { signup(name: \"John Doe\", email: \"john@example.com\", password: \"SecurePass123\") { success message accessToken user { id name email } } }"
}
```

**4. For Protected Queries (add Authorization header):**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**5. Using Variables (Better Practice):**

Body:
```json
{
  "query": "mutation Signup($name: String!, $email: String!, $password: String!) { signup(name: $name, email: $email, password: $password) { success message accessToken user { id name email } } }",
  "variables": {
    "name": "John Doe",
    "email": "john@example.com",
    "password": "SecurePass123"
  }
}
```

**Get Current User (requires token):**
```graphql
# First, add token to HTTP Headers (bottom left in Playground):
{
  "Authorization": "Bearer YOUR_TOKEN_HERE"
}

# Then run query:
query {
  me {
    id
    name
    email
    roles
    createdAt
  }
}
```

**Health Check:**
```graphql
query {
  health
}
```

---

## 🎯 What's Working

### Authentication Features
✅ User signup with password hashing (bcrypt)
✅ User login with credential verification
✅ JWT token generation (access + refresh)
✅ Password strength requirements (8+ chars)
✅ Email uniqueness validation
✅ Account lockout after 5 failed attempts
✅ Automatic password hashing on save

### API Features
✅ REST endpoints for auth
✅ GraphQL mutations for auth
✅ GraphQL queries for user data
✅ Protected routes (require authentication)
✅ JWT context in GraphQL resolvers
✅ Error handling & validation

### Security Features
✅ Helmet security headers
✅ CORS configuration
✅ Password hashing (bcrypt, 10 rounds)
✅ JWT tokens (15min access, 7day refresh)
✅ Environment variables for secrets
✅ Input validation

---

## 🔍 Troubleshooting

### Issue: MongoDB Connection Failed

**Error:** `MongoServerError: connect ECONNREFUSED`

**Solution:**
```bash
# Make sure MongoDB is running
brew services start mongodb-community

# Or use MongoDB Atlas (cloud)
```

### Issue: Module Not Found

**Error:** `Cannot find module 'bcryptjs'`

**Solution:**
```bash
cd backend
bun install
```

### Issue: Invalid Token

**Error:** `Invalid token` or `jwt malformed`

**Solution:**
- Make sure you're sending token in header: `Authorization: Bearer YOUR_TOKEN`
- Generate a new token by logging in again
- Check JWT secrets are set in `.env`

---

## 📚 Next Steps

### Phase 2: Frontend Integration

1. Install frontend dependencies
2. Setup Apollo Client
3. Create AuthContext
4. Connect Auth component to GraphQL
5. Implement token refresh logic

### Phase 3: Advanced Features

1. Email verification
2. Password reset flow
3. Role-based authorization
4. Rate limiting
5. Refresh token rotation

---

## 🎓 Learning Points

### What You've Learned

1. **Express.js**: Server setup, middleware, routing
2. **GraphQL**: Schema, resolvers, mutations, queries
3. **MongoDB**: Mongoose models, schemas, indexes
4. **Authentication**: JWT, bcrypt, password hashing
5. **Security**: Helmet, CORS, environment variables
6. **Error Handling**: Try-catch, error middleware
7. **Async/Await**: Promise handling in Node.js

### Key Concepts

**Password Hashing:**
- Never store plain text passwords
- Use bcrypt with salt rounds (10+)
- Hashing is one-way (can't be reversed)

**JWT Tokens:**
- Access token: Short-lived (15min)
- Refresh token: Long-lived (7 days)
- Stateless authentication
- Encoded but not encrypted (don't put secrets in payload)

**GraphQL vs REST:**
- REST: Multiple endpoints, fixed responses
- GraphQL: Single endpoint, flexible queries
- GraphQL: No over/under-fetching

---

## 🚨 Important Security Notes

⚠️ **Before Production:**

1. Change JWT secrets to secure random strings
2. Use HTTPS in production
3. Enable MongoDB authentication
4. Use actual Redis (not in-memory)
5. Set `NODE_ENV=production`
6. Remove GraphQL Playground in production
7. Add rate limiting
8. Enable CSRF protection

---

## ✅ Checklist

Before moving to Phase 2:

- [ ] Backend dependencies installed with Bun
- [ ] `.env` file created with all variables
- [ ] MongoDB running (local or Atlas)
- [ ] JWT secrets generated and added to `.env`
- [ ] Server starts without errors
- [ ] Can signup via REST API
- [ ] Can login via REST API
- [ ] Can signup via GraphQL
- [ ] Can login via GraphQL
- [ ] Can query `me` with valid token
- [ ] GraphQL Playground accessible

---

**🎉 Phase 1 Complete! Ready for Phase 2!**

