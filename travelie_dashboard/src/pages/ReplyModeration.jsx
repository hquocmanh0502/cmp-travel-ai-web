import React, { useState, useEffect } from 'react';
import { 
  Users, 
  MessageSquare, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Filter,
  Search,
  RefreshCw,
  Flag,
  Eye,
  ThumbsUp,
  ThumbsDown,
  MoreHorizontal
} from 'lucide-react';

const ReplyModeration = () => {
  const [replies, setReplies] = useState([]);
  const [statistics, setStatistics] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedReplies, setSelectedReplies] = useState([]);
  const [filters, setFilters] = useState({
    status: 'all',
    isSpam: 'all',
    priority: 'all',
    search: ''
  });
  const [pagination, setPagination] = useState({
    current: 1,
    total: 1,
    limit: 20
  });

  // Mock admin ID - trong thực tế sẽ lấy từ auth context
  const adminId = '69006c243a8a7b5d3ddc69ff';

  useEffect(() => {
    fetchReplies();
    fetchStatistics();
  }, [filters, pagination.current]);

  const fetchReplies = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        ...filters,
        page: pagination.current,
        limit: pagination.limit,
        adminId
      });

      const response = await fetch(`/api/admin/replies?${queryParams}`);
      const data = await response.json();

      if (data.success) {
        setReplies(data.replies);
        setPagination(prev => ({
          ...prev,
          total: data.pagination.total,
          count: data.pagination.count
        }));
      }
    } catch (error) {
      console.error('Error fetching replies:', error);
    }
    setLoading(false);
  };

  const fetchStatistics = async () => {
    try {
      const response = await fetch(`/api/admin/replies/statistics?adminId=${adminId}`);
      const data = await response.json();
      
      if (data.success) {
        setStatistics(data.statistics);
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  const handleApprove = async (replyId, notes = '') => {
    try {
      const response = await fetch(`/api/admin/replies/${replyId}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': adminId
        },
        body: JSON.stringify({ notes })
      });

      if (response.ok) {
        fetchReplies();
        fetchStatistics();
      }
    } catch (error) {
      console.error('Error approving reply:', error);
    }
  };

  const handleReject = async (replyId, notes = '') => {
    try {
      const response = await fetch(`/api/admin/replies/${replyId}/reject`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': adminId
        },
        body: JSON.stringify({ notes })
      });

      if (response.ok) {
        fetchReplies();
        fetchStatistics();
      }
    } catch (error) {
      console.error('Error rejecting reply:', error);
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedReplies.length === 0) return;

    try {
      const response = await fetch('/api/admin/replies/bulk-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': adminId
        },
        body: JSON.stringify({
          action,
          replyIds: selectedReplies
        })
      });

      if (response.ok) {
        setSelectedReplies([]);
        fetchReplies();
        fetchStatistics();
      }
    } catch (error) {
      console.error('Error performing bulk action:', error);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'flagged': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const StatCard = ({ title, value, icon: Icon, color = 'blue' }) => (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <div className="flex items-center">
        <div className={`p-3 rounded-full bg-${color}-100`}>
          <Icon className={`h-6 w-6 text-${color}-600`} />
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Reply Moderation</h1>
          <p className="text-gray-600">Manage and moderate user replies with AI-powered spam detection</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatCard 
            title="Total Replies" 
            value={statistics.general?.total || 0}
            icon={MessageSquare}
            color="blue"
          />
          <StatCard 
            title="Spam Detected" 
            value={statistics.general?.spam || 0}
            icon={AlertTriangle}
            color="red"
          />
          <StatCard 
            title="Pending Review" 
            value={statistics.general?.pending || 0}
            icon={RefreshCw}
            color="yellow"
          />
          <StatCard 
            title="Approved" 
            value={statistics.general?.approved || 0}
            icon={CheckCircle}
            color="green"
          />
        </div>

        {/* Filters and Actions */}
        <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <select 
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="flagged">Flagged</option>
                </select>
              </div>

              <select 
                value={filters.isSpam}
                onChange={(e) => setFilters(prev => ({ ...prev, isSpam: e.target.value }))}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="all">All Types</option>
                <option value="true">Spam Only</option>
                <option value="false">Ham Only</option>
              </select>

              <select 
                value={filters.priority}
                onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="all">All Priority</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>

              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search content..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm w-64"
                />
              </div>
            </div>

            {/* Bulk Actions */}
            {selectedReplies.length > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleBulkAction('approve')}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  <ThumbsUp className="h-4 w-4" />
                  Approve ({selectedReplies.length})
                </button>
                <button
                  onClick={() => handleBulkAction('reject')}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  <ThumbsDown className="h-4 w-4" />
                  Reject ({selectedReplies.length})
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Replies Table */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={selectedReplies.length === replies.length && replies.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedReplies(replies.map(r => r._id));
                        } else {
                          setSelectedReplies([]);
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Content
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Classification
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-4 text-center">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto text-gray-400" />
                    </td>
                  </tr>
                ) : replies.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                      No replies found
                    </td>
                  </tr>
                ) : (
                  replies.map((reply) => (
                    <tr key={reply._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedReplies.includes(reply._id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedReplies(prev => [...prev, reply._id]);
                            } else {
                              setSelectedReplies(prev => prev.filter(id => id !== reply._id));
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="max-w-xs">
                          <p className="text-sm text-gray-900 truncate" title={reply.content}>
                            {reply.content}
                          </p>
                          <div className="flex gap-2 mt-1">
                            {reply.flags && reply.flags.map((flag, index) => (
                              <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
                                <Flag className="h-3 w-3 mr-1" />
                                {flag.type}
                              </span>
                            ))}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-8 w-8 bg-gray-300 rounded-full flex items-center justify-center">
                            <Users className="h-4 w-4 text-gray-600" />
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900">
                              {reply.userId?.name || 'Unknown User'}
                            </p>
                            <p className="text-sm text-gray-500">
                              {reply.userId?.email || 'No email'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                            reply.classification.isSpam ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {reply.classification.label.toUpperCase()}
                          </span>
                          <span className="text-xs text-gray-500">
                            {(reply.classification.confidence * 100).toFixed(1)}% confidence
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${getStatusColor(reply.moderation.status)}`}>
                          {reply.moderation.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${getPriorityColor(reply.priority)}`}>
                          {reply.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApprove(reply._id)}
                            className="text-green-600 hover:text-green-900"
                            title="Approve"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleReject(reply._id)}
                            className="text-red-600 hover:text-red-900"
                            title="Reject"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                          <button
                            className="text-blue-600 hover:text-blue-900"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.total > 1 && (
            <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, current: Math.max(1, prev.current - 1) }))}
                    disabled={pagination.current === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, current: Math.min(prev.total, prev.current + 1) }))}
                    disabled={pagination.current === pagination.total}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing page <span className="font-medium">{pagination.current}</span> of{' '}
                      <span className="font-medium">{pagination.total}</span>
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      {Array.from({ length: Math.min(5, pagination.total) }, (_, i) => {
                        const page = i + 1;
                        return (
                          <button
                            key={page}
                            onClick={() => setPagination(prev => ({ ...prev, current: page }))}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              page === pagination.current
                                ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            {page}
                          </button>
                        );
                      })}
                    </nav>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReplyModeration;