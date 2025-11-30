import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './OAuthCallback.css';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * OAUTH CALLBACK PAGE
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Handles OAuth redirect after successful authentication
 * 
 * @phase Phase 3.5 - OAuth/SSO
 * 
 * Flow:
 * 1. Backend redirects here with tokens: /auth/callback?accessToken=...&refreshToken=...
 * 2. Extract tokens from URL
 * 3. Store tokens in localStorage
 * 4. Update auth context
 * 5. Redirect to dashboard
 */

const OAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setUser, setIsAuthenticated } = useAuth();
  const [status, setStatus] = useState('processing'); // processing | success | error
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        // ─────────────────────────────────────────────────────────
        // 1. Extract Tokens from URL
        // ─────────────────────────────────────────────────────────
        const accessToken = searchParams.get('accessToken');
        const refreshToken = searchParams.get('refreshToken');
        const error = searchParams.get('error');

        // Check for error
        if (error) {
          setStatus('error');
          setMessage(
            error === 'oauth_failed' 
              ? 'OAuth authentication failed. Please try again.'
              : 'Authentication error occurred.'
          );
          
          // Redirect to login after 3 seconds
          setTimeout(() => navigate('/login'), 3000);
          return;
        }

        // Check for tokens
        if (!accessToken || !refreshToken) {
          setStatus('error');
          setMessage('Authentication tokens not received. Please try logging in again.');
          setTimeout(() => navigate('/login'), 3000);
          return;
        }

        // ─────────────────────────────────────────────────────────
        // 2. Store Tokens
        // ─────────────────────────────────────────────────────────
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);

        // ─────────────────────────────────────────────────────────
        // 3. Decode Token to Get User Info
        // ─────────────────────────────────────────────────────────
        /**
         * JWT format: header.payload.signature
         * We can decode the payload (base64) to get user info
         */
        const payload = JSON.parse(atob(accessToken.split('.')[1]));
        
        // ─────────────────────────────────────────────────────────
        // 4. Update Auth Context
        // ─────────────────────────────────────────────────────────
        /**
         * Update global auth state
         * This makes user data available across the app
         */
        setUser({
          id: payload.userId,
          email: payload.email,
          roles: payload.roles
        });
        setIsAuthenticated(true);

        // ─────────────────────────────────────────────────────────
        // 5. Show Success and Redirect
        // ─────────────────────────────────────────────────────────
        setStatus('success');
        setMessage('Login successful! Redirecting to dashboard...');

        // Redirect to dashboard after 1 second
        setTimeout(() => {
          navigate('/dashboard');
        }, 1000);

      } catch (error) {
        console.error('OAuth callback error:', error);
        setStatus('error');
        setMessage('An error occurred during authentication. Please try again.');
        setTimeout(() => navigate('/login'), 3000);
      }
    };

    handleOAuthCallback();
  }, [searchParams, navigate, setUser, setIsAuthenticated]);

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * RENDER
   * ═══════════════════════════════════════════════════════════════════════
   */
  return (
    <div className="oauth-callback-container">
      <div className="oauth-callback-card">
        {/* ────────────── PROCESSING STATE ────────────── */}
        {status === 'processing' && (
          <>
            <div className="spinner"></div>
            <h2>Completing Sign In...</h2>
            <p>Please wait while we finish setting up your account.</p>
          </>
        )}

        {/* ────────────── SUCCESS STATE ────────────── */}
        {status === 'success' && (
          <>
            <div className="success-icon">✓</div>
            <h2>Success!</h2>
            <p className="message">{message}</p>
          </>
        )}

        {/* ────────────── ERROR STATE ────────────── */}
        {status === 'error' && (
          <>
            <div className="error-icon">✗</div>
            <h2>Authentication Failed</h2>
            <p className="message error">{message}</p>
            <p className="redirect-info">Redirecting to login page...</p>
          </>
        )}
      </div>
    </div>
  );
};

export default OAuthCallback;

