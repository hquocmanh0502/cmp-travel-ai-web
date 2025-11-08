import { useState, useEffect } from 'react';
import {
  MdEmail,
  MdPhone,
  MdPerson,
  MdSubject,
  MdMessage,
  MdSearch,
  MdRefresh,
  MdEdit,
  MdDelete,
  MdClose,
  MdCheck,
  MdFlag,
  MdFilterList,
  MdSort
} from 'react-icons/md';
import { toast } from 'react-hot-toast';

const API_BASE_URL = 'http://localhost:3000/api/contacts';

export default function ContactManagement() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalContacts, setTotalContacts] = useState(0);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Modals
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);

  // Statistics
  const [stats, setStats] = useState({
    totalContacts: 0,
    pendingContacts: 0,
    readContacts: 0,
    repliedContacts: 0,
    resolvedContacts: 0,
    highPriorityContacts: 0,
    urgentContacts: 0,
    recentContacts: 0,
    categoryStats: {}
  });

  useEffect(() => {
    fetchContacts();
    fetchStats();
  }, [page, searchTerm, statusFilter, priorityFilter, categoryFilter]);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        search: searchTerm,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });

      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (priorityFilter !== 'all') params.append('priority', priorityFilter);
      if (categoryFilter !== 'all') params.append('category', categoryFilter);

      const response = await fetch(`${API_BASE_URL}/admin?${params}`);
      const data = await response.json();

      if (data.success) {
        setContacts(data.data);
        setTotalPages(data.pagination.pages);
        setTotalContacts(data.pagination.total);
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast.error('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/stats`);
      const data = await response.json();

      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleRefresh = () => {
    setPage(1);
    setSearchTerm('');
    setStatusFilter('all');
    setPriorityFilter('all');
    setCategoryFilter('all');
    fetchContacts();
    fetchStats();
  };

  const handleStatusChange = async (contactId, newStatus) => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/${contactId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Status updated successfully');
        fetchContacts();
        fetchStats();
      } else {
        toast.error(data.error || 'Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const handlePriorityChange = async (contactId, newPriority) => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/${contactId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: newPriority })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Priority updated successfully');
        fetchContacts();
        fetchStats();
      } else {
        toast.error(data.error || 'Failed to update priority');
      }
    } catch (error) {
      console.error('Error updating priority:', error);
      toast.error('Failed to update priority');
    }
  };

  const handleDelete = async (contactId) => {
    if (!window.confirm('Are you sure you want to delete this contact?')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/admin/${contactId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Contact deleted successfully');
        fetchContacts();
        fetchStats();
      } else {
        toast.error(data.error || 'Failed to delete contact');
      }
    } catch (error) {
      console.error('Error deleting contact:', error);
      toast.error('Failed to delete contact');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      read: 'bg-blue-100 text-blue-800',
      replied: 'bg-green-100 text-green-800',
      resolved: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800'
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-6 max-w-full">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Contact Management</h1>
        <p className="text-gray-600">Manage customer inquiries and messages</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-2xl font-bold text-blue-600">{stats.totalContacts}</p>
            </div>
            <MdEmail className="text-3xl text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pendingContacts}</p>
            </div>
            <MdMessage className="text-3xl text-yellow-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Read</p>
              <p className="text-2xl font-bold text-blue-600">{stats.readContacts}</p>
            </div>
            <MdCheck className="text-3xl text-blue-500" />
          </div>
        </div>



        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Resolved</p>
              <p className="text-2xl font-bold text-gray-600">{stats.resolvedContacts}</p>
            </div>
            <MdCheck className="text-3xl text-gray-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">High Priority</p>
              <p className="text-2xl font-bold text-orange-600">{stats.highPriorityContacts}</p>
            </div>
            <MdFlag className="text-3xl text-orange-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Urgent</p>
              <p className="text-2xl font-bold text-red-600">{stats.urgentContacts}</p>
            </div>
            <MdFlag className="text-3xl text-red-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Recent (7d)</p>
              <p className="text-2xl font-bold text-purple-600">{stats.recentContacts}</p>
            </div>
            <MdEmail className="text-3xl text-purple-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <div className="relative">
              <MdSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-xl" />
              <input
                type="text"
                placeholder="Search contacts..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="read">Read</option>
              <option value="replied">Replied</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <select
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Priority</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              <option value="general">General</option>
              <option value="booking">Booking</option>
              <option value="complaint">Complaint</option>
              <option value="suggestion">Suggestion</option>
              <option value="technical">Technical</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Refresh */}
          <div>
            <button
              onClick={handleRefresh}
              className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center justify-center"
              title="Refresh"
            >
              <MdRefresh className="text-xl" />
            </button>
          </div>
        </div>
      </div>

      {/* Contacts Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : contacts.length === 0 ? (
          <div className="text-center py-12">
            <MdEmail className="mx-auto text-6xl text-gray-300 mb-4" />
            <p className="text-xl text-gray-500 mb-2">No contacts found</p>
            <p className="text-gray-400">No customer messages match your current filters</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact Info
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Subject & Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status & Priority
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {contacts.map((contact) => (
                    <tr key={contact._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <div className="flex items-center">
                            <MdPerson className="text-gray-400 mr-2" />
                            <span className="font-medium text-gray-900">{contact.name}</span>
                          </div>
                          <div className="flex items-center mt-1">
                            <MdEmail className="text-gray-400 mr-2" />
                            <span className="text-sm text-gray-600">{contact.email}</span>
                          </div>
                          {contact.phone && (
                            <div className="flex items-center mt-1">
                              <MdPhone className="text-gray-400 mr-2" />
                              <span className="text-sm text-gray-600">{contact.phone}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{contact.subject}</p>
                          <p className="text-sm text-gray-600 capitalize">{contact.category}</p>
                          <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                            {contact.message.substring(0, 100)}...
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-2">
                          <select
                            value={contact.status}
                            onChange={(e) => handleStatusChange(contact._id, e.target.value)}
                            className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(contact.status)}`}
                          >
                            <option value="pending">Pending</option>
                            <option value="read">Read</option>
                            <option value="replied">Replied</option>
                            <option value="resolved">Resolved</option>
                          </select>
                          <select
                            value={contact.priority}
                            onChange={(e) => handlePriorityChange(contact._id, e.target.value)}
                            className={`px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(contact.priority)}`}
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                          </select>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatDate(contact.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setSelectedContact(contact);
                              setShowDetailModal(true);
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <MdEdit className="text-lg" />
                          </button>

                          <button
                            onClick={() => handleDelete(contact._id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <MdDelete className="text-lg" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {(page - 1) * 10 + 1} to {Math.min(page * 10, totalContacts)} of {totalContacts} contacts
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-3 py-1 text-sm">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedContact && (
        <ContactDetailModal
          contact={selectedContact}
          onClose={() => setShowDetailModal(false)}
          onUpdate={() => {
            fetchContacts();
            fetchStats();
            setShowDetailModal(false);
          }}
        />
      )}


    </div>
  );
}

// Contact Detail Modal Component
function ContactDetailModal({ contact, onClose, onUpdate }) {
  const [loading, setLoading] = useState(false);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-xl">
          <h2 className="text-xl font-bold text-gray-800">Contact Details</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <MdClose className="text-xl" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Contact Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Contact Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Name</label>
                  <p className="text-gray-900">{contact.name}</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Email</label>
                  <p className="text-gray-900">{contact.email}</p>
                </div>
                {contact.phone && (
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Phone</label>
                    <p className="text-gray-900">{contact.phone}</p>
                  </div>
                )}
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Date Submitted</label>
                  <p className="text-gray-900">
                    {new Date(contact.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* Message Details */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Message Details</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Subject</label>
                  <p className="text-gray-900 font-medium">{contact.subject}</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Category</label>
                  <p className="text-gray-900 capitalize">{contact.category}</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Message</label>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-900 whitespace-pre-wrap">{contact.message}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Status & Priority */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Status & Priority</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Status</label>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    contact.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    contact.status === 'read' ? 'bg-blue-100 text-blue-800' :
                    contact.status === 'replied' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {contact.status}
                  </span>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Priority</label>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    contact.priority === 'low' ? 'bg-green-100 text-green-800' :
                    contact.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    contact.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {contact.priority}
                  </span>
                </div>
              </div>
            </div>

            {/* Admin Response */}
            {contact.adminResponse && (
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Admin Response</h3>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-gray-900 whitespace-pre-wrap">{contact.adminResponse}</p>
                  {contact.respondedAt && (
                    <p className="text-sm text-gray-600 mt-2">
                      Responded on {new Date(contact.respondedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex-shrink-0 bg-white border-t border-gray-200 px-6 py-4 rounded-b-xl">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

