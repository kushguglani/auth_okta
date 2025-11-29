import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

/**
 * Dashboard Component
 * 
 * Protected page - only accessible to authenticated users
 * Displays user information and logout button
 */

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-card">
        <div className="dashboard-header">
          <h1>Welcome, {user?.name}! 👋</h1>
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
        </div>

        <div className="user-info">
          <h2>Your Profile</h2>
          <div className="info-grid">
            <div className="info-item">
              <label>Name:</label>
              <span>{user?.name}</span>
            </div>
            <div className="info-item">
              <label>Email:</label>
              <span>{user?.email}</span>
            </div>
            <div className="info-item">
              <label>Roles:</label>
              <span>{user?.roles?.join(', ')}</span>
            </div>
            <div className="info-item">
              <label>Verified:</label>
              <span>{user?.isVerified ? '✅ Yes' : '❌ No'}</span>
            </div>
            <div className="info-item">
              <label>Member Since:</label>
              <span>{new Date(user?.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        <div className="dashboard-actions">
          <h3>Quick Actions</h3>
          <button className="action-button">Edit Profile</button>
          <button className="action-button">Change Password</button>
          <button className="action-button danger">Delete Account</button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

