import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../utils/axiosInterceptor';
import './VerifyEmail.css';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EMAIL VERIFICATION PAGE
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Verifies user's email address using token from email link
 * 
 * @phase Phase 3.1 - Email Verification
 * 
 * Flow:
 * 1. User clicks link in email: /verify/:token
 * 2. This component extracts token from URL
 * 3. Calls API: GET /api/auth/verify/:token
 * 4. Shows success/error message
 * 5. Redirects to login after 3 seconds
 */

const VerifyEmail = () => {
  const { token } = useParams(); // Extract token from URL
  const navigate = useNavigate();
  
  const [status, setStatus] = useState('loading'); // loading | success | error
  const [message, setMessage] = useState('');
  const [countdown, setCountdown] = useState(3);

  /**
   * Verify email on mount
   * ────────────────────────────────────────────────────────────────────
   */
  useEffect(() => {
    const verifyEmail = async () => {
      try {
        // Call verification endpoint
        const response = await api.get(`/api/auth/verify/${token}`);
        
        if (response.data.success) {
          setStatus('success');
          setMessage(response.data.message);
        } else {
          setStatus('error');
          setMessage(response.data.message || 'Verification failed');
        }
      } catch (error) {
        setStatus('error');
        setMessage(
          error.response?.data?.message || 
          'Verification failed. Token may be invalid or expired.'
        );
      }
    };

    if (token) {
      verifyEmail();
    } else {
      setStatus('error');
      setMessage('No verification token provided');
    }
  }, [token]);

  /**
   * Countdown and redirect on success
   * ────────────────────────────────────────────────────────────────────
   */
  useEffect(() => {
    if (status === 'success' && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
    
    if (status === 'success' && countdown === 0) {
      navigate('/login');
    }
  }, [status, countdown, navigate]);

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * RENDER
   * ═══════════════════════════════════════════════════════════════════════
   */
  return (
    <div className="verify-email-container">
      <div className="verify-email-card">
        {/* ────────────── LOADING STATE ────────────── */}
        {status === 'loading' && (
          <>
            <div className="spinner"></div>
            <h2>Verifying your email...</h2>
            <p>Please wait while we confirm your email address.</p>
          </>
        )}

        {/* ────────────── SUCCESS STATE ────────────── */}
        {status === 'success' && (
          <>
            <div className="success-icon">✓</div>
            <h2>Email Verified!</h2>
            <p className="message">{message}</p>
            <p className="countdown">
              Redirecting to login in {countdown} seconds...
            </p>
            <Link to="/login" className="login-link">
              Go to Login Now
            </Link>
          </>
        )}

        {/* ────────────── ERROR STATE ────────────── */}
        {status === 'error' && (
          <>
            <div className="error-icon">✗</div>
            <h2>Verification Failed</h2>
            <p className="message error">{message}</p>
            
            <div className="action-buttons">
              <Link to="/login" className="btn-secondary">
                Back to Login
              </Link>
              <Link to="/verify/resend" className="btn-primary">
                Resend Verification Email
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;

