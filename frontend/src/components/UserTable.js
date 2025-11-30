import React, { useState } from 'react';
import './UserTable.css';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * USER TABLE COMPONENT
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Displays users in a table format with actions
 * 
 * @phase Phase 4A - Admin Panel UI
 * 
 * Features:
 * - Sortable columns
 * - Role badges
 * - Verification status
 * - Action buttons (edit role, delete)
 * - Responsive design
 * - Protection against self-modification
 * 
 * Props:
 * @param {Array} users - Array of user objects
 * @param {Object} currentUser - Currently logged in admin
 * @param {Function} onRoleUpdate - Callback for role update
 * @param {Function} onDeleteUser - Callback for user deletion
 */

const UserTable = ({ users, currentUser, onRoleUpdate, onDeleteUser }) => {
  const [expandedUser, setExpandedUser] = useState(null);

  /**
   * Format date for display
   * ────────────────────────────────────────────────────────────────────
   */
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  /**
   * Get role badge color
   * ────────────────────────────────────────────────────────────────────
   */
  const getRoleBadgeClass = (role) => {
    const roleMap = {
      admin: 'badge-admin',
      moderator: 'badge-moderator',
      user: 'badge-user'
    };
    return roleMap[role] || 'badge-user';
  };

  /**
   * Handle role change
   * ────────────────────────────────────────────────────────────────────
   */
  const handleRoleChange = (userId, newRole) => {
    // Confirm role change
    const confirmed = window.confirm(
      `Change user role to ${newRole}?`
    );
    
    if (confirmed) {
      onRoleUpdate(userId, newRole);
    }
  };

  /**
   * Toggle user details expansion
   * ────────────────────────────────────────────────────────────────────
   */
  const toggleExpand = (userId) => {
    setExpandedUser(expandedUser === userId ? null : userId);
  };

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * RENDER
   * ═══════════════════════════════════════════════════════════════════════
   */
  return (
    <div className="user-table-container">
      <table className="user-table">
        <thead>
          <tr>
            <th>User</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th>Provider</th>
            <th>Joined</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => {
            const isCurrentUser = user._id === currentUser?.id;
            const isExpanded = expandedUser === user._id;

            return (
              <React.Fragment key={user._id}>
                <tr 
                  className={`user-row ${isCurrentUser ? 'current-user' : ''} ${isExpanded ? 'expanded' : ''}`}
                  onClick={() => toggleExpand(user._id)}
                >
                  {/* ────────────── USER INFO ────────────── */}
                  <td className="user-info">
                    <div className="user-avatar">
                      {user.profilePicture ? (
                        <img src={user.profilePicture} alt={user.name} />
                      ) : (
                        <div className="avatar-placeholder">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="user-details">
                      <div className="user-name">
                        {user.name}
                        {isCurrentUser && (
                          <span className="you-badge">You</span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* ────────────── EMAIL ────────────── */}
                  <td className="user-email">{user.email}</td>

                  {/* ────────────── ROLE ────────────── */}
                  <td className="user-role">
                    <span className={`role-badge ${getRoleBadgeClass(user.roles[0])}`}>
                      {user.roles[0]}
                    </span>
                  </td>

                  {/* ────────────── VERIFICATION STATUS ────────────── */}
                  <td className="user-status">
                    {user.isVerified ? (
                      <span className="status-badge verified">
                        ✓ Verified
                      </span>
                    ) : (
                      <span className="status-badge unverified">
                        ⚠ Unverified
                      </span>
                    )}
                  </td>

                  {/* ────────────── PROVIDER ────────────── */}
                  <td className="user-provider">
                    <span className="provider-badge">
                      {user.provider === 'local' ? '📧' : 
                       user.provider === 'google' ? '🔵' : 
                       user.provider === 'github' ? '⚫' : '?'}
                      {' '}
                      {user.provider}
                    </span>
                  </td>

                  {/* ────────────── JOINED DATE ────────────── */}
                  <td className="user-joined">
                    {formatDate(user.createdAt)}
                  </td>

                  {/* ────────────── ACTIONS ────────────── */}
                  <td className="user-actions" onClick={(e) => e.stopPropagation()}>
                    {!isCurrentUser && (
                      <div className="action-buttons">
                        {/* Role Selector */}
                        <select
                          value={user.roles[0]}
                          onChange={(e) => handleRoleChange(user._id, e.target.value)}
                          className="role-select"
                          title="Change role"
                        >
                          <option value="user">User</option>
                          <option value="moderator">Moderator</option>
                          <option value="admin">Admin</option>
                        </select>

                        {/* Delete Button */}
                        <button
                          onClick={() => onDeleteUser(user._id)}
                          className="delete-btn"
                          title="Delete user"
                        >
                          🗑️
                        </button>
                      </div>
                    )}
                    {isCurrentUser && (
                      <span className="no-action">—</span>
                    )}
                  </td>
                </tr>

                {/* ────────────── EXPANDED ROW (Additional Details) ────────────── */}
                {isExpanded && (
                  <tr className="expanded-row">
                    <td colSpan="7">
                      <div className="expanded-content">
                        <div className="detail-grid">
                          <div className="detail-item">
                            <span className="detail-label">User ID:</span>
                            <span className="detail-value">{user._id}</span>
                          </div>
                          
                          <div className="detail-item">
                            <span className="detail-label">Last Login:</span>
                            <span className="detail-value">
                              {user.lastLogin ? formatDate(user.lastLogin) : 'Never'}
                            </span>
                          </div>

                          {user.bio && (
                            <div className="detail-item full-width">
                              <span className="detail-label">Bio:</span>
                              <span className="detail-value">{user.bio}</span>
                            </div>
                          )}

                          {user.provider !== 'local' && user.providerId && (
                            <div className="detail-item">
                              <span className="detail-label">Provider ID:</span>
                              <span className="detail-value">{user.providerId}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default UserTable;

