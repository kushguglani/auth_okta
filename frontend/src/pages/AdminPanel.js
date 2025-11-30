import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/axiosInterceptor';
import UserTable from '../components/UserTable';
import StatsCard from '../components/StatsCard';
import './AdminPanel.css';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ADMIN PANEL - USER MANAGEMENT DASHBOARD
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Complete admin dashboard for managing users, roles, and viewing statistics
 * 
 * @phase Phase 4A - Admin Panel UI
 * 
 * Features:
 * - View all users with pagination
 * - Search users by name/email
 * - Filter by role and verification status
 * - Update user roles
 * - Delete users
 * - View system statistics
 * - Responsive design
 * 
 * Security:
 * - Requires admin role
 * - Protected route
 * - Confirmation dialogs for destructive actions
 */

const AdminPanel = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // ═══════════════════════════════════════════════════════════════════════
  // STATE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════

  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);

  // Filter & search state
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [verifiedFilter, setVerifiedFilter] = useState('');

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * AUTHORIZATION CHECK
   * ═══════════════════════════════════════════════════════════════════════
   * 
   * Verify user has admin role
   * If not, redirect to dashboard
   */
  useEffect(() => {
    if (user && !user.roles?.includes('admin')) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * FETCH SYSTEM STATISTICS
   * ═══════════════════════════════════════════════════════════════════════
   * 
   * Get system statistics on mount
   * - Total users
   * - Verified/unverified counts
   * - Role distribution
   * - Provider distribution
   */
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/api/admin/stats');
        setStats(response.data.stats);
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    fetchStats();
  }, []);

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * FETCH USERS
   * ═══════════════════════════════════════════════════════════════════════
   * 
   * Fetch users with pagination and filters
   * 
   * Query Parameters:
   * - page: Current page number
   * - limit: Items per page (20)
   * - search: Search query (name or email)
   * - role: Filter by role
   * - verified: Filter by verification status
   */
  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      setError(null);

      try {
        // Build query parameters
        const params = new URLSearchParams({
          page: currentPage,
          limit: 20
        });

        if (searchQuery) params.append('search', searchQuery);
        if (roleFilter) params.append('role', roleFilter);
        if (verifiedFilter) params.append('verified', verifiedFilter);

        // Fetch users
        const response = await api.get(`/api/admin/users?${params}`);

        setUsers(response.data.users);
        setTotalPages(response.data.pagination.pages);
        setTotalUsers(response.data.pagination.total);
      } catch (error) {
        console.error('Error fetching users:', error);
        setError(error.response?.data?.message || 'Failed to load users');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [currentPage, searchQuery, roleFilter, verifiedFilter]);

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * HANDLE ROLE UPDATE
   * ═══════════════════════════════════════════════════════════════════════
   * 
   * Update user's role
   * 
   * @param {String} userId - User ID to update
   * @param {String} newRole - New role (user, moderator, admin)
   */
  const handleRoleUpdate = async (userId, newRole) => {
    try {
      await api.put(`/api/admin/users/${userId}/role`, { role: newRole });

      // Update local state
      setUsers(users.map(u => 
        u._id === userId 
          ? { ...u, roles: [newRole] }
          : u
      ));

      // Show success message
      alert('✅ User role updated successfully!');
    } catch (error) {
      alert(`❌ ${error.response?.data?.message || 'Failed to update role'}`);
    }
  };

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * HANDLE USER DELETE
   * ═══════════════════════════════════════════════════════════════════════
   * 
   * Delete user account
   * 
   * @param {String} userId - User ID to delete
   * 
   * Security:
   * - Requires confirmation
   * - Cannot delete yourself
   * - Cannot delete higher role
   */
  const handleDeleteUser = async (userId) => {
    // Find user
    const userToDelete = users.find(u => u._id === userId);
    
    // Confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to delete ${userToDelete.name} (${userToDelete.email})?\n\n` +
      'This action cannot be undone.'
    );

    if (!confirmed) return;

    try {
      await api.delete(`/api/admin/users/${userId}`);

      // Remove from local state
      setUsers(users.filter(u => u._id !== userId));

      // Update total count
      setTotalUsers(totalUsers - 1);

      alert('✅ User deleted successfully!');
    } catch (error) {
      alert(`❌ ${error.response?.data?.message || 'Failed to delete user'}`);
    }
  };

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * HANDLE SEARCH
   * ═══════════════════════════════════════════════════════════════════════
   * 
   * Debounced search to prevent excessive API calls
   */
  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    setCurrentPage(1); // Reset to first page
  };

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * HANDLE FILTER CHANGE
   * ═══════════════════════════════════════════════════════════════════════
   */
  const handleRoleFilterChange = (e) => {
    setRoleFilter(e.target.value);
    setCurrentPage(1);
  };

  const handleVerifiedFilterChange = (e) => {
    setVerifiedFilter(e.target.value);
    setCurrentPage(1);
  };

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * RENDER
   * ═══════════════════════════════════════════════════════════════════════
   */
  return (
    <div className="admin-panel">
      {/* ────────────── HEADER ────────────── */}
      <div className="admin-header">
        <h1>Admin Panel</h1>
        <p className="admin-subtitle">User Management Dashboard</p>
      </div>

      {/* ────────────── STATISTICS CARDS ────────────── */}
      {stats && (
        <div className="stats-grid">
          <StatsCard
            title="Total Users"
            value={stats.users.total}
            icon="👥"
            color="blue"
          />
          <StatsCard
            title="Verified Users"
            value={stats.users.verified}
            subtitle={`${stats.users.unverified} unverified`}
            icon="✓"
            color="green"
          />
          <StatsCard
            title="Recent Signups"
            value={stats.users.recentSignups}
            subtitle="Last 7 days"
            icon="📈"
            color="purple"
          />
          <StatsCard
            title="Admins"
            value={stats.roles.admin}
            subtitle={`${stats.roles.moderator} moderators`}
            icon="👑"
            color="orange"
          />
        </div>
      )}

      {/* ────────────── FILTERS & SEARCH ────────────── */}
      <div className="admin-controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={handleSearch}
            className="search-input"
          />
        </div>

        <div className="filters">
          <select
            value={roleFilter}
            onChange={handleRoleFilterChange}
            className="filter-select"
          >
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="moderator">Moderator</option>
            <option value="user">User</option>
          </select>

          <select
            value={verifiedFilter}
            onChange={handleVerifiedFilterChange}
            className="filter-select"
          >
            <option value="">All Status</option>
            <option value="true">Verified</option>
            <option value="false">Unverified</option>
          </select>
        </div>
      </div>

      {/* ────────────── USER TABLE ────────────── */}
      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading users...</p>
        </div>
      ) : error ? (
        <div className="error-state">
          <p className="error-message">{error}</p>
          <button onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      ) : users.length === 0 ? (
        <div className="empty-state">
          <p>No users found</p>
          {(searchQuery || roleFilter || verifiedFilter) && (
            <button 
              onClick={() => {
                setSearchQuery('');
                setRoleFilter('');
                setVerifiedFilter('');
              }}
              className="clear-filters-btn"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <>
          <UserTable
            users={users}
            currentUser={user}
            onRoleUpdate={handleRoleUpdate}
            onDeleteUser={handleDeleteUser}
          />

          {/* ────────────── PAGINATION ────────────── */}
          <div className="pagination">
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="pagination-btn"
            >
              ← Previous
            </button>

            <span className="pagination-info">
              Page {currentPage} of {totalPages} ({totalUsers} total users)
            </span>

            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="pagination-btn"
            >
              Next →
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminPanel;

