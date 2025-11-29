const { gql } = require('apollo-server-express');

/**
 * GraphQL Type Definitions (Schema)
 *
 * Defines the structure of your GraphQL API:
 * - Types: User, Post, AuthPayload, etc.
 * - Queries: Read operations
 * - Mutations: Write operations
 */

const typeDefs = gql`
  # Scalar types
  scalar DateTime

  # User type
  type User {
    id: ID!
    name: String!
    email: String!
    roles: [String!]!
    isVerified: Boolean!
    profilePicture: String
    bio: String
    lastLogin: DateTime
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  # Authentication payload (returned after login/signup)
  type AuthPayload {
    success: Boolean!
    message: String!
    accessToken: String
    refreshToken: String
    user: User
  }

  # Generic response type
  type Response {
    success: Boolean!
    message: String!
  }

  # Token refresh payload
  type TokenPayload {
    success: Boolean!
    accessToken: String!
  }

  # ========== QUERIES (Read operations) ==========
  type Query {
    # Get current user (requires authentication)
    me: User

    # Get user by ID (admin only)
    user(id: ID!): User

    # Get all users (admin only)
    users(limit: Int, offset: Int): [User!]!

    # Health check
    health: String!
  }

  # ========== MUTATIONS (Write operations) ==========
  type Mutation {
    # Authentication mutations
    signup(
      name: String!
      email: String!
      password: String!
    ): AuthPayload!

    login(
      email: String!
      password: String!
    ): AuthPayload!

    logout: Response!

    refreshToken(refreshToken: String!): TokenPayload!

    # User mutations
    updateProfile(
      name: String
      bio: String
      profilePicture: String
    ): User!

    changePassword(
      currentPassword: String!
      newPassword: String!
    ): Response!

    deleteAccount: Response!
  }

  # ========== SUBSCRIPTIONS (Real-time - Optional) ==========
  # type Subscription {
  #   userCreated: User!
  # }
`;

module.exports = typeDefs;

