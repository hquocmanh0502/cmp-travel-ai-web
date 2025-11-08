import React, { useState, useEffect } from 'react';
import { Clock, User, Shield, AlertTriangle, Eye, Ban, CheckCircle, XCircle, Search } from 'lucide-react';

const BanManagement = () => {
  const [activeBans, setActiveBans] = useState([]);
  const [violations, setViolations] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState('bans');
  const [stats, setStats] = useState({
    activeBans: 0,
    weeklyViolations: 0,
    monthlyBans: 0
  });
  const [showBanModal, setShowBanModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserListModal, setShowUserListModal] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(10);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0
  });
  const [banForm, setBanForm] = useState({
    banType: 'reply_ban',
    reason: '',
    severity: 'permanent',
    duration: 24
  });

  const API_BASE = 'http://localhost:3000/api/admin-ban';

  useEffect(() => {
    fetchStats();
    fetchActiveBans();
    fetchViolations();
  }, []);

  // Debug: Log current state
  console.log('BanManagement State:', {
    stats,
    activeBans: activeBans.length,
    violations: violations.length,
    selectedTab,
    loading
  });

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE}/stats`);
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      } else {
        throw new Error('API returned error');
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      // Fallback mock data for demo when server is not available
      setStats({
        activeBans: 9,
        weeklyViolations: 37,
        monthlyBans: 9,
        violationBreakdown: [
          { _id: 'spam', count: 21 },
          { _id: 'toxic', count: 16 }
        ],
        banBreakdown: [
          { _id: 'temporary', count: 4 },
          { _id: 'permanent', count: 5 }
        ]
      });
    }
  };

  const fetchActiveBans = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/bans`);
      const data = await response.json();
      if (data.success) {
        setActiveBans(data.data.bans);
      } else {
        throw new Error('API returned error');
      }
    } catch (error) {
      console.error('Error fetching bans:', error);
      // Fallback mock data with realistic names from actual data
      setActiveBans([
        {
          _id: '1',
          userId: {
            _id: 'user1',
            username: 'spammer1',
            email: 'spam1@fake.com',
            fullName: 'Spam User 1'
          },
          banType: 'reply_ban',
          reason: 'Multiple violations detected (3 violations) - Auto-generated',
          severity: 'temporary',
          endDate: new Date(Date.now() + 48 * 60 * 60 * 1000),
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          bannedBy: { username: 'admin_support' }
        },
        {
          _id: '2',
          userId: {
            _id: 'user2',
            username: 'toxicuser1',
            email: 'toxic1@bad.com',
            fullName: 'Toxic User 1'
          },
          banType: 'reply_ban',
          reason: 'Manual ban - Toxic behavior and harassment',
          severity: 'permanent',
          endDate: null,
          createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          bannedBy: { username: 'admin_support' }
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchViolations = async () => {
    try {
      const response = await fetch(`${API_BASE}/violations?status=pending`);
      const data = await response.json();
      if (data.success) {
        setViolations(data.data.violations);
      } else {
        throw new Error('API returned error');
      }
    } catch (error) {
      console.error('Error fetching violations:', error);
      // Fallback mock data with realistic spam/toxic content
      setViolations([
        {
          _id: '1',
          userId: {
            _id: 'user3',
            username: 'spammer2',
            email: 'spam2@fake.com',
            fullName: 'Spam User 2'
          },
          violationType: 'spam',
          severity: 'high',
          confidence: 0.92,
          content: '🔥🔥🔥 SIÊU KHUYẾN MÃI 90% OFF!!! Đặt tour ngay: spam-deals.vn - Liên hệ Zalo: 0999888777',
          reviewStatus: 'pending',
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
          classificationData: {
            reason: 'Promotional content with external links and excessive caps',
            toxicity_score: 0.1,
            spam_score: 0.92
          }
        },
        {
          _id: '2',
          userId: {
            _id: 'user4',
            username: 'toxicuser2',
            email: 'toxic2@bad.com',
            fullName: 'Toxic User 2'
          },
          violationType: 'toxic',
          severity: 'high',
          confidence: 0.89,
          content: 'Tour gì mà đắt vậy! Lừa đảo khách hàng à? Công ty rác rưởi!',
          reviewStatus: 'pending',
          createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
          classificationData: {
            reason: 'Contains offensive language and accusations',
            toxicity_score: 0.89,
            spam_score: 0.1
          }
        },
        {
          _id: '3',
          userId: {
            _id: 'user5',
            username: 'spammer3',
            email: 'spam3@fake.com',
            fullName: 'Spam User 3'
          },
          violationType: 'spam',
          severity: 'medium',
          confidence: 0.78,
          content: '📞 GỌI NGAY HOTLINE: 1900-SPAM để nhận voucher 50% cho tour bất kỳ! Nhanh tay kẻo hết!',
          reviewStatus: 'pending',
          createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
          classificationData: {
            reason: 'Promotional content with phone numbers',
            toxicity_score: 0.05,
            spam_score: 0.78
          }
        }
      ]);
    }
  };

  const searchUsers = async () => {
    if (!searchQuery.trim()) return;
    
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/users/search?query=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      if (data.success) {
        setSearchResults(data.data.users);
      }
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllUsers = async (page = 1) => {
    try {
      setSearchLoading(true);
      // Use search endpoint without query to get all users
      const url = `${API_BASE}/users/search?limit=20&page=${page}&query=`;
      console.log('🔍 Fetching all users from URL:', url);
      const response = await fetch(url);
      const data = await response.json();
      
      console.log('API Response:', data); // Debug log
      
      if (data.success && data.data.users) {
        setAllUsers(data.data.users);
        setFilteredUsers(data.data.users);
        setPagination({
          total: data.data.total,
          page: data.data.page,
          limit: data.data.limit,
          totalPages: data.data.totalPages
        });
      } else {
        console.error('Invalid API response:', data);
        setAllUsers([]);
        setFilteredUsers([]);
      }
    } catch (error) {
      console.error('Error fetching all users:', error);
      setAllUsers([]);
      setFilteredUsers([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleUserSearch = (query) => {
    setUserSearchQuery(query);
    setCurrentPage(1);
    
    if (!query.trim()) {
      setFilteredUsers(allUsers);
    } else {
      const filtered = allUsers.filter(user => 
        (user.fullName && user.fullName.toLowerCase().includes(query.toLowerCase())) ||
        (user.username && user.username.toLowerCase().includes(query.toLowerCase())) ||
        (user.email && user.email.toLowerCase().includes(query.toLowerCase())) ||
        (user.phone && user.phone.includes(query))
      );
      setFilteredUsers(filtered);
    }
  };

  const selectUserForBan = (user) => {
    setSelectedUser(user);
    setShowUserListModal(false);
    setShowBanModal(true);
  };

  const openManualBan = async () => {
    setSelectedUser(null);
    setUserSearchQuery('');
    setCurrentPage(1);
    setBanForm({
      banType: 'reply_ban',
      reason: '',
      severity: 'permanent',
      duration: 24
    });
    setShowUserListModal(true);
    await fetchAllUsers();
  };

  const banUser = async () => {
    if (!selectedUser || !banForm.reason.trim()) {
      alert('Vui lòng chọn user và nhập lý do ban');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/bans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: selectedUser._id,
          banType: banForm.banType,
          severity: 'permanent',
          reason: banForm.reason
        })
      });

      const data = await response.json();
      if (data.success) {
        alert(`✅ Đã ban user ${selectedUser.fullName || selectedUser.email} thành công!\n\nLoại ban: ${banForm.banType}\nLý do: ${banForm.reason}`);
        setShowBanModal(false);
        setSelectedUser(null);
        setBanForm({
          banType: 'reply_ban',
          reason: '',
          severity: 'permanent',
          duration: 24
        });
        fetchActiveBans();
        fetchStats();
      } else {
        alert(`❌ Lỗi khi ban user: ${data.message || 'Không xác định'}`);
      }
    } catch (error) {
      console.error('Error banning user:', error);
      alert('❌ Lỗi kết nối khi ban user. Vui lòng thử lại.');
    }
  };

  const liftBan = async (banId) => {
    const reason = prompt('Enter reason for lifting ban:');
    if (!reason) return;

    try {
      const response = await fetch(`${API_BASE}/bans/${banId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason })
      });

      const data = await response.json();
      if (data.success) {
        alert('Ban lifted successfully');
        fetchActiveBans();
        fetchStats();
      } else {
        alert(data.message || 'Error lifting ban');
      }
    } catch (error) {
      console.error('Error lifting ban:', error);
      alert('Error lifting ban');
    }
  };

  const reviewViolation = async (violationId, action, notes = '') => {
    try {
      const response = await fetch(`${API_BASE}/violations/${violationId}/review`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, notes })
      });

      const data = await response.json();
      if (data.success) {
        alert(`Violation ${action}ed successfully`);
        fetchViolations();
        fetchActiveBans();
        fetchStats();
      } else {
        alert(data.message || `Error ${action}ing violation`);
      }
    } catch (error) {
      console.error(`Error ${action}ing violation:`, error);
      alert(`Error ${action}ing violation`);
    }
  };

  const formatDuration = (endDate, severity) => {
    if (severity === 'permanent') return 'Permanent';
    if (!endDate) return 'Unknown';

    const now = new Date();
    const end = new Date(endDate);
    const diff = end - now;

    if (diff <= 0) return 'Expired';

    const hours = Math.ceil(diff / (1000 * 60 * 60));
    if (hours < 24) return `${hours}h`;
    const days = Math.ceil(hours / 24);
    return `${days}d`;
  };

  const getViolationColor = (type) => {
    const colors = {
      spam: 'bg-yellow-100 text-yellow-800',
      toxic: 'bg-red-100 text-red-800',
      hate_speech: 'bg-purple-100 text-purple-800',
      harassment: 'bg-orange-100 text-orange-800',
      inappropriate: 'bg-gray-100 text-gray-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Ban Management</h1>
        <button
          onClick={openManualBan}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center gap-2"
        >
          <Ban size={16} />
          Manual Ban
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <Shield className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Bans</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.activeBans}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Weekly Violations</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.weeklyViolations}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Clock className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Monthly Bans</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.monthlyBans}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Search Users</h2>
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Search by username, email, or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyPress={(e) => e.key === 'Enter' && searchUsers()}
          />
          <button
            onClick={searchUsers}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Search size={16} />
            Search
          </button>
        </div>

        {searchResults.length > 0 && (
          <div className="mt-4 space-y-2">
            {searchResults.map((user) => (
              <div key={user._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">{user.fullName || user.username}</p>
                  <p className="text-sm text-gray-600">{user.email}</p>
                  {user.isBanned && (
                    <span className="inline-block px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full mt-1">
                      Currently Banned ({user.currentBan?.remainingTime})
                    </span>
                  )}
                </div>
                <button
                  onClick={() => {
                    setSelectedUser(user);
                    setShowBanModal(true);
                  }}
                  disabled={user.isBanned}
                  className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {user.isBanned ? 'Already Banned' : 'Ban User'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            <button
              onClick={() => setSelectedTab('bans')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                selectedTab === 'bans'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Active Bans ({activeBans.length})
            </button>
            <button
              onClick={() => setSelectedTab('violations')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                selectedTab === 'violations'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Pending Violations ({violations.length})
            </button>
          </nav>
        </div>

        <div className="p-6">
          {selectedTab === 'bans' && (
            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : activeBans.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No active bans</div>
              ) : (
                activeBans.map((ban) => (
                  <div key={ban._id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-medium text-lg">
                            {ban.userId?.fullName || ban.userId?.username || 'Unknown User'}
                          </h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            ban.severity === 'permanent' 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {ban.severity}
                          </span>
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {ban.banType.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-gray-600 mb-2">{ban.userId?.email}</p>
                        <p className="text-sm mb-2"><strong>Reason:</strong> {ban.reason}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>Duration: {formatDuration(ban.endDate, ban.severity)}</span>
                          <span>Banned: {new Date(ban.createdAt).toLocaleDateString()}</span>
                          <span>By: {ban.bannedBy?.username || 'System'}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => liftBan(ban._id)}
                        className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 text-sm"
                      >
                        Lift Ban
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {selectedTab === 'violations' && (
            <div className="space-y-4">
              {violations.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No pending violations</div>
              ) : (
                violations.map((violation) => (
                  <div key={violation._id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-medium">
                            {violation.userId?.fullName || violation.userId?.username || 'Unknown User'}
                          </h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getViolationColor(violation.violationType)}`}>
                            {violation.violationType.replace('_', ' ')}
                          </span>
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {(violation.confidence * 100).toFixed(1)}% confidence
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          <strong>Content:</strong> {violation.content}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(violation.createdAt).toLocaleString()} • Tour: {violation.tourId?.name || 'Unknown'}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => reviewViolation(violation._id, 'dismiss')}
                          className="bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700 text-sm flex items-center gap-1"
                        >
                          <XCircle size={14} />
                          Dismiss
                        </button>
                        <button
                          onClick={() => reviewViolation(violation._id, 'confirm')}
                          className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 text-sm flex items-center gap-1"
                        >
                          <CheckCircle size={14} />
                          Confirm
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Ban Modal */}
      {showBanModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Manual Ban User</h2>
              <button
                onClick={() => {
                  setShowBanModal(false);
                  setSelectedUser(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <XCircle size={24} />
              </button>
            </div>
            
            {/* Selected User Info */}
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <User className="text-red-600" size={16} />
                <span className="font-medium text-red-800">Selected User:</span>
              </div>
              <p><strong>Name:</strong> {selectedUser.fullName || selectedUser.username || 'No Name'}</p>
              <p><strong>Email:</strong> {selectedUser.email}</p>
              {selectedUser.phone && <p><strong>Phone:</strong> {selectedUser.phone}</p>}
              <p><strong>User ID:</strong> {selectedUser._id}</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ban Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={banForm.banType}
                  onChange={(e) => setBanForm({...banForm, banType: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="reply_ban">Reply Ban (Cannot reply to comments)</option>
                  <option value="comment_ban">Comment Ban (Cannot post comments)</option>
                  <option value="full_ban">Full Ban (Cannot access all features)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Manual bans will remain active until manually removed by admin
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ban Duration
                </label>
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="text-orange-600" size={16} />
                    <span className="font-medium text-orange-800">Permanent Ban</span>
                  </div>
                  <p className="text-sm text-orange-700 mt-1">
                    Manual bans are permanent and can only be removed by admin action.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={banForm.reason}
                  onChange={(e) => setBanForm({...banForm, reason: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  rows="4"
                  placeholder="Enter detailed reason for this ban (e.g., toxic behavior, spam, harassment, policy violation)..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  This reason will be recorded in the user's profile and may be visible to the user
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowBanModal(false);
                  setSelectedUser(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={banUser}
                disabled={!banForm.reason.trim() || !selectedUser}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
              >
                <Ban size={16} />
                Apply Ban
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User List Modal */}
      {showUserListModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[85vh] overflow-hidden">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Select User to Ban</h2>
              <button
                onClick={() => setShowUserListModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XCircle size={24} />
              </button>
            </div>
            
            {/* Search Input */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  value={userSearchQuery}
                  onChange={(e) => handleUserSearch(e.target.value)}
                  placeholder="Search by name, email, username, or phone number..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              {userSearchQuery && (
                <div className="mt-2 text-sm text-gray-600">
                  Found {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} 
                  {userSearchQuery && ` matching "${userSearchQuery}"`}
                </div>
              )}
            </div>

            {/* Users List */}
            <div className="overflow-y-auto max-h-96 mb-4">
              {searchLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mx-auto"></div>
                  <p className="mt-2 text-gray-500">Loading users...</p>
                </div>
              ) : filteredUsers.length > 0 ? (
                <div className="space-y-2">
                  {filteredUsers
                    .slice((currentPage - 1) * usersPerPage, currentPage * usersPerPage)
                    .map((user) => (
                    <div
                      key={user._id}
                      className="p-4 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 cursor-pointer transition-all duration-200"
                      onClick={() => selectUserForBan(user)}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <User className="text-blue-600" size={20} />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                {user.fullName || user.username || 'No Name'}
                              </p>
                              <p className="text-sm text-gray-600">{user.email}</p>
                              {user.phone && (
                                <p className="text-sm text-gray-500">📞 {user.phone}</p>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">
                            Click to Select
                          </span>
                          <p className="text-xs text-gray-400 mt-1">ID: {user._id.slice(-6)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : !searchLoading && allUsers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <User className="mx-auto mb-2 text-gray-300" size={48} />
                  <p>No users found in the system</p>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Search className="mx-auto mb-2 text-gray-300" size={48} />
                  <p>No users found matching "{userSearchQuery}"</p>
                  <button
                    onClick={() => handleUserSearch('')}
                    className="mt-2 text-blue-600 hover:text-blue-800"
                  >
                    Clear search and show all users
                  </button>
                </div>
              )}
            </div>

            {/* Pagination */}
            {filteredUsers.length > usersPerPage && (
              <div className="flex justify-between items-center mt-4 pt-4 border-t">
                <div className="text-sm text-gray-600">
                  Showing {((currentPage - 1) * usersPerPage) + 1} to {Math.min(currentPage * usersPerPage, filteredUsers.length)} of {filteredUsers.length} users
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded font-medium">
                    {currentPage} of {Math.ceil(filteredUsers.length / usersPerPage)}
                  </span>
                  <button
                    onClick={() => setCurrentPage(Math.min(Math.ceil(filteredUsers.length / usersPerPage), currentPage + 1))}
                    disabled={currentPage >= Math.ceil(filteredUsers.length / usersPerPage)}
                    className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            <div className="mt-6 pt-4 border-t">
              <button
                onClick={() => setShowUserListModal(false)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BanManagement;
