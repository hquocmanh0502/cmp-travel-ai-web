import { useState, useEffect } from 'react';
import {
  MdAdd,
  MdEdit,
  MdDelete,
  MdSearch,
  MdFilterList,
  MdRefresh,
  MdMap,
  MdStar,
  MdAttachMoney,
  MdPeople,
  MdClose,
  MdVisibility,
  MdCheckCircle,
  MdCancel,
  MdTrendingUp
} from 'react-icons/md';
import { toast } from 'react-hot-toast';
import EnhancedTourFormModal from '../../components/EnhancedTourFormModal';

const API_BASE_URL = 'http://localhost:3000/api/admin';

export default function ToursManagement() {
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTours, setTotalTours] = useState(0);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [featuredFilter, setFeaturedFilter] = useState('all');
  const [sortByRevenue, setSortByRevenue] = useState(false);
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedTour, setSelectedTour] = useState(null);

  // Statistics
  const [stats, setStats] = useState({
    totalTours: 0,
    activeTours: 0,
    draftTours: 0,
    inactiveTours: 0,
    featuredTours: 0
  });

  useEffect(() => {
    fetchTours();
    fetchStats();
  }, [page, searchTerm, typeFilter, statusFilter, featuredFilter, sortByRevenue]);

  const fetchTours = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        search: searchTerm
      });

      if (typeFilter !== 'all') params.append('type', typeFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (featuredFilter !== 'all') params.append('featured', featuredFilter);
      if (sortByRevenue) params.append('sortBy', 'revenue');

      const apiUrl = `${API_BASE_URL}/tours?${params}`;
      const response = await fetch(apiUrl);
      const data = await response.json();
      
      if (data.success) {
        setTours(data.data);
        setTotalPages(data.pagination.pages);
        setTotalTours(data.pagination.total);
      }
    } catch (error) {
      console.error('Error fetching tours:', error);
      toast.error('Failed to load tours');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/tours/stats`);
      const data = await response.json();
      
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleDelete = async (tourId) => {
    if (!window.confirm('Are you sure you want to delete this tour?')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/tours/${tourId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Tour deleted successfully');
        fetchTours();
        fetchStats();
      } else {
        toast.error(data.error || 'Failed to delete tour');
      }
    } catch (error) {
      console.error('Error deleting tour:', error);
      toast.error('Failed to delete tour');
    }
  };

  const handleRefresh = () => {
    setPage(1);
    setSearchTerm('');
    setTypeFilter('all');
    setStatusFilter('all');
    setFeaturedFilter('all');
    setSortByRevenue(false);
    fetchTours();
    fetchStats();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  return (
    <div className="p-6 max-w-full">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Tours Management</h1>
          <p className="text-gray-600">Manage all tours and packages</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
        >
          <MdAdd className="text-xl" />
          Add New Tour
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Tours</p>
              <p className="text-2xl font-bold text-gray-800">{stats.totalTours}</p>
            </div>
            <MdMap className="text-3xl text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active</p>
              <p className="text-2xl font-bold text-green-600">{stats.activeTours}</p>
            </div>
            <MdCheckCircle className="text-3xl text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Draft</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.draftTours}</p>
            </div>
            <MdCancel className="text-3xl text-yellow-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Inactive</p>
              <p className="text-2xl font-bold text-red-600">{stats.inactiveTours}</p>
            </div>
            <MdCancel className="text-3xl text-red-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Featured</p>
              <p className="text-2xl font-bold text-purple-600">{stats.featuredTours}</p>
            </div>
            <MdStar className="text-3xl text-purple-500" />
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <div className="relative">
              <MdSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or country..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="domestic">Domestic</option>
              <option value="international">International</option>
            </select>
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
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Featured Filter */}
          <div>
            <select
              value={featuredFilter}
              onChange={(e) => {
                setFeaturedFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All</option>
              <option value="true">Featured Only</option>
              <option value="false">Not Featured</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => {
                const newSortState = !sortByRevenue;
                setSortByRevenue(newSortState);
                setPage(1);
              }}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                sortByRevenue 
                  ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
              title={sortByRevenue ? "Clear revenue sort" : "Sort by highest revenue"}
            >
              <MdTrendingUp className="text-lg" />
              <span className="text-sm font-medium">Revenue</span>
            </button>

            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              title="Refresh"
            >
              <MdRefresh className="text-xl" />
            </button>
          </div>
        </div>
      </div>

      {/* Revenue Sort Banner */}
      {sortByRevenue && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center gap-3">
          <MdTrendingUp className="text-green-600 text-xl" />
          <div>
            <p className="text-green-800 font-medium">Sorted by Revenue (Highest First)</p>
            <p className="text-green-600 text-sm">Tours are ordered by total revenue from completed bookings</p>
          </div>
          <button
            onClick={() => setSortByRevenue(false)}
            className="ml-auto text-green-600 hover:text-green-800"
          >
            <MdClose className="text-xl" />
          </button>
        </div>
      )}

      {/* Tours Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : tours.length === 0 ? (
          <div className="text-center py-12">
            <MdMap className="mx-auto text-6xl text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg">No tours found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Tour
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Pricing
                    </th>
                    <th className={`px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider ${
                      sortByRevenue 
                        ? 'text-green-700 bg-green-50' 
                        : 'text-gray-700'
                    }`}>
                      Stats {sortByRevenue && '(Sorted by Revenue)'}
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {tours.map((tour) => (
                    <tr key={tour._id} className="hover:bg-gray-50">
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={tour.img}
                            alt={tour.name}
                            className="w-16 h-16 rounded-lg object-cover"
                          />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{tour.name}</p>
                            <p className="text-xs text-gray-500">{tour.duration}</p>
                            {tour.featured && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 mt-1">
                                <MdStar className="text-xs" /> Featured
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="text-xs">
                          <p className="text-gray-900 font-medium">{tour.country}</p>
                          <p className="text-gray-500">{tour.type}</p>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="text-xs">
                          <p className="text-gray-900 font-medium">{formatCurrency(tour.pricing?.adult || tour.estimatedCost)}</p>
                          <p className="text-gray-500">per adult</p>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="text-xs text-gray-600">
                          <p className="flex items-center gap-1">
                            <MdPeople /> {tour.bookings || 0} bookings
                          </p>
                          <p className="flex items-center gap-1">
                            <MdTrendingUp /> {formatCurrency(tour.revenue || 0)}
                          </p>
                          <p className="flex items-center gap-1">
                            <MdStar className="text-yellow-500" /> {tour.rating || tour.analytics?.averageRating || 'N/A'}
                          </p>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          tour.status === 'active' 
                            ? 'bg-green-100 text-green-800'
                            : tour.status === 'draft'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {tour.status}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setSelectedTour(tour);
                              setShowEditModal(true);
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit Tour"
                          >
                            <MdEdit className="text-lg" />
                          </button>
                          <button
                            onClick={() => handleDelete(tour._id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Tour"
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
                Showing {(page - 1) * 10 + 1} to {Math.min(page * 10, totalTours)} of {totalTours} tours
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-sm text-gray-600">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || showEditModal) && (
        <EnhancedTourFormModal
          tour={selectedTour}
          isEdit={showEditModal}
          onClose={() => {
            setShowCreateModal(false);
            setShowEditModal(false);
            setSelectedTour(null);
          }}
          onSuccess={() => {
            fetchTours();
            fetchStats();
          }}
        />
      )}
    </div>
  );
}
