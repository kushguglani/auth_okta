import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../utils/axiosInterceptor';
import './ResetPassword.css';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * RESET PASSWORD PAGE
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Reset password using token from email
 * 
 * @phase Phase 3.2 - Password Reset
 * 
 * Flow:
 * 1. User clicks link in email: /reset-password/:token
 * 2. Verify token is valid
 * 3. Show password reset form
 * 4. Submit new password
 * 5. Redirect to login
 */

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [status, setStatus] = useState(null); // null | success | error
  const [message, setMessage] = useState('');
  const [userEmail, setUserEmail] = useState('');

  /**
   * Verify token on mount
   * ────────────────────────────────────────────────────────────────────
   */
  useEffect(() => {
    const verifyToken = async () => {
      try {
        const response = await api.get(`/api/auth/reset-password/${token}`);
        
        if (response.data.success) {
          setTokenValid(true);
          setUserEmail(response.data.email);
        } else {
          setTokenValid(false);
          setMessage(response.data.message || 'Invalid reset link');
        }
      } catch (error) {
        setTokenValid(false);
        setMessage(
          error.response?.data?.message || 
          'This reset link is invalid or has expired.'
        );
      } finally {
        setVerifying(false);
      }
    };

    if (token) {
      verifyToken();
    } else {
      setVerifying(false);
      setTokenValid(false);
      setMessage('No reset token provided');
    }
  }, [token]);

  /**
   * Handle input change
   * ────────────────────────────────────────────────────────────────────
   */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  /**
   * Validate password
   * ────────────────────────────────────────────────────────────────────
   */
  const validatePassword = () => {
    const { password, confirmPassword } = formData;

    if (!password || !confirmPassword) {
      setStatus('error');
      setMessage('Please fill in all fields');
      return false;
    }

    if (password.length < 8) {
      setStatus('error');
      setMessage('Password must be at least 8 characters');
      return false;
    }

    if (password !== confirmPassword) {
      setStatus('error');
      setMessage('Passwords do not match');
      return false;
    }

    return true;
  };

  /**
   * Handle form submission
   * ────────────────────────────────────────────────────────────────────
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validatePassword()) return;

    setLoading(true);
    setStatus(null);

    try {
      const response = await api.post(`/api/auth/reset-password/${token}`, {
        password: formData.password
      });
      
      setStatus('success');
      setMessage(response.data.message);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
      
    } catch (error) {
      setStatus('error');
      setMessage(
        error.response?.data?.message || 
        'Failed to reset password. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * RENDER
   * ═══════════════════════════════════════════════════════════════════════
   */
  return (
    <div className="reset-password-container">
      <div className="reset-password-card">
        {/* ────────────── VERIFYING TOKEN ────────────── */}
        {verifying && (
          <div className="verifying-state">
            <div className="spinner"></div>
            <h2>Verifying reset link...</h2>
            <p>Please wait while we verify your reset link.</p>
          </div>
        )}

        {/* ────────────── INVALID TOKEN ────────────── */}
        {!verifying && !tokenValid && (
          <div className="invalid-token-state">
            <div className="error-icon">✗</div>
            <h2>Invalid Reset Link</h2>
            <p className="error-message">{message}</p>
            
            <div className="info-box">
              <p className="info-title">⚠️ Common Issues:</p>
              <ul>
                <li>Link has expired (links are valid for 1 hour)</li>
                <li>Link has already been used</li>
                <li>Link was copied incorrectly</li>
              </ul>
            </div>

            <div className="action-buttons">
              <Link to="/forgot-password" className="btn-primary">
                Request New Reset Link
              </Link>
              <Link to="/login" className="btn-secondary">
                Back to Login
              </Link>
            </div>
          </div>
        )}

        {/* ────────────── RESET FORM ────────────── */}
        {!verifying && tokenValid && status !== 'success' && (
          <>
            <div className="card-header">
              <h2>Create New Password</h2>
              <p className="user-email">for {userEmail}</p>
            </div>

            <form onSubmit={handleSubmit} className="reset-password-form">
              <div className="input-group">
                <label htmlFor="password">New Password</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter new password (min. 8 characters)"
                  required
                  disabled={loading}
                  minLength={8}
                />
              </div>

              <div className="input-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm new password"
                  required
                  disabled={loading}
                  minLength={8}
                />
              </div>

              {/* ────────────── ERROR MESSAGE ────────────── */}
              {status === 'error' && (
                <div className="alert alert-error">
                  <span className="alert-icon">⚠</span>
                  {message}
                </div>
              )}

              {/* ────────────── PASSWORD REQUIREMENTS ────────────── */}
              <div className="password-requirements">
                <p className="requirements-title">Password Requirements:</p>
                <ul>
                  <li className={formData.password.length >= 8 ? 'valid' : ''}>
                    At least 8 characters
                  </li>
                  <li className={formData.password === formData.confirmPassword && formData.password ? 'valid' : ''}>
                    Passwords match
                  </li>
                </ul>
              </div>

              {/* ────────────── SUBMIT BUTTON ────────────── */}
              <button 
                type="submit" 
                className="submit-btn"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-small"></span>
                    Resetting Password...
                  </>
                ) : (
                  'Reset Password'
                )}
              </button>
            </form>
          </>
        )}

        {/* ────────────── SUCCESS STATE ────────────── */}
        {!verifying && tokenValid && status === 'success' && (
          <div className="success-state">
            <div className="success-icon">✓</div>
            <h2>Password Reset Successful!</h2>
            <p className="success-message">{message}</p>
            <p className="redirect-info">
              Redirecting to login page in 3 seconds...
            </p>
            <Link to="/login" className="btn-primary">
              Go to Login Now
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;

