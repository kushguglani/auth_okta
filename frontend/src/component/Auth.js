import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

const Auth = () => {
    const navigate = useNavigate();
    const { signup, login, isAuthenticated } = useAuth();
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
    });

    // Redirect if already logged in
    React.useEffect(() => {
        if (isAuthenticated) {
            navigate('/dashboard');
        }
    }, [isAuthenticated, navigate]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
        });
    };

    // Helper: Reset form data
    const resetForm = () => {
        setFormData({
            name: '',
            email: '',
            password: '',
            confirmPassword: ''
        });
    };

    // Helper: Validate password match for signup
    const validatePasswordMatch = () => {
        if (formData.password !== formData.confirmPassword) {
            alert('❌ Passwords do not match!');
            return false;
        }
        return true;
    };

    // Handle Login
    const handleLogin = async () => {
        const { email, password } = formData;
        const result = await login(email, password);
        
        if (result.success) {
            alert(`✅ ${result.message}`);
            resetForm();
            navigate('/dashboard');
        } else {
            alert(`❌ ${result.message}`);
        }
    };

    // Handle Signup
    const handleSignup = async () => {
        if (!validatePasswordMatch()) return;
        
        const { name, email, password } = formData;
        const result = await signup(name, email, password);
        
        if (result.success) {
            alert(`✅ ${result.message}`);
            resetForm();
            navigate('/dashboard');
        } else {
            alert(`❌ ${result.message}`);
        }
    };

    // Main submit handler
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (isLogin) {
                await handleLogin();
            } else {
                await handleSignup();
            }
        } catch (error) {
            console.error('Error:', error);
            alert('❌ An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const switchMode = () => {
        setIsLogin(!isLogin);
        resetForm();
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-header">
                    <h1>{isLogin ? 'Welcome Back' : 'Create Account'}</h1>
                    <p>{isLogin ? 'Login to continue' : 'Sign up to get started'}</p>
                </div>

                <form onSubmit={handleSubmit} className="auth-form">
                    {!isLogin && (
                        <div className="form-group">
                            <label htmlFor="name">Full Name</label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                placeholder="Enter your full name"
                                required
                            />
                        </div>
                    )}

                    <div className="form-group">
                        <label htmlFor="email">Email Address</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            placeholder="Enter your email"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            value={formData.password}
                            onChange={handleInputChange}
                            placeholder="Enter your password"
                            required
                        />
                    </div>

                    {!isLogin && (
                        <div className="form-group">
                            <label htmlFor="confirmPassword">Confirm Password</label>
                            <input
                                type="password"
                                id="confirmPassword"
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleInputChange}
                                placeholder="Confirm your password"
                                required
                            />
                        </div>
                    )}

                    <button type="submit" className="submit-btn" disabled={loading}>
                        {loading ? 'Please wait...' : (isLogin ? 'Login' : 'Sign Up')}
                    </button>
                </form>

                <div className="auth-footer">
                    <p>
                        {isLogin ? "Don't have an account? " : "Already have an account? "}
                        <span className="switch-link" onClick={switchMode}>
                            {isLogin ? 'Sign Up' : 'Login'}
                        </span>
                    </p>
                </div>

                {isLogin && (
                    <div className="forgot-password">
                        <a href="#forgot">Forgot Password?</a>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Auth;

