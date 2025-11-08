import React, { useState, useEffect } from 'react';
import { 
  UsersIcon, 
  EnvelopeIcon, 
  MagnifyingGlassIcon,
  TrashIcon,
  PencilIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DocumentArrowDownIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

const NewsletterManagement = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({});
  const [filters, setFilters] = useState({
    page: 1,
    limit: 50,
    status: 'all',
    search: '',
    sortBy: 'subscribedAt',
    sortOrder: 'desc'
  });
  const [selectedEmails, setSelectedEmails] = useState([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [bulkAction, setBulkAction] = useState('');
  const [editingSubscription, setEditingSubscription] = useState(null);

  // Fetch subscriptions data
  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams(filters).toString();
      const response = await fetch(`/api/newsletter/admin/subscriptions?${query}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch subscriptions');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setSubscriptions(data.data.subscriptions);
        setStats(data.data.stats);
      } else {
        throw new Error(data.message || 'Failed to load subscriptions');
      }
    } catch (err) {
      setError(err.message);
      console.error('Fetch subscriptions error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, [filters]);

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: key !== 'page' ? 1 : value // Reset to page 1 when other filters change
    }));
  };

  // Handle search
  const handleSearch = (e) => {
    if (e.key === 'Enter') {
      handleFilterChange('search', e.target.value);
    }
  };

  // Handle subscription selection
  const handleSelectSubscription = (email, isSelected) => {
    if (isSelected) {
      setSelectedEmails(prev => [...prev, email]);
    } else {
      setSelectedEmails(prev => prev.filter(e => e !== email));
    }
  };

  // Handle select all
  const handleSelectAll = (isSelected) => {
    if (isSelected) {
      setSelectedEmails(subscriptions.map(sub => sub.email));
    } else {
      setSelectedEmails([]);
    }
  };

  // Handle bulk actions
  const handleBulkAction = async () => {
    if (!bulkAction || selectedEmails.length === 0) return;

    try {
      const requestData = {
        action: bulkAction,
        emails: selectedEmails
      };

      if (bulkAction === 'update_status') {
        const newStatus = prompt('Enter new status (active, inactive, unsubscribed):');
        if (!newStatus) return;
        requestData.status = newStatus;
      }

      const response = await fetch('/api/newsletter/admin/bulk-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      const data = await response.json();
      
      if (data.success) {
        alert(`Successfully ${bulkAction} ${selectedEmails.length} subscriptions`);
        setSelectedEmails([]);
        setBulkAction('');
        setShowBulkActions(false);
        fetchSubscriptions();
      } else {
        throw new Error(data.message);
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  // Handle subscription update
  const handleUpdateSubscription = async (id, updates) => {
    try {
      const response = await fetch(`/api/newsletter/admin/subscriptions/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      const data = await response.json();
      
      if (data.success) {
        alert('Subscription updated successfully');
        setEditingSubscription(null);
        fetchSubscriptions();
      } else {
        throw new Error(data.message);
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  // Handle subscription deletion
  const handleDeleteSubscription = async (id, email) => {
    if (!confirm(`Are you sure you want to delete subscription for ${email}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/newsletter/admin/subscriptions/${id}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      
      if (data.success) {
        alert('Subscription deleted successfully');
        fetchSubscriptions();
      } else {
        throw new Error(data.message);
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  // Handle export
  const handleExport = async (format = 'json') => {
    try {
      const response = await fetch(`/api/newsletter/admin/export?format=${format}&status=${filters.status}`);
      
      if (format === 'csv') {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'newsletter_subscribers.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        const data = await response.json();
        if (data.success) {
          const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'newsletter_subscribers.json';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        }
      }
    } catch (err) {
      alert('Export failed: ' + err.message);
    }
  };

  // Status badge component
  const StatusBadge = ({ status }) => {
    const statusConfig = {
      active: { color: 'bg-green-100 text-green-800', icon: CheckCircleIcon, label: 'Active' },
      inactive: { color: 'bg-yellow-100 text-yellow-800', icon: ExclamationTriangleIcon, label: 'Inactive' },
      unsubscribed: { color: 'bg-red-100 text-red-800', icon: XCircleIcon, label: 'Unsubscribed' }
    };
    
    const config = statusConfig[status] || statusConfig.inactive;
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Newsletter Management</h1>
            <p className="mt-1 text-sm text-gray-600">
              Manage email subscriptions for marketing campaigns and promotions
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => handleExport('csv')}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
              Export CSV
            </button>
            <button
              onClick={() => handleExport('json')}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
              Export JSON
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UsersIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Subscribers
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.total || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircleIcon className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Active Subscribers
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.active || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-6 w-6 text-yellow-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Inactive Subscribers
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.inactive || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <XCircleIcon className="h-6 w-6 text-red-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Unsubscribed
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.unsubscribed || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search Email
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search by email..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                onKeyPress={handleSearch}
                defaultValue={filters.search}
              />
              <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status Filter
            </label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="unsubscribed">Unsubscribed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sort By
            </label>
            <select
              value={filters.sortBy}
              onChange={(e) => handleFilterChange('sortBy', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="subscribedAt">Subscription Date</option>
              <option value="email">Email</option>
              <option value="status">Status</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Order
            </label>
            <select
              value={filters.sortOrder}
              onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="desc">Newest First</option>
              <option value="asc">Oldest First</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedEmails.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-900">
              {selectedEmails.length} subscriber(s) selected
            </span>
            <div className="flex space-x-2">
              <select
                value={bulkAction}
                onChange={(e) => setBulkAction(e.target.value)}
                className="px-3 py-1 text-sm border border-blue-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Choose action...</option>
                <option value="update_status">Update Status</option>
                <option value="delete">Delete</option>
              </select>
              <button
                onClick={handleBulkAction}
                disabled={!bulkAction}
                className="px-4 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subscriptions Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-6 text-center">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-sm text-gray-600">Loading subscriptions...</p>
          </div>
        ) : error ? (
          <div className="p-6 text-center text-red-600">
            <ExclamationTriangleIcon className="h-6 w-6 mx-auto mb-2" />
            <p>Error: {error}</p>
          </div>
        ) : subscriptions.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <InformationCircleIcon className="h-6 w-6 mx-auto mb-2" />
            <p>No subscriptions found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedEmails.length === subscriptions.length}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Subscribed
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Source
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {subscriptions.map((subscription) => (
                    <tr key={subscription._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedEmails.includes(subscription.email)}
                          onChange={(e) => handleSelectSubscription(subscription.email, e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {subscription.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={subscription.status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(subscription.subscribedAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className="capitalize">{subscription.source}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => setEditingSubscription(subscription)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteSubscription(subscription._id, subscription.email)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => handleFilterChange('page', Math.max(1, filters.page - 1))}
                  disabled={filters.page === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => handleFilterChange('page', filters.page + 1)}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing page <span className="font-medium">{filters.page}</span>
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    <button
                      onClick={() => handleFilterChange('page', Math.max(1, filters.page - 1))}
                      disabled={filters.page === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      <ChevronLeftIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleFilterChange('page', filters.page + 1)}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                    >
                      <ChevronRightIcon className="h-5 w-5" />
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Edit Modal */}
      {editingSubscription && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Edit Subscription
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={editingSubscription.email}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={editingSubscription.status}
                    onChange={(e) => setEditingSubscription(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="unsubscribed">Unsubscribed</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setEditingSubscription(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleUpdateSubscription(editingSubscription._id, { status: editingSubscription.status })}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Update
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewsletterManagement;