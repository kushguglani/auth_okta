import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/axiosInterceptor';
import './ForgotPassword.css';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FORGOT PASSWORD PAGE
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Request password reset email
 * 
 * @phase Phase 3.2 - Password Reset
 * 
 * Flow:
 * 1. User enters email
 * 2. Calls API: POST /api/auth/forgot-password
 * 3. Backend sends reset email
 * 4. Show success message
 * 5. User checks email for reset link
 */

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); // null | success | error
  const [message, setMessage] = useState('');

  /**
   * Handle form submission
   * ────────────────────────────────────────────────────────────────────
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate email
    if (!email) {
      setStatus('error');
      setMessage('Please enter your email address');
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      const response = await api.post('/api/auth/forgot-password', { email });
      
      setStatus('success');
      setMessage(response.data.message);
      
    } catch (error) {
      setStatus('error');
      setMessage(
        error.response?.data?.message || 
        'Failed to send reset email. Please try again.'
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
    <div className="forgot-password-container">
      <div className="forgot-password-card">
        {/* ────────────── HEADER ────────────── */}
        <div className="card-header">
          <h2>Reset Password</h2>
          <p className="subtitle">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>

        {/* ────────────── FORM ────────────── */}
        {status !== 'success' && (
          <form onSubmit={handleSubmit} className="forgot-password-form">
            <div className="input-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                disabled={loading}
              />
            </div>

            {/* ────────────── ERROR MESSAGE ────────────── */}
            {status === 'error' && (
              <div className="alert alert-error">
                <span className="alert-icon">⚠</span>
                {message}
              </div>
            )}

            {/* ────────────── SUBMIT BUTTON ────────────── */}
            <button 
              type="submit" 
              className="submit-btn"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-small"></span>
                  Sending...
                </>
              ) : (
                'Send Reset Link'
              )}
            </button>
          </form>
        )}

        {/* ────────────── SUCCESS MESSAGE ────────────── */}
        {status === 'success' && (
          <div className="success-container">
            <div className="success-icon">✓</div>
            <h3>Check Your Email</h3>
            <p className="success-message">{message}</p>
            <div className="info-box">
              <p className="info-title">📧 Next Steps:</p>
              <ul>
                <li>Check your inbox (and spam folder)</li>
                <li>Click the reset link in the email</li>
                <li>Link expires in 1 hour</li>
                <li>You can request a new link if it expires</li>
              </ul>
            </div>
            <button 
              onClick={() => {
                setStatus(null);
                setEmail('');
              }}
              className="btn-secondary"
            >
              Send Another Email
            </button>
          </div>
        )}

        {/* ────────────── FOOTER ────────────── */}
        <div className="card-footer">
          <Link to="/login" className="back-link">
            ← Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;

