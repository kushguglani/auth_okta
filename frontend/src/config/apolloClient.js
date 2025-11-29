import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

/**
 * Apollo Client Configuration
 * 
 * Connects React frontend to GraphQL backend
 * Handles authentication via JWT tokens
 */

// HTTP connection to the GraphQL API
const httpLink = createHttpLink({
  uri: process.env.REACT_APP_GRAPHQL_URL || 'http://localhost:5000/graphql',
  credentials: 'include', // Include cookies in requests
});

// Authentication link - adds JWT token to every request
const authLink = setContext((_, { headers }) => {
  // Get token from localStorage
  const token = localStorage.getItem('accessToken');
  
  // Return headers with authorization token
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    }
  };
});

// Create Apollo Client instance
const client = new ApolloClient({
  link: authLink.concat(httpLink), // Chain auth link with http link
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          // Cache configuration for queries
          me: {
            merge(existing, incoming) {
              return incoming;
            },
          },
        },
      },
    },
  }),
  // Enable dev tools in development
  connectToDevTools: process.env.NODE_ENV === 'development',
});

export default client;

