# 1. Project Overview

[← Back to Table of Contents](./README.md)

---

## What We're Building

A **production-grade authentication system** similar to Facebook/Google authentication with:
- User registration & login
- JWT-based authentication
- Token refresh mechanism
- Role-based authorization
- Security hardening

---

## Tech Stack

```
Runtime:   Bun (Fast JavaScript runtime & package manager)
Frontend:  React 18 + Axios + Apollo Client + React Router
Backend:   Node.js/Bun + Express + GraphQL (Apollo Server) + MongoDB + Redis
API:       REST + GraphQL (Dual approach)
Security:  JWT + bcrypt + Helmet + Rate Limiting
```

---

## Current Status

✅ Basic boilerplate created  
✅ Login/Signup UI implemented  
✅ Basic REST API endpoints created  
🔄 Adding GraphQL API layer  
🔄 Moving to production-level auth (Phase 1 starting)

---

## Project Goals

### Learning Objectives
1. Master Express.js and middleware concepts
2. Understand GraphQL vs REST APIs
3. Implement production-level authentication
4. Learn security best practices
5. Prepare for Okta interview

### Technical Objectives
1. Build scalable authentication system
2. Implement both REST and GraphQL
3. Use Redis for session management
4. Apply security hardening techniques
5. Follow industry best practices

---

## Why This Tech Stack?

### Bun
- **Faster than npm/yarn** - Quick installs and builds
- **Built-in TypeScript support** - Better developer experience
- **Drop-in replacement** - Compatible with Node.js

### React
- **Most popular frontend framework** - Industry standard
- **Component-based** - Reusable UI elements
- **Large ecosystem** - Tons of libraries and resources

### Express
- **Simple and flexible** - Easy to learn, powerful to use
- **Middleware-based** - Modular architecture
- **Industry standard** - Used by Netflix, Uber, etc.

### GraphQL
- **Flexible queries** - Get exactly what you need
- **Single endpoint** - Simpler API management
- **Strongly typed** - Better developer experience
- **Modern approach** - Trending in industry

### MongoDB
- **NoSQL database** - Flexible schema
- **JSON-like documents** - Works well with JavaScript
- **Scalable** - Easy to scale horizontally

### Redis
- **In-memory cache** - Extremely fast
- **Session storage** - Perfect for tokens
- **Automatic expiration** - Built-in TTL

---

## Next Steps

1. Complete Phase 1: Foundation Setup
2. Implement JWT authentication
3. Add role-based authorization
4. Security hardening
5. Frontend integration

---

[Next: Express.js Deep Dive →](./02-express-deep-dive.md)

