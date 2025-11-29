# 5. GraphQL Deep Dive

[← Back to Table of Contents](./README.md)

---

## 🤔 What is GraphQL?

**GraphQL is a query language for APIs** - developed by Facebook in 2012, open-sourced in 2015.

Think of it as a more efficient, flexible alternative to REST APIs.

---

## REST vs GraphQL - The Problem GraphQL Solves

### REST API Problems

**1. Over-fetching** (Getting too much data)
```javascript
// REST: Get user
GET /api/users/123

// You get 50+ fields but only needed 2! ❌
```

**2. Under-fetching** (Need multiple requests)
```javascript
// REST: Need 4+ requests for related data
GET /api/users/123
GET /api/posts?userId=123
GET /api/users/456  // author 1
GET /api/users/789  // author 2
// N+1 problem! ❌
```

**3. Multiple Endpoints**
```javascript
GET  /api/users
GET  /api/users/:id
POST /api/users
GET  /api/posts
// ... 50+ endpoints to maintain! ❌
```

### GraphQL Solution

**1. No Over-fetching**
```graphql
query {
  user(id: 123) {
    name
    email
  }
}
# Get ONLY what you asked for! ✅
```

**2. No Under-fetching**
```graphql
query {
  user(id: 123) {
    name
    email
    posts {
      title
      author { name }
    }
  }
}
# Everything in ONE request! ✅
```

**3. Single Endpoint**
```
POST /graphql
(All operations go here)
```

---

## GraphQL Core Concepts

### 1. Schema (Type Definitions)

The schema defines **what data is available** and **what operations you can perform**.

```graphql
type User {
  id: ID!           # ! means required
  name: String!
  email: String!
  age: Int
  posts: [Post]     # Array of posts
}

type Post {
  id: ID!
  title: String!
  content: String!
  author: User!
}

type Query {
  user(id: ID!): User
  users: [User]
  posts(limit: Int): [Post]
}

type Mutation {
  createUser(name: String!, email: String!, password: String!): User
  updateUser(id: ID!, name: String): User
  deleteUser(id: ID!): Boolean
  login(email: String!, password: String!): AuthPayload
}

type AuthPayload {
  token: String!
  user: User!
}
```

### 2. Queries (Read Data)

```graphql
# Get single user
query {
  user(id: "123") {
    name
    email
  }
}

# Get user with nested data
query {
  user(id: "123") {
    name
    posts {
      title
      content
    }
  }
}

# Multiple queries in one request
query {
  user1: user(id: "123") { name }
  user2: user(id: "456") { name }
  allPosts: posts(limit: 10) { title }
}

# Query with variables
query GetUser($userId: ID!) {
  user(id: $userId) {
    name
    email
  }
}
# Variables: { "userId": "123" }
```

### 3. Mutations (Write Data)

```graphql
# Create user
mutation {
  createUser(
    name: "John Doe"
    email: "john@example.com"
    password: "secure123"
  ) {
    id
    name
    email
  }
}

# Login
mutation {
  login(
    email: "john@example.com"
    password: "secure123"
  ) {
    token
    user {
      id
      name
    }
  }
}

# With variables (best practice)
mutation CreateUser($input: CreateUserInput!) {
  createUser(input: $input) {
    id
    name
  }
}
```

### 4. Resolvers (The Logic)

Resolvers fetch the data for each field.

```javascript
const resolvers = {
  Query: {
    user: async (parent, args, context) => {
      return await User.findById(args.id);
    },
    users: async () => {
      return await User.find();
    }
  },

  Mutation: {
    createUser: async (parent, args) => {
      const hashedPassword = await bcrypt.hash(args.password, 10);
      return await User.create({
        name: args.name,
        email: args.email,
        password: hashedPassword
      });
    },

    login: async (parent, args) => {
      const user = await User.findOne({ email: args.email });
      if (!user) throw new Error('User not found');

      const isValid = await bcrypt.compare(args.password, user.password);
      if (!isValid) throw new Error('Invalid password');

      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET);
      return { token, user };
    }
  },

  // Field resolvers for nested data
  User: {
    posts: async (parent) => {
      return await Post.find({ authorId: parent.id });
    }
  }
};
```

### 5. Context (Shared Data)

Context is available to all resolvers.

```javascript
const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }) => {
    const token = req.headers.authorization || '';
    let user = null;

    if (token) {
      try {
        const decoded = jwt.verify(
          token.replace('Bearer ', ''),
          process.env.JWT_SECRET
        );
        user = decoded;
      } catch (err) {
        // Invalid token
      }
    }

    return { user, db: mongoose.connection };
  }
});
```

---

## Apollo Server Setup

### Installation
```bash
bun install apollo-server-express graphql
```

### Basic Setup
```javascript
const { ApolloServer } = require('apollo-server-express');
const { gql } = require('apollo-server-express');

const typeDefs = gql`
  type User {
    id: ID!
    name: String!
    email: String!
  }

  type Query {
    users: [User]
  }
`;

const resolvers = {
  Query: {
    users: () => User.find()
  }
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }) => ({ req })
});

// Connect to Express
await server.start();
server.applyMiddleware({ 
  app, 
  path: '/graphql' 
});
```

---

## GraphQL Authentication

### Protecting Resolvers

```javascript
const resolvers = {
  Query: {
    // Public - Anyone can access
    posts: () => Post.find(),

    // Protected - Login required
    me: (parent, args, context) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }
      return User.findById(context.user.userId);
    }
  },

  Mutation: {
    // Protected + Authorization
    createPost: (parent, args, context) => {
      // Authentication
      if (!context.user) {
        throw new AuthenticationError('Not logged in');
      }

      // Authorization
      if (!context.user.roles.includes('admin')) {
        throw new ForbiddenError('Insufficient permissions');
      }

      return Post.create({
        ...args,
        authorId: context.user.userId
      });
    }
  }
};
```

---

## GraphQL Best Practices

### 1. Use Input Types
```graphql
# ❌ BAD: Too many arguments
mutation {
  createUser(name: "John", email: "john@example.com", password: "123", age: 30)
}

# ✅ GOOD: Use Input Type
input CreateUserInput {
  name: String!
  email: String!
  password: String!
  age: Int
}

mutation {
  createUser(input: CreateUserInput!): User
}
```

### 2. Use Enums
```graphql
enum Role {
  USER
  ADMIN
  MODERATOR
}

type User {
  role: Role!  # Must be one of the enum values
}
```

### 3. Pagination
```graphql
type Query {
  posts(limit: Int, offset: Int): [Post]
}
```

### 4. Error Handling
```javascript
const { UserInputError, AuthenticationError } = require('apollo-server-express');

if (!args.email.includes('@')) {
  throw new UserInputError('Invalid email format');
}
```

---

## Advantages

✅ No Over-fetching  
✅ No Under-fetching  
✅ Single Endpoint  
✅ Strongly Typed  
✅ Self-Documenting  
✅ No Versioning Needed  
✅ Great Developer Experience  

## Disadvantages

❌ Learning Curve  
❌ Complex Caching  
❌ Query Complexity  
❌ Overkill for Simple APIs  

---

## When to Use GraphQL

**Use GraphQL when:**
- Complex, nested data
- Mobile apps (reduce bandwidth)
- Multiple client types
- Rapid frontend development

**Use REST when:**
- Simple CRUD
- File uploads
- Caching critical
- Team unfamiliar with GraphQL

---

[← Previous: Express Features](./04-express-features.md) | [Next: REST vs GraphQL →](./06-rest-vs-graphql.md)
