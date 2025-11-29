import React, { createContext, useState, useContext, useEffect } from 'react';
import { useMutation, useQuery, gql } from '@apollo/client';

/**
 * Authentication Context
 * 
 * Provides global auth state to all components
 * Handles login, signup, logout
 */

// GraphQL Mutations
const SIGNUP_MUTATION = gql`
  mutation Signup($name: String!, $email: String!, $password: String!) {
    signup(name: $name, email: $email, password: $password) {
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

// GraphQL Query
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

// Create Context
const AuthContext = createContext(null);

// AuthProvider Component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // GraphQL Mutations
  const [signupMutation] = useMutation(SIGNUP_MUTATION);
  const [loginMutation] = useMutation(LOGIN_MUTATION);
  const [logoutMutation] = useMutation(LOGOUT_MUTATION);

  // Check if user is logged in on mount
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      // Token exists, fetch user data
      fetchUser();
    } else {
      setLoading(false);
    }
  }, []);

  // Fetch current user
  const fetchUser = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setLoading(false);
        return;
      }

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
                id
                name
                email
                roles
                isVerified
                createdAt
              }
            }
          `
        })
      });

      const { data, errors } = await response.json();
      
      if (errors) {
        console.error('Error fetching user:', errors);
        localStorage.removeItem('accessToken');
        setUser(null);
      } else if (data?.me) {
        setUser(data.me);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      localStorage.removeItem('accessToken');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // Signup function
  const signup = async (name, email, password) => {
    try {
      const { data } = await signupMutation({
        variables: { name, email, password }
      });

      if (data.signup.success) {
        // Store tokens
        localStorage.setItem('accessToken', data.signup.accessToken);
        if (data.signup.refreshToken) {
          localStorage.setItem('refreshToken', data.signup.refreshToken);
        }
        
        // Set user
        setUser(data.signup.user);
        
        return { success: true, message: data.signup.message };
      } else {
        return { success: false, message: data.signup.message };
      }
    } catch (error) {
      console.error('Signup error:', error);
      return { 
        success: false, 
        message: error.message || 'Signup failed. Please try again.' 
      };
    }
  };

  // Login function
  const login = async (email, password) => {
    try {
      const { data } = await loginMutation({
        variables: { email, password }
      });

      if (data.login.success) {
        // Store tokens
        localStorage.setItem('accessToken', data.login.accessToken);
        if (data.login.refreshToken) {
          localStorage.setItem('refreshToken', data.login.refreshToken);
        }
        
        // Set user
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

  // Logout function
  const logout = async () => {
    try {
      await logoutMutation();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear tokens and user regardless of backend response
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
    }
  };

  const value = {
    user,
    loading,
    signup,
    login,
    logout,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;

