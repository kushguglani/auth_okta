# 6. REST vs GraphQL

[← Back to Table of Contents](./README.md)

---

## Side-by-Side Comparison

### Example: Get User with Posts

#### REST Approach

```javascript
// Request 1: Get user
GET /api/users/123
Response: {
  id: 123,
  name: "John",
  email: "john@example.com",
  // ... 50 other fields you don't need
}

// Request 2: Get user's posts
GET /api/users/123/posts
Response: [
  {
    id: 1,
    title: "Post 1",
    content: "...",
    authorId: 123
    // ... many other fields
  }
]

// Total: 2 HTTP requests
// Data: Got 100+ fields, only needed 5
```

#### GraphQL Approach

```graphql
# Single request
query {
  user(id: "123") {
    name
    email
    posts {
      title
      content
    }
  }
}

# Response: Exactly what we asked for
{
  "data": {
    "user": {
      "name": "John",
      "email": "john@example.com",
      "posts": [
        {
          "title": "Post 1",
          "content": "..."
        }
      ]
    }
  }
}

# Total: 1 HTTP request
# Data: Only the 5 fields we requested
```

---

## Feature Comparison

| Feature | REST | GraphQL |
|---------|------|---------|
| **Endpoints** | Multiple (one per resource) | Single (/graphql) |
| **Data Fetching** | Fixed response structure | Flexible queries |
| **Over-fetching** | Common | Never |
| **Under-fetching** | Common (N+1 problem) | Never |
| **Versioning** | Required (v1, v2) | Not needed |
| **Learning Curve** | Easy | Moderate |
| **Caching** | Easy (HTTP caching) | Complex |
| **File Upload** | Easy | Requires special handling |
| **Tooling** | Postman, curl | GraphiQL, Playground |
| **Type System** | No (unless OpenAPI) | Yes (built-in) |
| **Documentation** | Manual (Swagger) | Auto-generated |

---

## Hybrid Approach (Our Project)

We implement **BOTH** REST and GraphQL:

### REST API (Authentication)
```
POST /api/auth/login        → Login
POST /api/auth/signup       → Register
POST /api/auth/refresh      → Token refresh
POST /api/auth/logout       → Logout
```

**Why REST for Auth?**
- Industry standard
- Simple endpoints
- Well-understood
- Easy to test

### GraphQL API (Data Operations)
```
POST /graphql               → All data queries & mutations
```

**Why GraphQL for Data?**
- Flexible querying
- Nested data
- Reduce requests
- Better DX

---

## Decision Matrix

### Use REST When

✅ Simple CRUD operations  
✅ File uploads/downloads  
✅ Caching is critical  
✅ Team unfamiliar with GraphQL  
✅ Public API (simplicity)  
✅ HTTP caching benefits  

**Examples:**
- Authentication endpoints
- File upload service
- Webhook handlers
- Simple microservices

### Use GraphQL When

✅ Complex, nested data  
✅ Mobile apps (reduce bandwidth)  
✅ Multiple client types  
✅ Rapid frontend development  
✅ Data from multiple sources  
✅ Flexible querying needed  

**Examples:**
- Social media feeds
- E-commerce product catalogs
- Analytics dashboards
- Mobile applications

---

## Real-World Examples

### REST Example: Authentication

```javascript
// Login
POST /api/auth/login
Body: { email, password }
Response: { token, user }

// Get user profile
GET /api/users/me
Headers: { Authorization: 'Bearer token' }
Response: { id, name, email }

// Update profile
PUT /api/users/me
Body: { name: 'New Name' }
Response: { id, name, email }
```

**Why REST works here:**
- Simple operations
- Well-defined actions
- Standard HTTP methods
- Easy to cache

### GraphQL Example: Social Feed

```graphql
# Get feed with all related data
query {
  feed(limit: 10) {
    id
    content
    author {
      name
      avatar
      followerCount
    }
    comments(limit: 3) {
      text
      author {
        name
        avatar
      }
    }
    likes {
      count
      userLiked
    }
  }
}
```

**Why GraphQL works here:**
- Complex nested data
- Avoid N+1 queries
- Flexible requirements
- One request gets everything

---

## Migration Strategy

### Starting with REST → Adding GraphQL

1. **Keep existing REST endpoints**
2. **Add GraphQL layer**
3. **Gradually migrate frontend**
4. **Deprecate old endpoints**

```javascript
// Both coexist
app.use('/api/auth', authRoutes);     // REST
app.use('/graphql', graphqlServer);   // GraphQL
```

### Benefits of Hybrid

✅ Best of both worlds  
✅ Gradual migration  
✅ Team can learn GraphQL  
✅ Use right tool for job  

---

## Performance Comparison

### REST
```
3 separate requests:
1. GET /users/123        → 50ms
2. GET /posts?user=123   → 80ms  
3. GET /comments?post=1  → 60ms
Total: 190ms + network overhead
```

### GraphQL
```
1 request:
POST /graphql → 120ms
Total: 120ms
Savings: 37% faster
```

---

## Key Takeaways

1. **REST** is simple and well-understood
2. **GraphQL** is powerful and flexible
3. **Hybrid** gives you both benefits
4. Choose based on **use case**, not hype
5. Both have their place in modern apps

---

[← Previous: GraphQL Deep Dive](./05-graphql-deep-dive.md) | [Next: Redis Explained →](./07-redis-explained.md)

